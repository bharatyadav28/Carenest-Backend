import { and, eq, gt, gte } from "drizzle-orm";

import { db } from "../../db";
import { BadRequestError } from "../../errors";
import { OtpModel } from "./otp.model";
import { CreateOtpType, VerifyOTPType } from "../../types/otp-types";

export const generateAndSendOtp = async ({
  userId,
  name,
  email,
  type,
}: CreateOtpType) => {
  await db
    .delete(OtpModel)
    .where(
      and(
        eq(OtpModel.userId, userId),
        eq(OtpModel.type, type),
        gte(OtpModel.expiresAt, new Date())
      )
    );

  // Generate 4-digit OTP
  const code = Math.floor(1000 + Math.random() * 9000).toString();

  // Set expiry to 10 minutes from now
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  const values = {
    userId,
    type,
    code,
    expiresAt,
  };
  const result = await db.insert(OtpModel).values(values).returning();
  if (result.length === 0) {
    throw new BadRequestError("Otp creation failed");
  }

  console.log("OTP: ", result);

  //   send email
};

export const verifyOtp = async ({ code, userId, type }: VerifyOTPType) => {
  const otpRecord = await db.query.OtpModel.findFirst({
    columns: {
      id: true,
    },
    where: and(
      eq(OtpModel.code, code),
      eq(OtpModel.userId, userId),
      eq(OtpModel.type, type),
      gt(OtpModel.expiresAt, new Date())
    ),
  });
  if (!otpRecord) {
    throw new BadRequestError("Invalid or Expired OTP");
  }

  await db.delete(OtpModel).where(eq(OtpModel.id, otpRecord.id));
};
