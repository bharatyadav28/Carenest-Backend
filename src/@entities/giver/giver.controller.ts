import { Request, Response } from "express";
import { count, desc, ilike, lte, or, sql,isNull } from "drizzle-orm";
import { and, eq, gte } from "drizzle-orm";
import { BookmarkModel } from "../bookmark/bookmark.model";
import { BadRequestError, NotFoundError } from "../../errors";
import {
  deleteUser,
  fetchProfileDetails,
  removeUserAvatar,
  updatePassword,
  updateProfileDetails,
  updateUserAvatar,
  updateZipCode,
} from "../user";
import { UserModel } from "../user/user.model";
import { JobProfileModel } from "../jobProfile/jobProfile.model";
import { db } from "../../db";
import { ServiceModel } from "../service/service.model";
import { MyServiceModel } from "../myService/myService.model";
import { add, orderBy, zip } from "lodash";
import { AboutModel } from "../about/about.model";
import { whyChooseMeModel } from "../whyChooseMe/whyChooseMe.model";
import { BookingCaregiver } from "../booking";

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

export const deleteGiversAcccount = async (req: Request, res: Response) => {
  const userId = req.user.id;

  await deleteUser(userId);

  return res.status(200).json({
    success: true,
    message: "Account deleted successfully",
  });
};

