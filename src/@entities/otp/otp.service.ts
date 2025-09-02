import { and, eq, gt, gte } from "drizzle-orm";

import { db } from "../../db";
import { BadRequestError } from "../../errors";
import { OtpModel } from "./otp.model";
import { CreateOtpType, VerifyOTPType } from "../../types/otp-types";
import sendEmail from "../../helpers/sendEmail";

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

  const message = `
    <div style="font-family: 'Arial', sans-serif; text-align: center; background-color: #f4f4f4; margin-top: 15px; padding: 0;
    padding-bottom:10px;  ">

      <div style="max-width: 600px; margin: 30px auto; background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);">
        <h1 style="color: #333333;">Hey ${name}! </h1>
        <p style="color: #666666;">Your verification code is:</p>
        <p style="font-size: 24px; font-weight: bold; color: #009688; margin: 0;">${code}</p>
          <p style="color: #666666;">
         This otp will expire in 10 minutes.
         </p>
        <p style="color: #666666;">
          If you did not request an otp , please ignore this email.
        </p>
      </div>

      <div style="color: #888888">
        <p style="margin-bottom: 10px;">Regards, <span style="color:#b19cd9;">Team Careworks</span></p>
      </div>
    
    </div>`;

  //   send email
  await sendEmail({
    to: email,
    subject:
      type === "account_verification"
        ? "Account Verification"
        : type === "two_step_auth"
        ? "Two Step Authentication"
        : "Password Reset",
    html: message,
  });
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
