import { typeEnum } from "../db/schema";

export interface CreateOtpType {
  userId: string;
  name?: string;
  email: string;
  type: (typeof typeEnum.enumValues)[number];
}

export interface VerifyOTPType {
  code: string;
  userId: string;
  type: (typeof typeEnum.enumValues)[number];
}
