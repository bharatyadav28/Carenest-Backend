import { eq, and } from "drizzle-orm";
import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";

import { db } from "../../db";
import { UserModel } from "./user.model";
import { UpdateUserType, RoleType } from "../../types/user-types";
import {
  generateRandomString,
  getTokenPayload,
  getURLPath,
} from "../../helpers/utils";
import {
  BadRequestError,
  NotFoundError,
  UnauthenticatedError,
} from "../../errors";
import {
  generateAccessToken,
  generateRefreshToken,
  generateTempToken,
  verifyJWTToken,
} from "../../helpers/jwt";
import { comparePassword, hashPassword } from "../../helpers/passwordEncrpt";
import { s3Uploadv4 } from "../../helpers/s3";
import sendEmail from "../../helpers/sendEmail";
import { getAdminCreatedAccountHTML } from "../../helpers/emailText";
import { createNotification } from "../notification/notification.service";

export const findUserByEmail = async (email: string, role?: RoleType) => {
  const userRole = role || "user";
  const existingUser = await db.query.UserModel.findFirst({
    where: and(
      eq(UserModel.email, email),
      eq(UserModel.isDeleted, false),
      eq(UserModel.role, userRole)
    ),
    columns: { id: true, isEmailVerified: true, name: true },
  });
  return existingUser;
};

export const createUser = async (userData: any) => {
  const user = await db.insert(UserModel).values(userData).returning();
  if (!user || user?.length === 0) {
    throw Error("Signup failed");
  }
  return user?.[0];
};

export const getUserTokens = (userId: string) => {
  const payload = getTokenPayload(userId);
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);
  return { accessToken, refreshToken };
};

export const getTemporaryToken = (userId: string) => {
  const payload = getTokenPayload(userId);
  const token = generateTempToken(payload);
  return token;
};

export const deleteUser = async (userId: string) => {
  await db
    .update(UserModel)
    .set({ isDeleted: true, deletedAt: new Date() })
    .where(eq(UserModel.id, userId));
};

export const deleteUserPermanently = async (userId: string) => {
  await db.delete(UserModel).where(eq(UserModel.id, userId));
};

export const filterUserRole = (role?: RoleType) => {
  return role ? (role !== "admin" ? role : "user") : "user";
};

export const getAuthUser = async (
  authHeader?: string,
  role?: RoleType,
  tokenType?: string
) => {
  const accessToken = authHeader && authHeader.split(" ")?.[1];
  if (!accessToken) {
    throw new UnauthenticatedError("Access token missing");
  }

  const payload = verifyJWTToken(accessToken, tokenType);

  if (payload && typeof payload === "object" && "user" in payload) {
    const userId = payload.user.id;

    const baseConditions = [
      eq(UserModel.id, userId),
      eq(UserModel.isDeleted, false),
    ];

    if (role) {
      baseConditions.push(eq(UserModel.role, role));
    }
    const existingUser = await db.query.UserModel.findFirst({
      where: and(...baseConditions),
      columns: {
        id: true,
        role: true,
      },
    });

    if (!existingUser) {
      throw new UnauthenticatedError("Invalid access token");
    }

    return existingUser;
  } else {
    throw new UnauthenticatedError("Invalid access token");
  }
};

interface updatePasswordParam {
  currentPassword: string;
  newPassword: string;
  userId: string;
}
export const updatePassword = async ({
  currentPassword,
  newPassword,
  userId,
}: updatePasswordParam) => {
  const existingUser = await db.query.UserModel.findFirst({
    where: and(eq(UserModel.id, userId), eq(UserModel.isDeleted, false)),
    columns: {
      id: true,
      password: true,
    },
  });
  if (!existingUser) {
    throw new NotFoundError("No such user exists");
  }

  let isPasswordMatched = false;

  if (existingUser.password) {
    isPasswordMatched = await comparePassword(
      currentPassword,
      existingUser.password
    );
  }
  if (!isPasswordMatched) {
    throw new BadRequestError("Current password is incorrect");
  }

  const hashedPassword = await hashPassword(newPassword);
  const updatedUser = await db
    .update(UserModel)
    .set({ password: hashedPassword, updatedAt: new Date() })
    .where(eq(UserModel.id, existingUser.id))
    .returning();
  if (!updatedUser) {
    throw new BadRequestError("Password updation failed");
  }
};

