import { Request, Response } from "express";
import { lte, sql } from "drizzle-orm";
import { and, eq, gte } from "drizzle-orm";

import { BadRequestError } from "../../errors";
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
import { add } from "lodash";
import { AboutModel } from "../about/about.model";
import { whyChooseMeModel } from "../whyChooseMe/whyChooseMe.model";

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
    zipcode,
  } = req.query;

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

  if (minPrice) {
    baseConditions.push(gte(JobProfileModel.minPrice, Number(minPrice)));
  }

  if (maxPrice)
    baseConditions.push(lte(JobProfileModel.maxPrice, Number(maxPrice)));

  if (experienceMin)
    baseConditions.push(
      gte(JobProfileModel.experienceMin, Number(experienceMin))
    );

  if (experienceMax)
    baseConditions.push(
      lte(JobProfileModel.experienceMax, Number(experienceMax))
    );

  if (certified)
    baseConditions.push(eq(JobProfileModel.certified, certified === "true"));

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

  const caregivers = await db
    .select({
      id: UserModel.id,
      name: UserModel.name,
      avatar: UserModel.avatar,
      price: JobProfileModel.minPrice,
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
      JobProfileModel.experienceMax
    );

  return res.status(200).json({
    success: true,
    message: "Caregivers fetched successfully",
    data: {
      caregivers,
    },
  });
};

export const caregiverDetails = async (req: Request, res: Response) => {
  const caregiverId = req.params.id;

  // Get user basic details with job profile and about
  const userDetailsPromise = db
    .select({
      id: UserModel.id,
      avatar: UserModel.avatar,
      name: UserModel.name,
      email: UserModel.email,
      mobile: UserModel.mobile,
      address: UserModel.address,
      gender: UserModel.gender,
      experience: sql<number>`COALESCE(${JobProfileModel.experienceMax}, 0)`,
      price: sql<number>`COALESCE(${JobProfileModel.minPrice}, 0)`,
      about: sql<string>`COALESCE(${AboutModel.content}, '')`,
      location: UserModel.address,
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
      mobile: UserModel.mobile,
      address: UserModel.address,
      minExperience: JobProfileModel.experienceMin,
      maxExperience: JobProfileModel.experienceMax,
      minPrice: JobProfileModel.minPrice,
      maxPrice: JobProfileModel.maxPrice,
    })
    .from(UserModel)
    .leftJoin(JobProfileModel as any, eq(UserModel.id, JobProfileModel.userId))
    .where(and(...baseConditions));

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
