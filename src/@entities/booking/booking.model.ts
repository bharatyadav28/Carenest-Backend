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
import {} from "drizzle-orm/pg-core";
import {} from "drizzle-orm/pg-core";

import { min_timestamps } from "../../helpers/columns";
import { ServiceModel } from "../service";
import { UserModel, roleEnum } from "../user/user.model";

export const bookingStatusEnum = pgEnum("booking_status", [
  "pending",
  "active",
  "completed",
  "cancel",
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

  isFinalSelection: boolean("is_final_selection"),

  cancelledAt: timestamp("cancelled_at"),

  cancellationReason: text("cancellation_reason"),

  ...min_timestamps,
});
