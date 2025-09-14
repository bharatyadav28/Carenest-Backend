import { z } from "zod";

import {
  bookingStatusValues,
  bookingCaregiverStatusValues,
} from "./booking.model";

export const createBookingSchema = z.object({
  startDate: z.string({ message: "required" }).trim(),
  endDate: z.string().optional(),
  serviceIds: z.array(z.string().trim().max(21)).min(1),
  careseekerZipcode: z.number().int(),
  requiredBy: z.string().trim().max(255),
  weeklySchedule: z.array(
    z.object({
      weekDay: z.number().int().min(0).max(6),
      startTime: z
        .string()
        .trim()
        .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
      endTime: z
        .string()
        .trim()
        .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
    })
  ),
  shortlistedCaregiversIds: z.array(z.string().trim().max(21)).min(3),
});

export const updateBookingByGiverSchema = z.object({
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
  careseekerZipcode: z.number().int(),
  requiredBy: z.string().trim().max(255).optional(),
  weeklySchedule: z
    .array(
      z.object({
        weekDay: z.number().int().min(0).max(6),
        startTime: z
          .string()
          .trim()
          .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
        endTime: z
          .string()
          .trim()
          .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
      })
    )
    .optional(),
  shortlistedCaregiversIds: z
    .array(z.string().trim().max(21))
    .min(3)
    .optional(),
});

export const updateBookingSchema = z.object({
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
  status: z.enum(bookingStatusValues).optional(),
  cancellationReason: z.string().trim().optional(),
  cancelledBy: z.string().trim().max(21).optional(),
  cancelledByType: z.enum(["user", "giver", "admin"]).optional(),
  careseekerZipcode: z.number().int(),
  requiredBy: z.string().trim().max(255).optional(),
});

export const updateBookingCaregiverSchema = z.object({
  status: z.enum(bookingCaregiverStatusValues).optional(),
  cancellationReason: z.string().trim().optional(),
});
