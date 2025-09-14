import {
  pgTable,
  varchar,
  integer,
  timestamp,
  boolean,
  pgEnum,
  text,
  date,
  check,
  time,
} from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";

import { min_timestamps } from "../../helpers/columns";
import { ServiceModel } from "../service/service.model";
import { UserModel, roleEnum } from "../user/user.model";
import { sql } from "drizzle-orm";

export const bookingStatusValues = [
  "pending",
  "accepted",
  "completed",
  "cancelled",
] as const;
export const bookingStatusEnum = pgEnum("booking_status", bookingStatusValues);

// Table1: Main booking model
export const BookingModel = pgTable("booking", {
  id: varchar("id", { length: 21 })
    .primaryKey()
    .notNull()
    .$defaultFn(() => nanoid(21)),

  userId: varchar("user_id", { length: 21 })
    .notNull()
    .references(() => UserModel.id),

  startDate: date("start_date").notNull(),

  endDate: date("end_date"),

  careseekerZipcode: integer("zipcode").notNull(),

  requiredBy: varchar("required_by", { length: 255 }).notNull(),

  status: bookingStatusEnum("status").default("pending"),

  completedAt: timestamp("completed_at"),

  cancelledAt: timestamp("cancelled_at"),

  cancellationReason: text("cancellation_reason"),

  cancelledBy: varchar("cancelled_by", { length: 21 }).references(
    () => UserModel.id
  ),

  cancelledByType: roleEnum("cancelledByType"),

  ...min_timestamps,
});

// Table2: Booking to Services mapping table
export const BookingServices = pgTable("booking_services", {
  id: varchar("id", { length: 21 })
    .primaryKey()
    .notNull()
    .$defaultFn(() => nanoid(21)),

  bookingId: varchar("booking_id", { length: 21 })
    .notNull()
    .references(() => BookingModel.id),

  serviceId: varchar("service_id", { length: 21 })
    .notNull()
    .references(() => ServiceModel.id),
});

// Table3: Weekly schedule for each booking table
export const BookingWeeklySchedule = pgTable(
  "booking_weekly_schedule",
  {
    id: varchar("id", { length: 21 })
      .primaryKey()
      .notNull()
      .$defaultFn(() => nanoid(21)),

    bookingId: varchar("booking_id", { length: 21 })
      .notNull()
      .references(() => BookingModel.id),

    weekDay: integer("week_day").notNull(),

    startTime: time("start_time").notNull(),

    endTime: time("end_time").notNull(),

    ...min_timestamps,
  },
  (table) => [
    check(
      "week_day_check",
      sql` ${table.weekDay} >= 0 AND ${table.weekDay} <=6 `
    ),
  ]
);

export const bookingCaregiverStatusValues = [
  "shortlisted",
  "rejected",
  "hired",
  "completed",
  "cancelled",
] as const;
export const bookingCaregiverStatusEnum = pgEnum(
  "booking_giver_status",
  bookingCaregiverStatusValues
);

// Table4: Booking Caregiver mapping table
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

  status: bookingCaregiverStatusEnum("status").default("shortlisted"),

  cancelledAt: timestamp("cancelled_at"),

  cancellationReason: text("cancellation_reason"),

  ...min_timestamps,
});