export const searchCaregivers = async (req: Request, res: Response) => {
  const {
    serviceId,
    gender,
    minPrice,
    maxPrice,
    experienceMin,
    experienceMax,
    certified,
    languages,
    locationRange,
    prn,
    zipcode,
  } = req.query;
  
  const userId = req.user?.id; // Get user ID if authenticated

  console.log("user",userId);

  // Filter conditions for searching caregivers
  const baseConditions = [
    eq(UserModel.role, "giver"),
    eq(UserModel.isDeleted, false),
  ];

  if (serviceId) {
    baseConditions.push(eq(ServiceModel.id, String(serviceId)));
  }

  if (gender) {
    baseConditions.push(eq(UserModel.gender, String(gender)));
  }

  if (locationRange) {
    baseConditions.push(eq(JobProfileModel.locationRange, String(locationRange)));
  }

  if (minPrice) {
    baseConditions.push(gte(JobProfileModel.minPrice, Number(minPrice)));
  }

  if (maxPrice)
    baseConditions.push(lte(JobProfileModel.maxPrice, Number(maxPrice)));

  // Handle experience filtering to include null values for 0-1 year range
  if (experienceMin !== undefined && experienceMax !== undefined) {
    const expMin = Number(experienceMin);
    const expMax = Number(experienceMax);
    
    // If filtering for 0-1 year experience, include users with null experience
    if (expMin === 0 && expMax === 1) {
      baseConditions.push(
        or(
          // Users with null experience (no profile saved)
          isNull(JobProfileModel.experienceMin),
          isNull(JobProfileModel.experienceMax),
          // Users with experience in the 0-1 range
          and(
            gte(JobProfileModel.experienceMin, expMin),
            lte(JobProfileModel.experienceMax, expMax)
          )
        )
      );
    } else {
      // For other experience ranges, use normal filtering
      if (experienceMin) {
        baseConditions.push(gte(JobProfileModel.experienceMin, expMin));
      }
      if (experienceMax) {
        baseConditions.push(lte(JobProfileModel.experienceMax, expMax));
      }
    }
  } else {
    // Handle individual experience filters if not both provided
    if (experienceMin) {
      const expMin = Number(experienceMin);
      // For min experience = 0, include null values
      if (expMin === 0) {
        baseConditions.push(
          or(
            isNull(JobProfileModel.experienceMin),
            gte(JobProfileModel.experienceMin, expMin)
          )
        );
      } else {
        baseConditions.push(gte(JobProfileModel.experienceMin, expMin));
      }
    }

    if (experienceMax) {
      const expMax = Number(experienceMax);
      // For max experience = 1, include null values
      if (expMax === 1) {
        baseConditions.push(
          or(
            isNull(JobProfileModel.experienceMax),
            lte(JobProfileModel.experienceMax, expMax)
          )
        );
      } else {
        baseConditions.push(lte(JobProfileModel.experienceMax, expMax));
      }
    }
  }

  if (certified)
    baseConditions.push(eq(JobProfileModel.certified, certified === "true"));

  if (prn)
    baseConditions.push(eq(JobProfileModel.isPrn, prn === "true"));

  if (zipcode) {
    baseConditions.push(eq(UserModel.zipcode, Number(zipcode)));
  }

  if (languages && typeof languages === "string") {
    const languagesArray = languages.split(",").map((lang) => lang.trim());
    baseConditions.push(
      sql`EXISTS (
      SELECT 1 FROM unnest(${JobProfileModel.languages}) as lang 
      WHERE lang IN (${sql.join(
        languagesArray.map((lang) => sql`${lang}`),
        sql`, `
      )})
    )`
    );
  }

  // First get the caregivers
  const caregivers = await db
    .select({
      id: UserModel.id,
      name: UserModel.name,
      avatar: UserModel.avatar,
      gender: UserModel.gender,
      verified: UserModel.hasActiveSubscription,
      price: JobProfileModel.minPrice,
      location: JobProfileModel.locationRange,
      prn: JobProfileModel.isPrn,
      experience: JobProfileModel.experienceMax,
      services: sql<string[]>`array_agg(${ServiceModel.name})`.as("services"),
    })
    .from(UserModel)
    .leftJoin(JobProfileModel as any, eq(UserModel.id, JobProfileModel.userId))
    .leftJoin(MyServiceModel as any, eq(UserModel.id, MyServiceModel.userId))
    .leftJoin(
      ServiceModel as any,
      eq(MyServiceModel.serviceId, ServiceModel.id)
    )
    .where(and(...baseConditions))
    .groupBy(
      UserModel.id,
      UserModel.name,
      UserModel.avatar,
      JobProfileModel.minPrice,
      JobProfileModel.locationRange,
      JobProfileModel.isPrn,
      JobProfileModel.experienceMax
    );

  // If user is authenticated, check bookmarks for each caregiver
  let caregiversWithBookmark = caregivers;
  
  if (userId) {
    // Get all bookmarks for this user
    const bookmarks = await db
      .select({
        giverId: BookmarkModel.giverId,
      })
      .from(BookmarkModel)
      .where(eq(BookmarkModel.userId, userId));

    const bookmarkedGiverIds = new Set(bookmarks.map(b => b.giverId));

    // Add isBookmarked field to each caregiver
    caregiversWithBookmark = caregivers.map(caregiver => ({
      ...caregiver,
      isBookmarked: bookmarkedGiverIds.has(caregiver.id)
    }));
  } else {
    // If user is not authenticated, set isBookmarked to false for all
    caregiversWithBookmark = caregivers.map(caregiver => ({
      ...caregiver,
      isBookmarked: false
    }));
  }

  return res.status(200).json({
    success: true,
    message: "Caregivers fetched successfully",
    data: {
      caregivers: caregiversWithBookmark,
    },
  });
};
export const caregiverDetails = async (req: Request, res: Response) => {
  const caregiverId = req.params.id;
  const userId = req.user?.id; // Get user ID if authenticated
 console.log("user",userId);
  // Get user basic details with job profile and about
  const userDetailsPromise = db
    .select({
      id: UserModel.id,
      avatar: UserModel.avatar,
      name: UserModel.name,
      email: UserModel.email,
      mobile: UserModel.mobile,
      verified: UserModel.hasActiveSubscription,
      address: UserModel.address,
      gender: UserModel.gender,
      experience: sql<number>`COALESCE(${JobProfileModel.experienceMax}, 0)`,
      price: sql<number>`COALESCE(${JobProfileModel.minPrice}, 0)`,
      about: sql<string>`COALESCE(${AboutModel.content}, '')`,
      location: JobProfileModel.locationRange,
      languages: JobProfileModel.languages,
    })
    .from(UserModel)
    .leftJoin(JobProfileModel as any, eq(UserModel.id, JobProfileModel.userId))
    .leftJoin(AboutModel as any, eq(UserModel.id, AboutModel.userId))
    .where(eq(UserModel.id, caregiverId))
    .limit(1);

  // Get services separately
  const servicesPromise = db
    .select({
      name: ServiceModel.name,
    })
    .from(MyServiceModel)
    .innerJoin(
      ServiceModel as any,
      eq(MyServiceModel.serviceId, ServiceModel.id)
    )
    .where(eq(MyServiceModel.userId, caregiverId));

  // Check if bookmarked (if user is authenticated)
  let isBookmarked = false;
  if (userId) {
    const bookmark = await db
      .select()
      .from(BookmarkModel)
      .where(
        and(
          eq(BookmarkModel.userId, userId),
          eq(BookmarkModel.giverId, caregiverId)
        )
      )
      .limit(1);
    isBookmarked = bookmark.length > 0;
  }

  const [userDetails, services] = await Promise.all([
    userDetailsPromise,
    servicesPromise,
  ]);

  if (!userDetails.length) {
    throw new BadRequestError("Caregiver not found");
  }

  const details = {
    ...userDetails[0],
    services: services.map((s) => s.name),
    isBookmarked: isBookmarked
  };

  return res.status(200).json({
    success: true,
    message: "Caregiver details fetched successfully",
    data: { details },
  });
};

