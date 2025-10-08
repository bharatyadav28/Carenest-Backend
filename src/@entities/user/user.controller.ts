import { query, Request, Response } from "express";
import { eq, and, desc, or, sql, ilike, count } from "drizzle-orm";

import { UserModel } from "./user.model";
import { db } from "../../db";
import { comparePassword, hashPassword } from "../../helpers/passwordEncrpt";
import { BadRequestError, NotFoundError } from "../../errors";
import { generateAndSendOtp, verifyOtp } from "../otp/otp.service";
import {
  createUser,
  findUserByEmail,
  getUserTokens,
  deleteUser,
  filterUserRole,
  getTemporaryToken,
  getAuthUser,
  updatePassword,
  fetchProfileDetails,
  updateProfileDetails,
  updateUserAvatar,
  removeUserAvatar,
  doesAccountExistsWithEmail,
  updateRequiredByService,
} from "./user.service";
import sendEmail from "../../helpers/sendEmail";
import {
  getAdminCreatedAccountHTML,
  getSignupHTML,
} from "../../helpers/emailText";
import { BookingModel } from "../booking/booking.model";
import { generateRandomString } from "../../helpers/utils";

export const signup = async (req: Request, res: Response) => {
  const incomingData = req.cleanBody;
  const { email, password, role } = incomingData;
  if (!password) {
    throw new BadRequestError("Please enter password");
  }

  const userRole = filterUserRole(role);

  const hashedPassword = await hashPassword(password);
  const usersData = {
    ...incomingData,
    password: hashedPassword,
    role: userRole,
  };

  const existingUser = await findUserByEmail(email, userRole);
  const isVerified = existingUser?.isEmailVerified;

  if (!existingUser || !isVerified) {
    const deleteUserPromise =
      existingUser && !isVerified
        ? deleteUser(existingUser.id)
        : Promise.resolve();

    const newUserPromise = createUser(usersData);

    const [_, user] = await Promise.all([deleteUserPromise, newUserPromise]);

    if (user) {
      await generateAndSendOtp({
        userId: user.id,
        name: user.name || "user",
        email,
        type: "account_verification",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Otp sent to registered email",
      data: {
        userId: user.id,
      },
    });
  }

  throw new BadRequestError("User with this email already exists");
};

export const resendOTPSignup = async (req: Request, res: Response) => {
  const { userId } = req.body;
  if (!userId) {
    throw new BadRequestError("Please provide userId");
  }

  const user = await db.query.UserModel.findFirst({
    where: and(eq(UserModel.id, userId), eq(UserModel.isEmailVerified, false)),
    columns: { id: true, name: true, email: true },
  });
  if (!user) {
    throw new NotFoundError(
      "No user with this id exists or email is already verified"
    );
  }

  await generateAndSendOtp({
    userId: user.id,
    name: user.name || "user",
    email: user.email,
    type: "account_verification",
  });

  return res.status(200).json({
    success: true,
    message: "Otp sent to registered email",
    data: {
      userId: user.id,
    },
  });
};

export const signin = async (req: Request, res: Response) => {
  const { email, password: candidatePassword, role } = req.body;

  const userRole = role || "user";

  const existingUser = await db.query.UserModel.findFirst({
    where: and(
      eq(UserModel.email, email),
      eq(UserModel.isDeleted, false),
      eq(UserModel.role, userRole),
      eq(UserModel.isEmailVerified, true)
    ),
    columns: {
      id: true,
      password: true,
      name: true,
    },
  });
  if (!existingUser) {
    throw new NotFoundError("Email is incorrect");
  }

  let isPasswordMatched = false;

  if (existingUser.password) {
    isPasswordMatched = await comparePassword(
      candidatePassword,
      existingUser.password
    );
  }
  if (!isPasswordMatched) {
    throw new BadRequestError("Password is incorrect");
  }

  const { accessToken, refreshToken } = getUserTokens(existingUser.id);

  return res.status(200).json({
    success: true,
    message: "Signin successfully",
    data: {
      accessToken,
      refreshToken,
    },
  });
};

export const verifyEmail = async (req: Request, res: Response) => {
  const { code, userId, type } = req.body;
  if (!code || !type) {
    throw new BadRequestError("Please enter both code and type");
  }

  const user = await db.query.UserModel.findFirst({
    where: eq(UserModel.id, userId),
    columns: { id: true, role: true, email: true, name: true },
  });
  if (!user) {
    throw new NotFoundError("No data with this user id exists.");
  }

  await verifyOtp({ code, userId: user.id, type });

  if (type === "account_verification") {
    const verified = await db
      .update(UserModel)
      .set({ isEmailVerified: true, updatedAt: new Date() })
      .where(eq(UserModel.id, user.id))
      .returning();
    if (!verified) {
      throw new Error("Email verification failed");
    }

    if (user.role === "giver") {
      await sendEmail({
        to: user.email,
        subject: " Welcome to CareWorks – Let’s Get Started!",
        html: getSignupHTML(user?.name || "user"),
      });
    }
  }

  let responseData = {};
  if (type === "account_verification" || type === "two_step_auth") {
    const { accessToken, refreshToken } = getUserTokens(user.id);
    responseData = { accessToken, refreshToken };
  } else if (type === "password_reset") {
    const token = getTemporaryToken(user.id);
    responseData = { token };
  }

  return res.status(200).json({
    success: true,
    message: "OTP verified successfully",
    data: {
      ...responseData,
    },
  });
};

export const googleAuth = async (req: Request, res: Response) => {
  const { googleToken, role } = req.body;
  const response = await fetch(
    "https://www.googleapis.com/oauth2/v3/userinfo",
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${googleToken}`,
      },
    }
  );
  if (!response.ok) {
    throw new BadRequestError(`Google login verification failed`);
  }

  const userRole = filterUserRole(role);
  const data = await response.json();
  const { name, email, email_verified } = data;
  const usersData = {
    name,
    email,
    isEmailVerified: true,
    role: userRole,
  };

  if (!email || !email_verified) {
    throw new BadRequestError("Email is inaccessible or not verified");
  }

  let existingUser = await findUserByEmail(email, userRole);
  const isVerified = existingUser?.isEmailVerified;

  if (!existingUser || !isVerified) {
    const deleteUserPromise =
      existingUser && !isVerified
        ? deleteUser(existingUser.id)
        : Promise.resolve();

    const newUserPromise = createUser(usersData);

    const [_, user] = await Promise.all([deleteUserPromise, newUserPromise]);
    if (user) {
      existingUser = user;
    }
  }

  let responseData = {};
  if (existingUser) {
    const { accessToken, refreshToken } = await getUserTokens(existingUser?.id);
    responseData = { accessToken, refreshToken };
  }

  return res.status(200).json({
    success: true,
    message: "Signin successfully",
    data: {
      ...responseData,
    },
  });
};

export const forgotPassword = async (req: Request, res: Response) => {
  const { email, role } = req.body;
  if (!email) {
    throw new BadRequestError("Please enter your email address");
  }

  const userRole = filterUserRole(role);

  const existingUser = await db.query.UserModel.findFirst({
    where: and(
      eq(UserModel.email, email),
      eq(UserModel.isDeleted, false),
      eq(UserModel.role, userRole),
      eq(UserModel.isEmailVerified, true)
    ),
    columns: { id: true, name: true },
  });

  if (!existingUser) {
    throw new BadRequestError("No user with this email address exists");
  }

  await generateAndSendOtp({
    userId: existingUser.id,
    name: existingUser.name || "user",
    email,
    type: "password_reset",
  });

  return res.status(200).json({
    success: true,
    message: "Otp sent to registered email address",
    data: {
      userId: existingUser.id,
    },
  });
};

export const resetPassword = async (req: Request, res: Response) => {
  const { password, role } = req.body;
  const authHeader = req.headers["authorization"];
  const existingUser = await getAuthUser(authHeader, role, "temporary");
  const hashedPassword = await hashPassword(password);

  const updatedUser = await db
    .update(UserModel)
    .set({ password: hashedPassword, updatedAt: new Date() })
    .where(eq(UserModel.id, existingUser.id))
    .returning();
  if (!updatedUser) {
    throw new BadRequestError("Password updation failed");
  }

  return res.status(200).json({
    success: true,
    message: "Password updated successfully",
  });
};

export const changePassword = async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  if (!currentPassword || !newPassword) {
    throw new BadRequestError("Please provide both current and new password");
  }

  await updatePassword({
    currentPassword,
    newPassword,
    userId,
  });

  return res.status(200).json({
    success: true,
    message: "Password updated successfully",
  });
};

export const getProfile = async (req: Request, res: Response) => {
  const userId = req.user.id;
  const user = await fetchProfileDetails(userId);
  return res.status(200).json({
    success: true,
    message: "Profile details fetched successfully",
    data: {
      user,
    },
  });
};

export const updateProfile = async (req: Request, res: Response) => {
  const updatedData = req.cleanBody;
  const userId = req.user.id;

  await updateProfileDetails(userId, updatedData);

  return res.status(200).json({
    success: true,
    message: "Profile details updated successfully",
  });
};

export const updateAvatar = async (req: Request, res: Response) => {
  const userId = req.user.id;
  const file = req.file;

  if (!file) {
    throw new BadRequestError("Please upload a file");
  }
  await updateUserAvatar(userId, file);

  return res.status(200).json({
    success: true,
    message: "Profile image updated successfully",
  });
};

export const removeAvatar = async (req: Request, res: Response) => {
  const userId = req.user.id;

  await removeUserAvatar(userId);

  return res.status(200).json({
    success: true,
    message: "Profile image removed successfully",
  });
};

export const updateRequiredBy = async (req: Request, res: Response) => {
  const { requiredBy } = req.body;
  const userId = req.user.id;

  await updateRequiredByService(userId, requiredBy);

  return res.status(200).json({
    success: true,
    message: "RequiredBy updated successfully",
  });
};

export const getRequiredBy = async (req: Request, res: Response) => {
  const userId = req.user.id;
  const user = await db
    .select({ requiredBy: UserModel.requiredBy })
    .from(UserModel)
    .where(eq(UserModel.id, userId))
    .limit(1);

  if (!user || user.length === 0) {
    throw new NotFoundError("No user with this id exists");
  }

  return res.status(200).json({
    success: true,
    message: "RequiredBy fetched successfully",
    data: {
      requiredBy: user[0].requiredBy,
    },
  });
};

export const deleteUsersAcccount = async (req: Request, res: Response) => {
  const userId = req.user.id;

  await deleteUser(userId);

  return res.status(200).json({
    success: true,
    message: "Account deleted successfully",
  });
};

export const getAllUsersForAdmin = async (req: Request, res: Response) => {
  const { search, hasDoneBooking, page } = req.query;

  const pageSize = 10;
  const pageNumber = page ? parseInt(page as string, 10) : 1;
  const skip = (pageNumber - 1) * pageSize;

  const baseConditions = [
    eq(UserModel.isDeleted, false),
    eq(UserModel.role, "user"),
  ];
  if (search && typeof search === "string") {
    const searchTerm = `%${search}%`;
    baseConditions.push(
      or(
        ilike(UserModel.name, searchTerm),
        ilike(UserModel.email, searchTerm),
        ilike(UserModel.mobile, searchTerm)
      )
    );
  }

  if (hasDoneBooking !== undefined) {
    const hasBooking = hasDoneBooking === "true";
    if (hasBooking) {
      baseConditions.push(
        sql`EXISTS (SELECT 1 FROM booking WHERE ${BookingModel.userId} = ${UserModel.id} )`
      );
    } else {
      baseConditions.push(
        sql`NOT EXISTS (SELECT 1 FROM booking WHERE ${BookingModel.userId} = ${UserModel.id} )`
      );
    }
  }

  const usersPromise = db
    .select({
      id: UserModel.id,
      name: UserModel.name,
      email: UserModel.email,
      mobile: UserModel.mobile,
      gender: UserModel.gender,
      zipcode: UserModel.zipcode,
      bookings: count(BookingModel.id),
    })
    .from(UserModel)
    .leftJoin(BookingModel, eq(UserModel.id, BookingModel.userId))
    .where(and(...baseConditions))
    .groupBy(UserModel.id)
    .orderBy(desc(UserModel.createdAt))
    .limit(pageSize)
    .offset(skip);

  const totalUsersPromise = db
    .select({
      count: sql<number>`COUNT(*)`.as("count"),
    })
    .from(UserModel)
    .where(and(...baseConditions));

  const [users, totalUsers] = await Promise.all([
    usersPromise,
    totalUsersPromise,
  ]);

  const totalCount = totalUsers.length > 0 ? Number(totalUsers[0].count) : 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  return res.status(200).json({
    success: true,
    message: "Users fetched successfully",
    data: {
      users,
      pagesCount: totalPages,
    },
  });
};

export const getUserProfileforAdmin = async (req: Request, res: Response) => {
  const { id: userId } = req.params;

  const userDetails = await db
    .select({
      id: UserModel.id,
      name: UserModel.name,
      email: UserModel.email,
      mobile: UserModel.mobile,
      address: UserModel.address,
      zipcode: UserModel.zipcode,
      gender: UserModel.gender,
      avatar: UserModel.avatar,
    })
    .from(UserModel)
    .where(eq(UserModel.id, userId))
    .limit(1);

  if (!userDetails) {
    throw new NotFoundError("User not found");
  }

  return res.status(200).json({
    success: true,
    message: "User details fetched successfully",
    data: {
      user: userDetails,
    },
  });
};

export const createUserByAdmin = async (req: Request, res: Response) => {
  const { role, ...incomingData } = req.cleanBody;

  await doesAccountExistsWithEmail(incomingData.email, role);

  const password = generateRandomString(8);
  const hashedPassword = await hashPassword(password);

  const usersData = {
    ...incomingData,
    password: hashedPassword,
    role,
    isEmailVerified: true,
  };

  const user = await createUser(usersData);

  const emailHTML = getAdminCreatedAccountHTML(
    user?.name,
    user.email,
    password,
    role
  );

  await sendEmail({
    to: user.email,
    subject: "Welcome to CareWorks - Your Account Credentials",
    html: emailHTML,
  });

  return res.status(201).json({
    success: true,
    message: "New careseeker created successfully",
  });
};

export const updateUserByAdmin = async (req: Request, res: Response) => {
  const { id: userId } = req.params;
  const incomingData = req.cleanBody;

  const currentUser = await db
    .select()
    .from(UserModel)
    .where(eq(UserModel.id, userId))
    .limit(1);
  if (!currentUser || currentUser.length == 0) {
    throw new NotFoundError("No user found with this id");
  }

  const isEmailUpdated =
    incomingData?.email && incomingData?.email !== currentUser[0].email;

  if (isEmailUpdated) {
    await doesAccountExistsWithEmail(incomingData.email, currentUser[0].role);
  }

  await updateProfileDetails(userId, incomingData);

  return res.status(200).json({
    success: true,
    message: "User details updated successfully",
  });
};

export const deleteUserByAdmin = async (req: Request, res: Response) => {
  const userId = req.params.id;

  await deleteUser(userId);

  return res.status(200).json({
    success: true,
    message: "Account deleted successfully",
  });
};
