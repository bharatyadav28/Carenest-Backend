import { and, eq, ne } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../../db";
import { BookingCaregiver, BookingModel } from "./booking.model";
import { RoleType } from "../../types/user-types";
import { UserModel } from "../user/user.model";

import sendEmail from "../../helpers/sendEmail";
import { getServiceBookingStartReminderHTML } from "../../helpers/emailText";
import { formatDate } from "../../helpers/utils";

interface cancelBookingParams {
  bookingId: string;
  cancellationReason: string;
  userId: string;
  userRole: RoleType;
}

const Caregiver = alias(UserModel, "Caregiver");
const User = alias(UserModel, "User");

export const cancelBooking = async ({
  bookingId,
  cancellationReason,
  userId,
  userRole,
}: cancelBookingParams) => {
  const now = new Date();

  const updatedBooking = await db
    .update(BookingModel)
    .set({
      status: "cancelled",
      cancelledAt: now,
      cancellationReason,
      updatedAt: now,
      cancelledBy: userId,
      cancelledByType: userRole,
    })
    .where(
      and(eq(BookingModel.id, bookingId), ne(BookingModel.status, "cancelled"))
    )
    .returning();

  if (!updatedBooking || updatedBooking.length === 0) {
    throw new Error("Failed to cancel booking or booking already cancelled.");
  }

  await Promise.all([
    db
      .update(BookingCaregiver)
      .set({
        status: "cancelled",
        updatedAt: now,
      })
      .where(
        and(
          eq(BookingCaregiver.bookingId, bookingId),
          eq(BookingCaregiver.status, "hired")
        )
      ),

    db
      .update(BookingCaregiver)
      .set({
        status: "rejected",
        updatedAt: now,
      })
      .where(
        and(
          eq(BookingCaregiver.bookingId, bookingId),
          ne(BookingCaregiver.status, "hired")
        )
      ),
  ]);
};

export const sendServiceReminderEmail = async ({ bookingId }) => {
  const booking = await db
    .select({
      giverId: BookingCaregiver.caregiverId,
      giverName: Caregiver.name,
      giverEmail: Caregiver.email,
      userName: User.name,
      // appointmentDate: BookingModel.appointmentDate,
    })
    .from(BookingModel)
    .where(and(eq(BookingModel.id, bookingId)))
    .innerJoin(
      BookingCaregiver,
      and(
        eq(BookingCaregiver.bookingId, BookingModel.id)
        // eq(BookingCaregiver.status, "active")
      )
    )
    .innerJoin(Caregiver, eq(BookingCaregiver.caregiverId, Caregiver.id))
    .innerJoin(User, eq(BookingModel.userId, User.id));

  if (!booking || booking.length === 0) {
    throw new Error("No active caregiver found for this booking.");
  }

  // const { appointmentDate, giverName, userName } = booking[0];

  // const startDateTime = formatDate(appointmentDate);

  await sendEmail({
    to: booking[0].giverEmail,
    subject: "Service Reminder",
    html: getServiceBookingStartReminderHTML(),
    // giverName,
    // userName,
    // startDateTime
  });
};
