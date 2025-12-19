import { and, eq, ne, lte, isNotNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../../db";
import { BookingCaregiver, BookingModel } from "./booking.model";
import { RoleType } from "../../types/user-types";
import { UserModel } from "../user/user.model";

import sendEmail from "../../helpers/sendEmail";
import { 
  getServiceBookingStartReminderHTML,
  getCareSeekerServiceReminderHTML 
} from "../../helpers/emailText";
import { formatDate, careseekerURL, caregiverURL } from "../../helpers/utils";
import { createNotification } from "../notification/notification.service";

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
  try {
    const booking = await db
      .select({
        bookingId: BookingModel.id,
        giverId: BookingCaregiver.caregiverId,
        giverName: Caregiver.name,
        giverEmail: Caregiver.email,
        userName: User.name,
        userEmail: User.email,
        startDate: BookingModel.startDate,
        careseekerZipcode: BookingModel.careseekerZipcode,
        status: BookingModel.status,
      })
      .from(BookingModel)
      .where(
        and(
          eq(BookingModel.id, bookingId),
          eq(BookingModel.status, "accepted")
        )
      )
      .innerJoin(
        BookingCaregiver,
        and(
          eq(BookingCaregiver.bookingId, BookingModel.id),
          eq(BookingCaregiver.status, "hired")
        )
      )
      .innerJoin(Caregiver, eq(BookingCaregiver.caregiverId, Caregiver.id))
      .innerJoin(User, eq(BookingModel.userId, User.id))
      .limit(1);

    if (!booking || booking.length === 0) {
      console.log(`No active booking found for bookingId: ${bookingId}`);
      return; // Gracefully exit if no booking
    }

    const bookingData = booking[0];

    // Skip if booking is already completed or cancelled
    if (bookingData.status !== "accepted") {
      console.log(`Booking ${bookingId} is not in accepted status: ${bookingData.status}`);
      return;
    }

    const startDateTime = formatDate(bookingData.startDate);
    const address = bookingData.careseekerZipcode 
      ? `Area code: ${bookingData.careseekerZipcode}` 
      : "Address will be provided";

    // Send emails in parallel
    const emailPromises = [];

    // Caregiver email
    if (bookingData.giverEmail) {
      emailPromises.push(
        sendEmail({
          to: bookingData.giverEmail,
          subject: "Your Caregiving Job Starts Soon! - CareWorks",
          html: getServiceBookingStartReminderHTML(
            bookingData.giverName,
            bookingData.userName,
            startDateTime,
            address,
            `${caregiverURL}/jobs`
          ),
        }).catch(error => {
          console.error(`Failed to send reminder to caregiver ${bookingData.giverEmail}:`, error);
        })
      );
    }

    // Care seeker email
    if (bookingData.userEmail) {
      emailPromises.push(
        sendEmail({
          to: bookingData.userEmail,
          subject: "Your Caregiving Service Starts Soon! - CareWorks",
          html: getCareSeekerServiceReminderHTML(
            bookingData.userName,
            bookingData.giverName,
            startDateTime,
            address,
            `${careseekerURL}/bookings`
          ),
        }).catch(error => {
          console.error(`Failed to send reminder to care seeker ${bookingData.userEmail}:`, error);
        })
      );
    }

    
    await Promise.all(emailPromises);

    console.log(`Reminder emails sent for booking ${bookingId}`);
    
  } catch (error) {
    console.error(`Error sending reminder emails for booking ${bookingId}:`, error);
  }
};

// AUTO-COMPLETION FEATURE 
export const autoCompleteExpiredBookings = async () => {
  const today = new Date().toISOString().split('T')[0];
  
  try {
    console.log(`[Auto-Complete] Starting for date: ${today}`);
    
    // Find bookings to auto-complete
    const expiredBookings = await db
      .select({
        id: BookingModel.id,
        userId: BookingModel.userId,
      })
      .from(BookingModel)
      .where(
        and(
          eq(BookingModel.status, 'accepted'),
          lte(BookingModel.endDate, today),
          ne(BookingModel.status, 'completed'),
          ne(BookingModel.status, 'cancelled'),
          isNotNull(BookingModel.endDate)
        )
      );

    console.log(`[Auto-Complete] Found ${expiredBookings.length} bookings`);

    for (const booking of expiredBookings) {
      try {
        // Get assigned caregiver
        const assignedCaregiver = await db
          .select({
            caregiverId: BookingCaregiver.caregiverId,
            id: BookingCaregiver.id,
          })
          .from(BookingCaregiver)
          .where(
            and(
              eq(BookingCaregiver.bookingId, booking.id),
              eq(BookingCaregiver.status, 'hired')
            )
          )
          .limit(1);

        if (assignedCaregiver.length === 0) {
          console.log(`[Auto-Complete] No hired caregiver for booking ${booking.id}`);
          continue;
        }

        const now = new Date();

        // Update booking and caregiver status
        await db.transaction(async (tx) => {
          await tx
            .update(BookingModel)
            .set({
              status: 'completed',
              completedAt: now,
              updatedAt: now,
            })
            .where(eq(BookingModel.id, booking.id));

          await tx
            .update(BookingCaregiver)
            .set({
              status: 'completed',
              updatedAt: now,
            })
            .where(eq(BookingCaregiver.id, assignedCaregiver[0].id));
        });

        // Send in-app notifications
        await createNotification(
          booking.userId,
          'Booking Completed',
          `Your booking #${booking.id} has been automatically completed.`,
          'booking'
        ).catch(err => console.error(`Notification error for user ${booking.id}:`, err));
        
        await createNotification(
          assignedCaregiver[0].caregiverId,
          'Booking Completed',
          `Your assigned booking #${booking.id} has been automatically completed.`,
          'booking'
        ).catch(err => console.error(`Notification error for caregiver ${booking.id}:`, err));

        console.log(`[Auto-Complete] Completed booking ${booking.id}`);
        
      } catch (error) {
        console.error(`[Auto-Complete] Failed booking ${booking.id}:`, error);
      }
    }

    console.log(`[Auto-Complete] Job completed`);
    
  } catch (error) {
    console.error('[Auto-Complete] Job failed:', error);
  }
};