export const fetchProfileDetails = async (userId: string) => {
  const user = await db.query.UserModel.findFirst({
    where: eq(UserModel.id, userId),
    columns: {
      id: true,
      name: true,
      email: true,
      address: true,
       city: true, // New field
      mobile: true,
      avatar: true,
      gender: true,
      zipcode: true,
    },
  });

  if (!user) {
    throw new NotFoundError("No user with this is exists");
  }

  return user;
};

export const updateProfileDetails = async (
  userId: string,
  updatedData: UpdateUserType
) => {
  const updatedUser = await db
    .update(UserModel)
    .set(updatedData)
    .where(eq(UserModel.id, userId))
    .returning();

  if (updatedUser.length === 0) {
    throw new Error("Profile updation failed");
  }
};

export const updateUserAvatar = async (
  userId: string,
  file: Express.Multer.File
) => {
  if (!file || !(file?.mimetype.split("/")[0] === "image")) {
    throw new BadRequestError("Please upload an image");
  }

  const result = await s3Uploadv4(file, "profile");

  const updatedUser = await db
    .update(UserModel)
    .set({ avatar: result ? getURLPath(result.Key) : null })
    .where(eq(UserModel.id, userId))
    .returning();

  if (updatedUser.length === 0) {
    throw new Error("Profile image updation failed");
  }
};

export const removeUserAvatar = async (userId: string) => {
  const updatedUser = await db
    .update(UserModel)
    .set({ avatar: null })
    .where(eq(UserModel.id, userId))
    .returning();

  if (updatedUser.length === 0) {
    throw new Error("Profile image removed successfully");
  }
};

export const updateZipCode = async (userId: string, zipcode: number) => {
  const updatedUser = await db
    .update(UserModel)
    .set({ zipcode: zipcode })
    .where(eq(UserModel.id, userId))
    .returning();

  if (updatedUser.length === 0) {
    throw new Error("Zipcode updation failed");
  }
};

export const updateRequiredByService = async (
  userId: string,
  requiredBy: string
) => {
  if (!requiredBy) {
    throw new BadRequestError("Please provide requiredBy value");
  }

  await db
    .update(UserModel)
    .set({ requiredBy, updatedAt: new Date() })
    .where(eq(UserModel.id, userId));
};

export const doesAccountExistsWithEmail = async (
  email: string,
  type: RoleType
) => {
  const existingUser = await db
    .select()
    .from(UserModel)
    .where(
      and(
        eq(UserModel.email, email),
        eq(UserModel.role, type),
        eq(UserModel.isDeleted, false)
      )
    )
    .limit(1);

  if (existingUser && existingUser.length > 0) {
    if (existingUser[0].isEmailVerified) {
      throw new BadRequestError("User with this email already exists");
    } else {
      await db.delete(UserModel).where(eq(UserModel.id, existingUser[0].id));
    }
  }
};

interface BulkUserData {
  name: string;
  email: string;
  mobile?: string;
  address?: string;
  city?: string;
  zipcode?: number;
  gender?: string;
  role: "user" | "giver";
}

export const parseBulkUsersFromExcel = (filePath: string): BulkUserData[] => {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json<any>(worksheet);

    const validatedUsers: BulkUserData[] = data
      .map((row, index) => {
        // Validate required fields
        if (!row.name || !row.email || !row.role) {
          console.warn(`Row ${index + 2}: Missing required fields (name, email, or role)`);
          return null;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(row.email)) {
          console.warn(`Row ${index + 2}: Invalid email format - ${row.email}`);
          return null;
        }

        // Validate role
        if (!["user", "giver"].includes(row.role.toLowerCase())) {
          console.warn(`Row ${index + 2}: Invalid role - ${row.role}`);
          return null;
        }

        return {
          name: String(row.name).trim(),
          email: String(row.email).trim().toLowerCase(),
          mobile: row.mobile ? String(row.mobile).trim() : undefined,
          address: row.address ? String(row.address).trim() : undefined,
          city: row.city ? String(row.city).trim() : undefined,
          zipcode: row.zipcode ? Number(row.zipcode) : undefined,
          gender: row.gender ? String(row.gender).trim() : undefined,
          role: row.role.toLowerCase() as "user" | "giver",
        };
      })
      .filter((user): user is NonNullable<typeof user> => user !== null) as BulkUserData[];

    return validatedUsers;
  } catch (error) {
    console.error("Error parsing Excel file:", error);
    throw new BadRequestError("Failed to parse Excel file. Please check the file format.");
  }
};

