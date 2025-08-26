import {
  pgTable,
  varchar,
  integer,
  timestamp,
  boolean,
  pgEnum,
  text,
  date,
} from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { z } from "zod";

import { min_timestamps } from "../../helpers/columns";
import { ServiceModel } from "../service/service.model";
import { UserModel, roleEnum } from "../user/user.model";

export const bookingStatusEnum = pgEnum("booking_status", [
  "requested",
  "active",
  "completed",
  "cancelled",
]);

export const BookingModel = pgTable("booking", {
  id: varchar("id", { length: 21 })
    .primaryKey()
    .notNull()
    .$defaultFn(() => nanoid(21)),

  userId: varchar("user_id", { length: 21 })
    .notNull()
    .references(() => UserModel.id),

  appointmentDate: date("appointment_date").notNull(),

  serviceId: varchar("service_id", { length: 21 })
    .notNull()
    .references(() => ServiceModel.id),

  durationInDays: integer("duration_in_days").notNull(),

  status: bookingStatusEnum("status").default("requested"),

  completedAt: timestamp("completed_at"),

  cancelledAt: timestamp("cancelled_at"),

  cancellationReason: text("cancellation_reason"),

  cancelledBy: varchar("cancelled_by", { length: 21 }).references(
    () => UserModel.id
  ),

  cancelledByType: roleEnum("cancelledByType"),

  ...min_timestamps,
});

export const bookingCaregiverStatusEnum = pgEnum("booking_giver_status", [
  "interested",
  "rejected",
  "active",
  "completed",
  "cancelled",
]);

export const BookingCaregiver = pgTable("booking_caregiver", {
  id: varchar("id", { length: 21 })
    .primaryKey()
    .notNull()
    .$defaultFn(() => nanoid(21)),

  bookingId: varchar("booking_id", { length: 21 })
    .notNull()
    .references(() => BookingModel.id),

  caregiverId: varchar("caregiver_id", { length: 21 })
    .notNull()
    .references(() => UserModel.id),

  isUsersChoice: boolean("is_users_choice").default(true),

  // isFinalSelection: boolean("is_final_selection"),
  status: bookingCaregiverStatusEnum("status").default("interested"),

  cancelledAt: timestamp("cancelled_at"),

  cancellationReason: text("cancellation_reason"),

  ...min_timestamps,
});

// Manual Zod schemas
export const createBookingSchema = z.object({
  userId: z.string().trim().max(21),
  appointmentDate: z.string().trim(), // Will be converted to date
  serviceId: z.string().trim().max(21),
  durationInDays: z.number().int().positive(),
});

export const updateBookingSchema = z.object({
  appointmentDate: z.string().trim().optional(),
  durationInDays: z.number().int().positive().optional(),
  status: z.enum(["requested", "active", "completed", "cancelled"]).optional(),
  cancellationReason: z.string().trim().optional(),
  cancelledBy: z.string().trim().max(21).optional(),
  cancelledByType: z.enum(["user", "giver", "admin"]).optional(),
});

export const createBookingCaregiverSchema = z.object({
  bookingId: z.string().trim().max(21),
  caregiverId: z.string().trim().max(21),
  isUsersChoice: z.boolean().default(true),
});

export const updateBookingCaregiverSchema = z.object({
  status: z
    .enum(["interested", "rejected", "active", "completed", "cancelled"])
    .optional(),
  cancellationReason: z.string().trim().optional(),
});
