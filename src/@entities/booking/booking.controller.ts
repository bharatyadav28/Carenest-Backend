import { Request, Response } from "express";
import { BadRequestError } from "../../errors";
import { db } from "../../db";
import { BookingCaregiver, BookingModel } from "./booking.model";
import { and, eq, ne } from "drizzle-orm";
import { cancelBooking } from "./booking.service";

export const bookingRequest = async (req: Request, res: Response) => {
  const { appointmentDate, serviceId, durationInDays, selectedCaregivers } =
    req.body;

  if (!appointmentDate || !serviceId || !durationInDays) {
    throw new BadRequestError(
      "Please provide appointment date, service ID, and duration in days."
    );
  }

  if (!selectedCaregivers || selectedCaregivers.length < 2) {
    throw new BadRequestError(
      "Please select at least 3 caregivers  for the booking."
    );
  }

  const now = new Date();
  const appointmentDateTime = new Date(appointmentDate);

  // Compare only dates, not time
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const appointmentDateOnly = new Date(
    appointmentDateTime.getFullYear(),
    appointmentDateTime.getMonth(),
    appointmentDateTime.getDate()
  );

  if (appointmentDateOnly < today) {
    throw new BadRequestError("Please select a future date");
  }

  const booking = await db
    .insert(BookingModel)
    .values({
      appointmentDate,
      serviceId,
      durationInDays,
    })
    .returning();
  if (!booking || booking.length === 0) {
    throw new Error("Failed to create booking.");
  }

  const bookingId = booking[0].id;
  const selectedGiversRecords = selectedCaregivers.map(
    (caregiverId: string) => ({
      caregiverId,
      bookingId,
    })
  );

  const result = await db
    .insert(BookingCaregiver)
    .values(selectedGiversRecords)
    .returning();

  ("result");
  if (!result || result.length < 2) {
    throw new Error("Failed to assign caregivers to booking.");
  }

  return res.status(201).json({
    success: true,
    message: "Booking created successfully with assigned caregivers.",
  });
};

export const assignCaregiver = async (req: Request, res: Response) => {
  const { id: bookingId } = req.params;
  const { caregiverId } = req.body;

  if (!caregiverId) {
    throw new BadRequestError("Caregiver ID is required.");
  }

  await db.transaction(async (tx) => {
    // Update booking status to active
    const booking = await tx
      .update(BookingModel)
      .set({ status: "active" })
      .where(eq(BookingModel.id, bookingId))
      .returning();

    if (!booking || booking.length === 0) {
      throw new Error("Booking not found or failed to update.");
    }

    // Check if caregiver was already selected by user
    const userSelectedCaregiver = await tx.query.BookingCaregiver.findFirst({
      where: and(
        eq(BookingCaregiver.caregiverId, caregiverId),
        eq(BookingCaregiver.bookingId, bookingId)
      ),
    });

    let assignedCaregiver = null;

    // First, set all other caregivers' isFinalSelection to false (common operation)
    const setOtherCaregiversToFalse = tx
      .update(BookingCaregiver)
      .set({ isFinalSelection: false, updatedAt: new Date() })
      .where(
        and(
          eq(BookingCaregiver.bookingId, bookingId),
          ne(BookingCaregiver.caregiverId, caregiverId)
        )
      );

    // Run the main operation and the common operation in parallel
    if (userSelectedCaregiver) {
      // Update existing caregiver selection as final
      const [selectedCaregiverResult] = await Promise.all([
        tx
          .update(BookingCaregiver)
          .set({ isFinalSelection: true, updatedAt: new Date() })
          .where(
            and(
              eq(BookingCaregiver.caregiverId, caregiverId),
              eq(BookingCaregiver.bookingId, bookingId)
            )
          )
          .returning(),
        setOtherCaregiversToFalse,
      ]);
      assignedCaregiver = selectedCaregiverResult;
    } else {
      // Insert new caregiver assignment
      const [insertResult] = await Promise.all([
        tx
          .insert(BookingCaregiver)
          .values({
            caregiverId,
            bookingId,
            isFinalSelection: true,
            isUsersChoice: false,
          })
          .returning(),
        setOtherCaregiversToFalse,
      ]);
      assignedCaregiver = insertResult;
    }

    if (
      !assignedCaregiver ||
      (Array.isArray(assignedCaregiver) && assignedCaregiver?.length === 0)
    ) {
      throw new Error("Failed to assign caregiver to booking.");
    }

    return { booking, assignedCaregiver };
  });

  return res.status(200).json({
    success: true,
    message: "Caregiver assigned successfully.",
  });
};

export const completeBooking = async (req: Request, res: Response) => {
  const { id: bookingId } = req.params;

  const updatedBooking = await db
    .update(BookingModel)
    .set({
      status: "completed",
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(BookingModel.id, bookingId))
    .returning();

  if (!updatedBooking || updatedBooking.length === 0) {
    throw new Error("Failed to complete booking.");
  }

  return res.status(200).json({
    success: true,
    message: "Booking completed successfully.",
  });
};

export const cancelUserBooking = async (req: Request, res: Response) => {
  const { id: bookingId } = req.params;
  const { cancellationReason } = req.body;

  const isGiversBooking = await db.query.BookingCaregiver.findFirst({
    where: and(
      eq(BookingCaregiver.bookingId, bookingId),
      eq(BookingCaregiver.caregiverId, req.user.id),
      eq(BookingCaregiver.isFinalSelection, true)
    ),
    columns: {
      id: true,
    },
  });

  if (!isGiversBooking) {
    throw new BadRequestError("You are not authorized to cancel this booking.");
  }

  await cancelBooking({
    bookingId,
    cancellationReason,
    userId: req.user.id,
    userRole: req.user.role,
  });

  return res.status(200).json({
    success: true,
    message: "Booking cancelled successfully.",
  });
};