export const getCaregivers = async (req: Request, res: Response) => {
  const { search } = req.query;

  const baseConditions = [
    eq(UserModel.role, "giver"),
    eq(UserModel.isDeleted, false),
  ];
  if (search && typeof search === "string") {
    baseConditions.push(
      sql`(${UserModel.name} ILIKE ${`%${search}%`} OR ${
        UserModel.email
      } ILIKE ${`%${search}%`})`
    );
  }

  const caregivers = await db
    .select({
      id: UserModel.id,
      name: UserModel.name,
      avatar: UserModel.avatar,
      email: UserModel.email,
       verified:UserModel.hasActiveSubscription,
      mobile: UserModel.mobile,
      address: UserModel.address,
      minExperience: JobProfileModel.experienceMin,
      maxExperience: JobProfileModel.experienceMax,
      minPrice: JobProfileModel.minPrice,
      maxPrice: JobProfileModel.maxPrice,
    })
    .from(UserModel)
    .leftJoin(JobProfileModel as any, eq(UserModel.id, JobProfileModel.userId))
    .where(and(...baseConditions))
    .orderBy(desc(UserModel.createdAt));

  return res.status(200).json({
    success: true,
    message: "Caregivers fetched successfully",
    data: { caregivers },
  });
};

export const updateGiverZipCode = async (req: Request, res: Response) => {
  const userId = req.user.id;
  const { zipcode } = req.body;

  if (!zipcode) {
    throw new BadRequestError("Please provide a valid zipcode");
  }

  await updateZipCode(userId, zipcode);

  return res.status(200).json({
    success: true,
    message: "Zipcode updated successfully",
  });
};

export const getGiverZipCode = async (req: Request, res: Response) => {
  const userId = req.user.id;

  const user = await db
    .select()
    .from(UserModel)
    .where(eq(UserModel.id, userId))
    .limit(1);

  if (!user || user.length === 0) {
    throw new BadRequestError("User not found");
  }

  const zipcode = user[0].zipcode;

  return res.status(200).json({
    success: true,
    message: "Zipcode fetched successfully",
    data: { zipcode },
  });
};

