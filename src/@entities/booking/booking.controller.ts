import { Request, Response } from "express";

import { BadRequestError, NotFoundError } from "../../errors";
import { db } from "../../db";
import {
  BookingCaregiver,
  BookingModel,
  BookingServices,
  BookingWeeklySchedule,
} from "./booking.model";
import {
  and,
  eq,
  isNotNull,
  ne,
  sql,
  isNull,
  lte,
  gte,
  desc,
  is,
  or,
} from "drizzle-orm";
import { cancelBooking } from "./booking.service";
import { ServiceModel } from "../service/service.model";
import { UserModel } from "../user/user.model";
import { JobProfileModel } from "../jobProfile/jobProfile.model";
import {
  bookingStatusType,
  giverBookingStatusType,
} from "../../types/general-types";
import sendEmail from "../../helpers/sendEmail";
import {
  getCaregiverFeedbackHTML,
  getCareSeekerFeedbackHTML,
  getJobAssignmentHTML,
  getJobCompletionHTML,
  getBookingRequestConfirmationHTML,
  getCaregiverAssignedHTML,
} from "../../helpers/emailText";
import { caregiverDetails } from "../giver/giver.controller";
import { scheduleStartJob } from "../../helpers/redis-client";
import { zip } from "lodash";
import { updateRequiredByService } from "../user";
import { createNotification } from "../notification/notification.service";
export const bookingRequest = async (req: Request, res: Response) => {
  const {
    shortlistedCaregiversIds,
    weeklySchedule,
    serviceIds,
    ...bookingData
  } = req.cleanBody;

  const userId = req.user.id;

  const now = new Date();
  const startDate = bookingData.startDate;
  const startDateTime = new Date(startDate);
  const meetingDate = bookingData.meetingDate;
  const meetingDateTime = new Date(meetingDate);

  // Compare only dates, not time
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startDateOnly = new Date(
    startDateTime.getFullYear(),
    startDateTime.getMonth(),
    startDateTime.getDate()
  );

  const meetingDateOnly = new Date(
    meetingDateTime.getFullYear(),
    meetingDateTime.getMonth(),
    meetingDateTime.getDate()
  );

  if (meetingDateOnly < today) {
    throw new BadRequestError("Please select a future meeting date");
  }

  if (startDateOnly < today) {
    throw new BadRequestError("Please select a future date");
  }

  try {
    await db.transaction(async (tx) => {
      const booking = await tx
        .insert(BookingModel)
        .values({
          userId,
          ...bookingData,
        })
        .returning();
      if (!booking || booking.length === 0) {
        throw new Error("Failed to create booking.");
      }

      const bookingId = booking[0].id;

      const bookingServicesRecords = serviceIds.map((serviceId: string) => ({
        bookingId,
        serviceId,
      }));

      const weeklyScheduleRecords = weeklySchedule.map((daySchedule: any) => ({
        ...daySchedule,
        bookingId,
      }));
      const shortlistedCaregiversRecords = shortlistedCaregiversIds.map(
        (caregiverId: string) => ({
          caregiverId,
          bookingId,
        })
      );

      const savedBookingServicesPromise = tx
        .insert(BookingServices)
        .values(bookingServicesRecords)
        .returning();
      const savedWeeklySchedulePromise = tx
        .insert(BookingWeeklySchedule)
        .values(weeklyScheduleRecords)
        .returning();
      const shortlistedCaregiversPromise = tx
        .insert(BookingCaregiver)
        .values(shortlistedCaregiversRecords)
        .returning();

      const [savedBookingServices, savedWeeklySchedule, shortlistedCaregivers] =
        await Promise.all([
          savedBookingServicesPromise,
          savedWeeklySchedulePromise,
          shortlistedCaregiversPromise,
        ]);

      // Validate all operations succeeded
      if (
        !savedBookingServices.length ||
        !savedWeeklySchedule.length ||
        !shortlistedCaregivers.length
      ) {
        throw new Error("Failed to create booking dependencies.");
      }
    });
  } catch (error) {
    throw new BadRequestError("Failed to create booking. Please try again.");
  }

  await updateRequiredByService(userId, bookingData.requiredBy || "myself");

  const user = await db.query.UserModel.findFirst({
    where: eq(UserModel.id, userId),
    columns: { email: true, name: true },
  });

  if (user?.email) {
    await sendEmail({
      to: user.email,
      subject: "Booking Request Received - CareWorks",
      html: getBookingRequestConfirmationHTML(user.name || "Care Seeker", {
        startDate: bookingData.startDate,
        meetingDate: bookingData.meetingDate,
      }),
    });
  }
  if (userId) {
    // Send booking notification
    await createNotification(
      userId,
      "Booking Created Successfully",
      `Your booking request has been submitted. Our team will contact you soon.`,
      "booking"
    );
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

  const result = await db.transaction(async (tx) => {
    // Update booking status to active
    const booking = await tx
      .update(BookingModel)
      .set({
        status: "accepted",
        cancelledAt: null,
        cancellationReason: null,
        cancelledBy: null,
        cancelledByType: null,
        updatedAt: new Date(),
      })
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

    // First, set all other caregivers' status to rejected
    const setOtherCaregiversToFalse = tx
      .update(BookingCaregiver)
      .set({ status: "rejected", updatedAt: new Date() })
      .where(
        and(
          eq(BookingCaregiver.bookingId, bookingId),
          ne(BookingCaregiver.caregiverId, caregiverId)
        )
      );

    // Run the main operation and the common operation in parallel
    if (userSelectedCaregiver) {
      // Update existing caregiver status to "active"
      const [selectedCaregiverResult] = await Promise.all([
        tx
          .update(BookingCaregiver)
          .set({
            status: "hired",
            updatedAt: new Date(),
            cancelledAt: null,
            cancellationReason: null,
          })
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
            status: "hired",
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

  const updatedbooking = result?.booking[0];
  const updatedCaregiver = result?.assignedCaregiver[0];

  if (updatedbooking && updatedCaregiver) {
    const userId = updatedbooking?.userId;
    const assignedCaregiverId = updatedCaregiver?.caregiverId;
    const caregiverDetailsPromise = db.query.UserModel.findFirst({
      where: eq(UserModel.id, assignedCaregiverId),
      columns: {
        name: true,
        email: true,
      },
    });
    const userDetailsPromise = await db.query.UserModel.findFirst({
      where: eq(UserModel.id, userId),
      columns: {
        name: true,
        email: true,
      },
    });

    const [caregiverDetails, userDetails] = await Promise.all([
      caregiverDetailsPromise,
      userDetailsPromise,
    ]);

    const jobDetails = {
      startDate: updatedbooking?.startDate || "",
      meetingDate: updatedbooking?.meetingDate || "",
      location: updatedbooking?.careseekerZipcode.toString() || "",
      careSeekerName: userDetails?.name || "User",
    };

    if (caregiverDetails?.email) {
      await sendEmail({
        to: caregiverDetails.email,
        subject: "You’ve Been Assigned a New Caregiving Job!",
        html: getJobAssignmentHTML(
          caregiverDetails?.name || "Caregiver",
          jobDetails
        ),
      });

      await scheduleStartJob({
        id: updatedbooking.id,
        startDate: updatedbooking.startDate,
      });
    }

    if (userDetails?.email) {
      await sendEmail({
        to: userDetails.email,
        subject: "Caregiver Assigned to Your Request - CareWorks",
        html: getCaregiverAssignedHTML(
          userDetails.name || "Care Seeker",
          caregiverDetails?.name || "Caregiver",
          {
            startDate: updatedbooking?.startDate || "",
            meetingDate: updatedbooking?.meetingDate || "",
          }
        ),
      });
    }
  }

  return res.status(200).json({
    success: true,
    message: "Caregiver assigned successfully.",
    result,
  });
};

export const completeBooking = async (req: Request, res: Response) => {
  const { id: bookingId } = req.params;

  const existingBookingPromise = db
    .select({
      status: BookingModel.status,
      startDate: BookingModel.startDate,
      meetingDate: BookingModel.meetingDate,
      endDate: BookingModel.endDate,
      careseekerName: UserModel.name,
      careseekerEmail: UserModel.email,
    })
    .from(BookingModel)
    .innerJoin(UserModel as any, eq(BookingModel.userId, UserModel.id))
    .where(eq(BookingModel.id, bookingId))
    .limit(1) as Promise<
    Array<{
      status: string;
      startDate: string;
      meetingDate: string;
      endDate: string;
      careseekerName: string;
      careseekerEmail: string;
    }>
  >;

  const assignedCaregiverPromise = db
    .select({
      caregiverId: BookingCaregiver.caregiverId,
      status: BookingCaregiver.status,
      id: BookingCaregiver.id,
      caregiverName: UserModel.name,
      caregiverEmail: UserModel.email,
    })
    .from(BookingCaregiver)
    .innerJoin(UserModel as any, eq(BookingCaregiver.caregiverId, UserModel.id))
    .where(
      and(
        eq(BookingCaregiver.bookingId, bookingId),
        eq(BookingCaregiver.status, "hired")
      )
    )
    .limit(1);

  const [existingBookingResult, assignedCaregiverResult] = await Promise.all([
    existingBookingPromise,
    assignedCaregiverPromise,
  ]);

  // Extract the first result since db.select() returns an array
  const existingBooking = existingBookingResult[0] || null;
  const assignedCaregiver = assignedCaregiverResult[0] || null;

  if (!existingBooking) {
    throw new NotFoundError("Booking not found.");
  }

  if (existingBooking.status === "completed") {
    throw new BadRequestError("Booking is already complete.");
  }
  if (!assignedCaregiver) {
    throw new BadRequestError("No active caregiver assigned to this booking.");
  }

  const updatedBooking = await db
    .update(BookingModel)
    .set({
      status: "completed",
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(BookingModel.id, bookingId))
    .returning();

  const updatedCaregiver = await db
    .update(BookingCaregiver)
    .set({
      status: "completed",
      updatedAt: new Date(),
    })
    .where(eq(BookingCaregiver.id, assignedCaregiver.id))
    .returning();

  if (
    !updatedBooking ||
    updatedBooking.length === 0 ||
    !updatedCaregiver ||
    updatedCaregiver.length === 0
  ) {
    throw new Error("Failed to complete booking.");
  }

  if (existingBooking && assignedCaregiver) {
    const jobDetails = {
      startDate: existingBooking?.startDate || "",
      meetingDate: existingBooking?.meetingDate || "",
      endDate: existingBooking?.endDate || "",
      careSeekerName: existingBooking?.careseekerName || null,
      paymentStatus: "pending" as const,
      invoiceUrl: null,
    };

    const caregiverName = assignedCaregiver?.caregiverName;
    const careseekerName = existingBooking?.careseekerName;
    const userFeedbackUrl = "";
    const giverFeedbackUrl = "";

    await sendEmail({
      to: assignedCaregiver?.caregiverEmail,
      subject: "Great Job! Your Caregiving Task is Completed",
      html: getJobCompletionHTML(caregiverName, jobDetails),
    });

    const seekerFeedbackPromise = sendEmail({
      to: existingBooking?.careseekerEmail,
      subject: "Share Your Feedback on Your Recent Caregiving Job ",
      html: getCareSeekerFeedbackHTML(
        careseekerName,
        caregiverName,
        userFeedbackUrl
      ),
    });

    const giverFeedbackPromise = sendEmail({
      to: assignedCaregiver?.caregiverEmail,
      subject: ` How Was Your Experience with ${caregiverName}?`,
      html: getCaregiverFeedbackHTML(
        caregiverName,
        careseekerName,
        giverFeedbackUrl
      ),
    });

    await Promise.all([seekerFeedbackPromise, giverFeedbackPromise]);
  }

  return res.status(200).json({
    success: true,
    message: "Booking completed successfully.",
  });
};

export const cancelBookingByGiver = async (req: Request, res: Response) => {
  const { id: bookingId } = req.params;
  const { cancellationReason } = req.body;

  const isGiversBooking = await db.query.BookingCaregiver.findFirst({
    where: and(
      eq(BookingCaregiver.bookingId, bookingId),
      eq(BookingCaregiver.caregiverId, req.user.id)
      // eq(BookingCaregiver.isFinalSelection, true)
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

export const cancelBookingByUser = async (req: Request, res: Response) => {
  const { id: bookingId } = req.params;
  const { cancellationReason } = req.body;
 const userId = req.user.id;
  const isUsersBooking = await db.query.BookingModel.findFirst({
    where: and(
      eq(BookingModel.id, bookingId),
      // eq(BookingModel.userId, req.user.id),
      ne(BookingModel.status, "cancelled")
    ),
    columns: {
      id: true,
    },
  });
    // Send notification to user
  await createNotification(
    userId,
    "Booking Cancelled",
    `Your booking #${bookingId.slice(0, 8)} has been cancelled.`,
    "booking"
  );

  if (!isUsersBooking) {
    throw new BadRequestError(
      "You are not authorized to cancel this booking or booking already cancelled."
    );
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

export const cancelBookingByAdmin = async (req: Request, res: Response) => {
  const { id: bookingId } = req.params;
  const { cancellationReason } = req.body;

  const booking = await db.query.BookingModel.findFirst({
    where: and(
      eq(BookingModel.id, bookingId),
      ne(BookingModel.status, "cancelled")
    ),
    columns: {
      id: true,
    },
  });

  if (!booking) {
    throw new BadRequestError("Booking not found or already cancelled.");
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

export const getCaregiverBookings = async (req: Request, res: Response) => {
  const caregiverId = req.user.id;
  let { status } = req.query;

  const baseConditions = [eq(BookingCaregiver.caregiverId, caregiverId)];
const today = new Date().toISOString().split("T")[0];
  if (status) {
    status = status.toString().toLowerCase();
    if (status !== "active")
      baseConditions.push(
        eq(BookingCaregiver.status, status as giverBookingStatusType)
      );
    else
      baseConditions.push(
        and(
          eq(BookingCaregiver.status, "hired"),
          lte(BookingModel.startDate, new Date().toISOString().split("T")[0]),
         or(
  gte(BookingModel.endDate, today),
  isNull(BookingModel.endDate)
)
        )
      );
  }

  const bookings = await db
    .select({
      bookingId: BookingCaregiver.bookingId,
      status: BookingCaregiver.status,
      bookedOn: BookingModel.createdAt,
      startDate: BookingModel.startDate,
      meetingDate: BookingModel.meetingDate,
      endDate: BookingModel.endDate,
      zipcode: BookingModel.careseekerZipcode,
     
      requiredBy: BookingModel.requiredBy,
      weeklySchedule: sql`array_agg( json_build_object(
        'weekDay', ${BookingWeeklySchedule.weekDay},
        'startTime', ${BookingWeeklySchedule.startTime},
        'endTime', ${BookingWeeklySchedule.endTime}
      ))`.as("weeklySchedule"),

      user: {
        id: sql<string>`
          CASE
            WHEN ${UserModel.isDeleted} = true THEN ''
            ELSE ${UserModel.id}
            END
        `.as("id"),
        name: sql<string>`
          CASE
            WHEN ${UserModel.isDeleted} = true THEN 'Deleted User'
            ELSE ${UserModel.name}
          END
        `.as("name"),

        email: sql<string>`
          CASE
            WHEN ${UserModel.isDeleted} = true THEN ''
            ELSE ${UserModel.email}
            END
        `.as("email"),
        mobile: sql<string>`
          CASE
            WHEN ${UserModel.isDeleted} = true THEN ''
            ELSE ${UserModel.mobile}
            END
        `.as("mobile"),
        isDeleted: UserModel.isDeleted,
        avatar: UserModel.avatar,
        address: UserModel.address,
      },
    })
    .from(BookingCaregiver)
    .where(and(...baseConditions))
    .innerJoin(
      BookingModel as any,
      eq(BookingCaregiver.bookingId, BookingModel.id)
    )
    .innerJoin(UserModel as any, eq(BookingModel.userId, UserModel.id))
    .innerJoin(
      BookingWeeklySchedule,
      eq(BookingWeeklySchedule.bookingId, BookingModel.id)
    )
    .groupBy(
      BookingCaregiver.bookingId,
      BookingCaregiver.status,
      BookingModel.createdAt,
      BookingModel.startDate,
      BookingModel.meetingDate,
      BookingModel.endDate,
      BookingModel.careseekerZipcode,
      BookingModel.requiredBy,
      UserModel.id
    );

  return res.status(200).json({
    success: true,
    message: "Caregiver bookings retrieved successfully.",
    data: { bookings },
  });
};

export const getUserRecentBookings = async (req: Request, res: Response) => {
  const userId = req.user.id;
  let { status } = req.query;

 const baseConditions = [eq(BookingModel.userId, userId)];
const today = new Date().toISOString().split("T")[0];

if (status) {
  if (status !== "active") {
    baseConditions.push(eq(BookingModel.status, status as bookingStatusType));
  } else {
    baseConditions.push(
      and(
        eq(BookingModel.status, "accepted"),
        lte(BookingModel.startDate, today),
        or(
          gte(BookingModel.endDate, today), // endDate exists and >= today
          isNull(BookingModel.endDate)      // or endDate is null
        )
      )
    );
  }
}


  const bookings = await db
    .select({
      bookingId: BookingModel.id,
      bookedOn: BookingModel.createdAt,
      startDate: BookingModel.startDate,
      meetingDate: BookingModel.meetingDate,
      endDate: BookingModel.endDate,
      zipcode: BookingModel.careseekerZipcode,
      requiredBy: BookingModel.requiredBy,
      status: BookingModel.status,

      caregivers: sql`array_agg(json_build_object(
        'id', CASE
          WHEN ${UserModel.isDeleted} = true THEN NULL
          ELSE ${BookingCaregiver.caregiverId}
        END,
        'name', CASE
          WHEN ${UserModel.isDeleted} = true THEN 'Deleted User'
          ELSE ${UserModel.name}
        END,
        'avatar', CASE
          WHEN ${UserModel.isDeleted} = true THEN NULL
          ELSE ${UserModel.avatar}
        END,
        'status', ${BookingCaregiver.status},
        'experience', CASE
          WHEN ${UserModel.isDeleted} = true THEN NULL
          ELSE ${JobProfileModel.experienceMax}
        END,
        'price', CASE
          WHEN ${UserModel.isDeleted} = true THEN NULL
          ELSE ${JobProfileModel.minPrice}
        END,
        'isDeleted', ${UserModel.isDeleted}
      ))`.as("caregivers"),

      weeklySchedule: sql`(SELECT json_agg(
    json_build_object(
      'id', ${BookingWeeklySchedule.id},
      'weekDay', ${BookingWeeklySchedule.weekDay},
      'startTime', ${BookingWeeklySchedule.startTime},
      'endTime', ${BookingWeeklySchedule.endTime})
    )
    FROM ${BookingWeeklySchedule}
    WHERE ${BookingWeeklySchedule.bookingId} = ${BookingModel.id}
    
    )`.as("weeklySchedule"),
    })

    .from(BookingModel)
    .where(and(...baseConditions))
    .innerJoin(
      BookingCaregiver as any,
      eq(BookingModel.id, BookingCaregiver.bookingId)
    )
    .innerJoin(UserModel as any, eq(BookingCaregiver.caregiverId, UserModel.id))
    .leftJoin(JobProfileModel as any, eq(UserModel.id, JobProfileModel.userId))

    .groupBy(
      BookingModel.id,
      BookingModel.createdAt,
      BookingModel.startDate,
      BookingModel.endDate,
      BookingModel.careseekerZipcode,
      BookingModel.requiredBy,
      BookingModel.status,
      BookingModel.meetingDate
    );

  return res.status(200).json({
    success: true,
    message: "Recent bookings retrieved successfully.",
    data: { bookings },
  });
};

export const getBookingsForAdmin = async (req: Request, res: Response) => {
  const { bookedOn, startDate, meetingDate, endDate, status, search, page } = req.query;

  const pageSize = 10;
  const pageNumber = page ? parseInt(page as string, 10) : 1;
  const skip = (pageNumber - 1) * pageSize;

  const baseConditions = [];

  //  Filter by booking date
  if (bookedOn) {
    baseConditions.push(
      sql`DATE(${BookingModel.createdAt}) = DATE(${new Date(bookedOn as string)})`
    );
  }

  // Filter by start date
  if (startDate) {
    baseConditions.push(
      sql`DATE(${BookingModel.startDate}) = DATE(${new Date(startDate as string)})`
    );
  }

  //  Filter by meeting date
  if (meetingDate) {
    baseConditions.push(
      sql`DATE(${BookingModel.meetingDate}) = DATE(${new Date(meetingDate as string)})`
    );
  }

  // Filter by end date
  if (endDate) {
    baseConditions.push(
      sql`DATE(${BookingModel.endDate}) = DATE(${new Date(endDate as string)})`
    );
  }

  //  Filter by status
  if (status) {
    if (status !== "active") {
      baseConditions.push(sql`${BookingModel.status} = ${status}`);
    } else {
      baseConditions.push(
        and(
          eq(BookingModel.status, "accepted"),
          lte(BookingModel.startDate, new Date().toISOString().split("T")[0]),
          gte(BookingModel.endDate, new Date().toISOString().split("T")[0])
        )
      );
    }
  }

  
  if (search) {
    baseConditions.push(
      sql`(${UserModel.name} ILIKE ${`%${search}%`} OR ${UserModel.email} ILIKE ${`%${search}%`})`
    );
  }

 
  const bookingsPromise = db
    .select({
      bookingId: BookingModel.id,
      bookedOn: BookingModel.createdAt,
      startDate: BookingModel.startDate,
      meetingDate: BookingModel.meetingDate,
      endDate: BookingModel.endDate,
      status: BookingModel.status,
      user: {
        id: UserModel.id,
        name: UserModel.name,
        email: UserModel.email,
        isDeleted: UserModel.isDeleted,
      },
    })
    .from(BookingModel)
    .innerJoin(UserModel as any, eq(BookingModel.userId, UserModel.id))
    .where(and(...baseConditions))
    .orderBy(sql`${BookingModel.createdAt} DESC`) //  Sort by latest booking
    .limit(pageSize)
    .offset(skip);

  
  const totalBookingsPromise = db
    .select({
      count: sql<number>`COUNT(*)`,
    })
    .from(BookingModel)
    .innerJoin(UserModel as any, eq(BookingModel.userId, UserModel.id))
    .where(and(...baseConditions));

  const [bookings, totalBookings] = await Promise.all([
    bookingsPromise,
    totalBookingsPromise,
  ]);

  const pagesCount = Math.ceil((totalBookings?.[0]?.count || 0) / pageSize);

  return res.status(200).json({
    success: true,
    message: "Bookings retrieved successfully.",
    data: { bookings, pagesCount },
  });
};


export const getBookingDetails = async (req: Request, res: Response) => {
  const { id: bookingId } = req.params;

  const bookingDataPromise = db
    .select({
      bookingId: BookingModel.id,
      bookedOn: BookingModel.createdAt,
      startDate: BookingModel.startDate,
      meetingDate: BookingModel.meetingDate,
      endDate: BookingModel.endDate,
      status: BookingModel.status,
      user: {
        id: UserModel.id,
        name: UserModel.name,
        email: UserModel.email,
        mobile: UserModel.mobile,
        avatar: UserModel.avatar,
        isDeleted: UserModel.isDeleted,
      },
      completedAt: BookingModel.completedAt,
      requiredBy: BookingModel.requiredBy,
      careseekerZipCode: BookingModel.careseekerZipcode,
      cancelledAt: BookingModel.cancelledAt,
      weeklySchedule: sql`(
      SELECT json_agg(json_build_object(
        'id', id,
        'weekDay', week_day,
        'startTime', start_time,
        'endTime', end_time
      ))
      FROM ${BookingWeeklySchedule}
      WHERE booking_id = ${BookingModel.id}
    )`.as("weeklySchedule"),

      services: sql`(SELECT json_agg(
      json_build_object(
      'id', ${ServiceModel.id},
      'name', ${ServiceModel.name}
    )) FROM ${BookingServices}
     INNER JOIN ${ServiceModel} ON ${ServiceModel.id} = ${BookingServices.serviceId}
     WHERE ${BookingServices.bookingId} = ${BookingModel.id})
     
     `,
    })
    .from(BookingModel)
    .where(eq(BookingModel.id, bookingId))
    .innerJoin(UserModel as any, eq(BookingModel.userId, UserModel.id));

  const caregiversPromise = db
    .select({
      id: BookingCaregiver.caregiverId,
      name: UserModel.name,
      avatar: UserModel.avatar,
      email: UserModel.email,
      isUsersChoice: BookingCaregiver.isUsersChoice,
      status: BookingCaregiver.status,
      minExperience: JobProfileModel.experienceMin,
      maxExperience: JobProfileModel.experienceMax,
      minPrice: JobProfileModel.minPrice,
      maxPrice: JobProfileModel.maxPrice,
      isDeleted: UserModel.isDeleted,
    })
    .from(BookingCaregiver)
    .where(eq(BookingCaregiver.bookingId, bookingId))
    .innerJoin(UserModel as any, eq(BookingCaregiver.caregiverId, UserModel.id))
    .leftJoin(JobProfileModel as any, eq(UserModel.id, JobProfileModel.userId));

  const [bookingData, caregivers] = await Promise.all([
    bookingDataPromise,
    caregiversPromise,
  ]);

  if (!bookingData || bookingData.length === 0) {
    throw new BadRequestError("Booking not found.");
  }

  const booking = {
    ...bookingData[0],
    caregivers: caregivers,
  };

  return res.status(200).json({
    success: true,
    message: "Booking details retrieved successfully.",
    data: { booking },
  });
};

export const updateBookingDetails = async (req: Request, res: Response) => {
  const { id: bookingId } = req.params;
  const { startDate, endDate, meetingDate } = req.body;

  if (!startDate  || !meetingDate) {
    throw new BadRequestError("Please provide start date and meeting date.");
  }
  const updatedBooking = await db
    .update(BookingModel)
    .set({
      startDate,
      meetingDate,
      endDate,
      updatedAt: new Date(),
    })
    .where(eq(BookingModel.id, bookingId))
    .returning();

  if (!updatedBooking || updatedBooking.length === 0) {
    throw new BadRequestError("Failed to update booking details.");
  }

  return res.status(200).json({
    success: true,
    message: "Booking updated successfully.",
    data: { booking: updatedBooking },
  });
};

export const addNewWeeklySchedule = async (req: Request, res: Response) => {
  const { id: bookingId } = req.params;
  const { weekDay, startTime, endTime } = req.body;

  if (!weekDay || !startTime || !endTime) {
    throw new BadRequestError(
      "Please provide week day, start time, and end time."
    );
  }

  const alreadyExistingSchedule = await db
    .select()
    .from(BookingWeeklySchedule)
    .where(
      and(
        eq(BookingWeeklySchedule.bookingId, bookingId),
        eq(BookingWeeklySchedule.weekDay, weekDay)
      )
    );
  if (alreadyExistingSchedule && alreadyExistingSchedule.length > 0) {
    throw new BadRequestError("Schedule for this weekday already exists.");
  }

  const newSchedule = await db
    .insert(BookingWeeklySchedule)
    .values({
      bookingId,
      weekDay,
      startTime,
      endTime,
    })
    .returning();

  if (!newSchedule || newSchedule.length === 0) {
    throw new BadRequestError("Failed to add new weekly schedule.");
  }

  return res.status(201).json({
    success: true,
    message: "New weekly schedule added successfully.",
    data: { schedule: newSchedule },
  });
};

export const updateWeeklySchedule = async (req: Request, res: Response) => {
  const { id: bookingId, wId } = req.params;
  const { weekDay, startTime, endTime } = req.body;

  if (!weekDay || !startTime || !endTime) {
    throw new BadRequestError(
      "Please provide week day, start time, and end time."
    );
  }

  const alreadyExistingSchedule = await db
    .select()
    .from(BookingWeeklySchedule)
    .where(
      and(
        eq(BookingWeeklySchedule.bookingId, bookingId),
        eq(BookingWeeklySchedule.weekDay, weekDay),
        ne(BookingWeeklySchedule.id, wId)
      )
    );
  if (alreadyExistingSchedule && alreadyExistingSchedule.length > 0) {
    throw new BadRequestError("Schedule for this weekday  already exists.");
  }

  const updatedSchedule = await db
    .update(BookingWeeklySchedule)
    .set({
      weekDay,
      startTime,
      endTime,
    })
    .where(
      and(
        eq(BookingWeeklySchedule.bookingId, bookingId),
        eq(BookingWeeklySchedule.id, wId)
      )
    )
    .returning();

  if (!updatedSchedule || updatedSchedule.length === 0) {
    throw new BadRequestError("Failed to update weekly schedule.");
  }

  return res.status(200).json({
    success: true,
    message: "Weekly schedule updated successfully.",
    data: { schedule: updatedSchedule },
  });
};

export const deleteWeeklySchedule = async (req: Request, res: Response) => {
  const { id: bookingId, wId } = req.params;

  const alreadyExistingSchedule = await db
    .delete(BookingWeeklySchedule)
    .where(
      and(
        eq(BookingWeeklySchedule.bookingId, bookingId),
        eq(BookingWeeklySchedule.id, wId)
      )
    )
    .returning();

  if (!alreadyExistingSchedule || alreadyExistingSchedule.length === 0) {
    throw new BadRequestError("Failed to delete weekly schedule.");
  }

  return res.status(200).json({
    success: true,
    message: "Weekly schedule deleted successfully.",
  });
};

export const seekerBookingsForProfile = async (req: Request, res: Response) => {
  const userId = req.params.id;

  const bookings = await db
    .select({
      id: BookingModel.id,
      startDate: BookingModel.startDate,
      meetingDate: BookingModel.meetingDate,
      status: BookingModel.status,
      bookedOn: BookingModel.createdAt,
      completedAt: BookingModel.completedAt,
    })
    .from(BookingModel)
    .where(eq(BookingModel.userId, userId))
    .orderBy(sql`${BookingModel.createdAt} DESC`);

  return res.status(200).json({
    success: true,
    message: "User bookings retrieved successfully.",
    data: { bookings },
  });
};

export const giverBookingsForProfile = async (req: Request, res: Response) => {
  const giversId = req.params.id;

  const bookings = await db
    .select({
      id: BookingCaregiver.id,
      bookingId: BookingCaregiver.bookingId,
      isUsersChoice: BookingCaregiver.isUsersChoice,
      status: BookingCaregiver.status,
      cancelledAt: BookingCaregiver.cancelledAt,
    })
    .from(BookingCaregiver)
    .where(eq(BookingCaregiver.caregiverId, giversId))
    .orderBy(desc(BookingCaregiver.createdAt));

  const bookingAnalytics = await db
    .select({
      hired: sql`COUNT(CASE WHEN ${BookingCaregiver.status} = 'hired' THEN 1 END)::integer`,
      completed: sql`COUNT(CASE WHEN ${BookingCaregiver.status} = 'completed' THEN 1 END)::integer`,
      cancelled: sql`COUNT(CASE WHEN ${BookingCaregiver.status} = 'cancelled' THEN 1 END)::integer`,
    })
    .from(BookingCaregiver)
    .where(eq(BookingCaregiver.caregiverId, giversId));

  return res.status(200).json({
    success: true,
    message: "Giver bookings retrieved successfully.",
    data: { bookings, bookingAnalytics },
  });
};

export const editBooking = async (req: Request, res: Response) => {
  const { id: bookingId } = req.params;
  const { startDate, meetingDate, endDate, weeklySchedule } = req.body;

  if (!bookingId) {
    throw new BadRequestError("Booking ID is required.");
  }

  // Validate date fields
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const startDateTime = new Date(startDate);
  const meetingDateTime = new Date(meetingDate);
  const startDateOnly = new Date(
    startDateTime.getFullYear(),
    startDateTime.getMonth(),
    startDateTime.getDate()
  );
  const meetingDateOnly = new Date(
    meetingDateTime.getFullYear(),
    meetingDateTime.getMonth(),
    meetingDateTime.getDate()
  );

  if (meetingDateOnly < today)
    throw new BadRequestError("Please select a future meeting date");

  if (startDateOnly < today)
    throw new BadRequestError("Please select a future start date");

  try {
    await db.transaction(async (tx) => {
      // 1️⃣ Check if booking exists
      const existingBooking = await tx.query.BookingModel.findFirst({
        where: eq(BookingModel.id, bookingId),
      });

      if (!existingBooking) {
        throw new NotFoundError("Booking not found.");
      }

      // 2️⃣ Update booking main details
      await tx
        .update(BookingModel)
        .set({
          startDate,
          meetingDate,
          endDate,
          updatedAt: new Date(),
        })
        .where(eq(BookingModel.id, bookingId));

      // 3️⃣ Delete old weekly schedule entries for this booking
      await tx
        .delete(BookingWeeklySchedule)
        .where(eq(BookingWeeklySchedule.bookingId, bookingId));

      // 4️⃣ Insert new weekly schedule records
      if (weeklySchedule && Array.isArray(weeklySchedule) && weeklySchedule.length > 0) {
        const weeklyScheduleRecords = weeklySchedule.map((scheduleItem: any) => ({
          ...scheduleItem,
          bookingId,
        }));

        await tx.insert(BookingWeeklySchedule).values(weeklyScheduleRecords);
      }
    });

    return res.status(200).json({
      success: true,
      message: "Booking updated successfully.",
    });
  } catch (error) {
    console.error("Error updating booking:", error);
    throw new BadRequestError("Failed to update booking. Please try again.");
  }
};


