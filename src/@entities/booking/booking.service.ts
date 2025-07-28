import { and, eq } from "drizzle-orm";

import { db } from "../../db";
import { BookingCaregiver, BookingModel } from "./booking.model";
import { RoleType } from "../../types/user-types";

interface cancelBookingParams {
  bookingId: string;
  cancellationReason: string;
  userId: string;
  userRole: RoleType;
}

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
      status: "cancel",
      cancelledAt: now,
      cancellationReason,
      updatedAt: now,
      cancelledBy: userId,
      cancelledByType: userRole,
    })
    .where(eq(BookingModel.id, bookingId))
    .returning();

  if (!updatedBooking || updatedBooking.length === 0) {
    throw new Error("Failed to cancel booking.");
  }

  await db
    .update(BookingCaregiver)
    .set({
      cancelledAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(BookingCaregiver.bookingId, bookingId),
        eq(BookingCaregiver.isFinalSelection, true)
      )
    )
    .returning();
};