export const getAllGiversForAdmin = async (req: Request, res: Response) => {
  const { search, hasSubscription, page } = req.query;

  const pageSize = 10;
  const pageNumber = page ? parseInt(page as string, 10) : 1;
  const skip = (pageNumber - 1) * pageSize;

  const baseConditions = [
    eq(UserModel.isDeleted, false),
    eq(UserModel.role, "giver"),
  ];

  if (search && typeof search === "string") {
    const searchTerm = `%${search}%`;
    baseConditions.push(
      or(
        ilike(UserModel.name, searchTerm),
        ilike(UserModel.email, searchTerm),
        ilike(UserModel.mobile, searchTerm),
        sql`CAST(${UserModel.zipcode} AS TEXT) ILIKE ${searchTerm}`
      )
    );
  }

  // Add subscription filter if provided
  if (hasSubscription !== undefined) {
    const hasSub = hasSubscription === "true" ;
    baseConditions.push(eq(UserModel.hasActiveSubscription, hasSub));
  }

  let usersPromise = db
    .select({
      id: UserModel.id,
      name: UserModel.name,
      email: UserModel.email,
      hasSubscription: UserModel.hasActiveSubscription, 
      city: UserModel.city,
      mobile: UserModel.mobile,
      gender: UserModel.gender,
      zipcode: UserModel.zipcode,
      totalBookingsAllocated: sql<number>`COUNT(
        CASE
          WHEN ${BookingCaregiver.status} = 'hired' THEN 1
        END
      )::integer`.as("totalBookingsAllocated"),
    })
    .from(UserModel)
    .where(and(...baseConditions))
    .leftJoin(BookingCaregiver, eq(BookingCaregiver.caregiverId, UserModel.id))
    .groupBy(
      UserModel.id,
      UserModel.name,
      UserModel.hasActiveSubscription, // Added to groupBy
      UserModel.email,
      UserModel.city,
      UserModel.mobile,
      UserModel.gender,
      UserModel.zipcode
    )
    .orderBy(desc(UserModel.createdAt))
    .limit(pageSize)
    .offset(skip);

  let totalUsersPromise = db
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
      totalPages,
      currentPage: pageNumber,
      totalUsers: totalCount,
    },
  });
};
export const getProfessionalProfileforAdmin = async (
  req: Request,
  res: Response
) => {
  const { id: userId } = req.params;

  const userDetails = await db
    .select({
      id: UserModel.id,
      name: UserModel.name,
      email: UserModel.email,
       verified:UserModel.hasActiveSubscription,
       city: UserModel.city,
      mobile: UserModel.mobile,
      address: UserModel.address,
      zipcode: UserModel.zipcode,
      gender: UserModel.gender,
      avatar: UserModel.avatar,
      caregivingType: JobProfileModel.caregivingType,
      minPrice: JobProfileModel.minPrice,
      maxPrice: JobProfileModel.maxPrice,
      locationRange: JobProfileModel.locationRange,
      experienceMin: JobProfileModel.experienceMin,
      experienceMax: JobProfileModel.experienceMax,
      languages: JobProfileModel.languages,
      services: sql<string[]>`array_agg(
      ${ServiceModel.name}
      )`.as("services"),
    })
    .from(UserModel)
    .where(eq(UserModel.id, userId))
    .leftJoin(JobProfileModel as any, eq(UserModel.id, JobProfileModel.userId))
    .leftJoin(MyServiceModel, eq(UserModel.id, MyServiceModel.userId))
    .leftJoin(ServiceModel, eq(MyServiceModel.serviceId, ServiceModel.id))
    .groupBy(
      UserModel.id,
      UserModel.name,
      UserModel.email,
      UserModel.mobile,
      UserModel.hasActiveSubscription,
      UserModel.address,
      UserModel.zipcode,
      UserModel.city,
      UserModel.gender,
      UserModel.avatar,
      JobProfileModel.caregivingType,
      JobProfileModel.minPrice,
      JobProfileModel.maxPrice,
      JobProfileModel.locationRange,
      JobProfileModel.experienceMin,
      JobProfileModel.experienceMax,
      JobProfileModel.languages
    )
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