export const bulkCreateUsers = async ({
  filePath,
  fileName,
}: {
  filePath: string;
  fileName: string;
}) => {
  try {
    console.log(`Starting bulk user creation from file: ${fileName}`);

    // Parse Excel file
    const users = parseBulkUsersFromExcel(filePath);

    if (users.length === 0) {
      throw new BadRequestError("No valid users found in the Excel file");
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ email: string; error: string }>,
    };

    // Process users in batches to avoid overwhelming the database
    const batchSize = 20;
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, Math.min(i + batchSize, users.length));

      for (const userData of batch) {
        try {
          // Check if user already exists
          const existingUser = await db.query.UserModel.findFirst({
            where: and(
              eq(UserModel.email, userData.email),
              eq(UserModel.role, userData.role),
              eq(UserModel.isDeleted, false)
            ),
            columns: { id: true },
          });

          if (existingUser) {
            results.failed++;
            results.errors.push({
              email: userData.email,
              error: "User with this email already exists",
            });
            continue;
          }

          // Generate random password for bulk created users
          const password = generateRandomString(8);
          const hashedPassword = await hashPassword(password);

          // Create new user
          const newUser = await db
            .insert(UserModel)
            .values({
              name: userData.name,
              email: userData.email,
              mobile: userData.mobile,
              address: userData.address,
              city: userData.city,
              zipcode: userData.zipcode,
              gender: userData.gender,
              role: userData.role,
              isEmailVerified: true, // Auto-verify for bulk admin creation
              password: hashedPassword,
            })
            .returning();

          if (newUser && newUser.length > 0) {
            const createdUser = newUser[0];
            results.success++;

            // Send welcome email with credentials
            try {
              const userRole = createdUser.role === "admin" ? "user" : createdUser.role;
              const emailHTML = getAdminCreatedAccountHTML(
                createdUser.name,
                createdUser.email,
                password,
                userRole
              );

              sendEmail({
                to: createdUser.email,
                subject: "Welcome to CareWorks - Your Account Credentials",
                html: emailHTML,
              }).catch((err) => {
                console.error(`❌ Failed to send email to ${createdUser.email}:`, err.message);
              });

              console.log(`📧 Email queued for: ${createdUser.email}`);
            } catch (emailError) {
              console.error(`❌ Failed to send email to ${createdUser.email}:`, emailError);
              // Don't fail the user creation if email fails
            }

            // Create welcome notification
            try {
              await createNotification(
                createdUser.id,
                "Account Created Successfully",
                `Welcome to CareWorks! Your account has been created. You can now login with your credentials.`,
                "user"
              );
            } catch (notificationError) {
              console.error(
                `Failed to create notification for user ${createdUser.id}:`,
                notificationError
              );
              // Don't fail the user creation if notification fails
            }
          } else {
            results.failed++;
            results.errors.push({
              email: userData.email,
              error: "Failed to create user",
            });
          }
        } catch (error: any) {
          results.failed++;
          results.errors.push({
            email: userData.email,
            error: error.message || "Unknown error occurred",
          });
        }
      }
    }

    // Clean up file
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.error("Error deleting temporary file:", err);
    }

    console.log(`Bulk user creation completed. Success: ${results.success}, Failed: ${results.failed}`);
    return results;
  } catch (error: any) {
    console.error("Error in bulkCreateUsers:", error);

    // Clean up file in case of error
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.error("Error deleting temporary file:", err);
    }

    throw error;
  }
};
