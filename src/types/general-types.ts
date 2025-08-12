import { bookingCaregiverStatusEnum, bookingStatusEnum } from "../db/schema";

export interface payloadType {
  user: {
    id: string;
  };
}

export type bookingStatusType = (typeof bookingStatusEnum.enumValues)[number];

export type giverBookingStatusType =
  (typeof bookingCaregiverStatusEnum.enumValues)[number];
