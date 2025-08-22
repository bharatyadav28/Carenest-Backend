import { Request, Response } from "express";

import { BadRequestError, NotFoundError } from "../../errors";
import { db } from "../../db";
import { BookingCaregiver, BookingModel } from "./booking.model";
import { and, eq, isNotNull, ne, sql, isNull } from "drizzle-orm";
import { cancelBooking } from "./booking.service";
import { ServiceModel } from "../service";
import { UserModel } from "../user";
import { JobProfileModel } from "../jobProfile";
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
} from "../../helpers/emailText";
import { caregiverDetails } from "../giver/giver.controller";

export const bookingRequest = async (req: Request, res: Response) => {
  const { appointmentDate, serviceId, durationInDays, selectedCaregivers } =
    req.body;

  const userId = req.user.id;

  if (!appointmentDate || !serviceId || !durationInDays) {
    throw new BadRequestError(
      "Please provide appointment date, service ID, and duration in days."
    );
  }

  if (!selectedCaregivers || selectedCaregivers.length < 3) {
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
      userId,
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

  const result = await db.transaction(async (tx) => {
    // Update booking status to active
    const booking = await tx
      .update(BookingModel)
      .set({
        status: "active",
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
            status: "active",
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
            status: "active",
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
      startDate: updatedbooking?.appointmentDate || "",
      location: "United states",
      careSeekerName: userDetails?.name || "User",
      duration: updatedbooking?.durationInDays || 1,
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
      appointmentDate: BookingModel.appointmentDate,
      durationInDays: BookingModel.durationInDays,
      careseekerName: UserModel.name,
      careseekerEmail: UserModel.email,
    })
    .from(BookingModel)
    .innerJoin(UserModel as any, eq(BookingModel.userId, UserModel.id))
    .where(eq(BookingModel.id, bookingId))
    .limit(1) as Promise<
    Array<{
      status: string;
      appointmentDate: string;
      durationInDays: number;
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
        eq(BookingCaregiver.status, "active")
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
      startDate: existingBooking?.appointmentDate || "",
      endDate: new Date(
        new Date(existingBooking?.appointmentDate).getTime() +
          (existingBooking?.durationInDays || 0) * 24 * 60 * 60 * 1000
      )
        .toISOString()
        .split("T")[0],
      careSeekerName: existingBooking?.careseekerName || null,
      duration: existingBooking?.durationInDays || null,
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

  const isUsersBooking = await db.query.BookingModel.findFirst({
    where: and(
      eq(BookingModel.id, bookingId),
      eq(BookingModel.userId, req.user.id),
      ne(BookingModel.status, "cancelled")
    ),
    columns: {
      id: true,
    },
  });

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

  if (status) {
    status = status.toString().toLowerCase();
    baseConditions.push(
      eq(BookingCaregiver.status, status as giverBookingStatusType)
    );
  }

  const bookings = await db
    .select({
      bookingId: BookingCaregiver.bookingId,
      status: BookingCaregiver.status,
      bookedOn: BookingModel.createdAt,
      appointmentDate: BookingModel.appointmentDate,
      duration: BookingModel.durationInDays,
      service: ServiceModel.name,
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
    .innerJoin(ServiceModel as any, eq(BookingModel.serviceId, ServiceModel.id))
    .innerJoin(UserModel as any, eq(BookingModel.userId, UserModel.id));

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
  if (status) {
    baseConditions.push(eq(BookingModel.status, status as bookingStatusType));
  }

  const bookings = await db
    .select({
      bookingId: BookingModel.id,
      bookedOn: BookingModel.createdAt,
      appointmentDate: BookingModel.appointmentDate,
      duration: BookingModel.durationInDays,
      status: BookingModel.status,
      serviceName: ServiceModel.name,

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
    })

    .from(BookingModel)
    .where(and(...baseConditions))
    .innerJoin(
      BookingCaregiver as any,
      eq(BookingModel.id, BookingCaregiver.bookingId)
    )
    .innerJoin(UserModel as any, eq(BookingCaregiver.caregiverId, UserModel.id))
    .innerJoin(ServiceModel as any, eq(BookingModel.serviceId, ServiceModel.id))
    .leftJoin(JobProfileModel as any, eq(UserModel.id, JobProfileModel.userId))
    .groupBy(
      BookingModel.id,
      BookingModel.createdAt,
      BookingModel.appointmentDate,
      BookingModel.durationInDays,
      BookingModel.status,
      ServiceModel.name
    );

  return res.status(200).json({
    success: true,
    message: "Recent bookings retrieved successfully.",
    data: { bookings },
  });
};

export const getBookingsForAdmin = async (req: Request, res: Response) => {
  const { bookedOn, appointmentDate, status, search, page } = req.query;

  const pageSize = 10; // Define the number of bookings per page
  const pageNumber = page ? parseInt(page as string, 10) : 1;
  const skip = (pageNumber - 1) * pageSize;

  const baseConditions = [];

  if (bookedOn) {
    baseConditions.push(
      sql`DATE(${BookingModel.createdAt}) = DATE(${new Date(
        bookedOn as string
      )})`
    );
  }
  if (appointmentDate) {
    baseConditions.push(
      sql`DATE(${BookingModel.appointmentDate}) = DATE(${new Date(
        appointmentDate as string
      )})`
    );
  }
  if (status) {
    baseConditions.push(sql`${BookingModel.status} = ${status}`);
  }
  if (search) {
    baseConditions.push(
      sql`(${UserModel.name} ILIKE ${`%${search}%`}) OR (${
        UserModel.email
      } ILIKE ${`%${search}%`})`
    );
  }

  const bookingsPromise = await db
    .select({
      bookingId: BookingModel.id,
      bookedOn: BookingModel.createdAt,
      appointmentDate: BookingModel.appointmentDate,
      duration: BookingModel.durationInDays,
      status: BookingModel.status,
      user: {
        id: UserModel.id,
        name: UserModel.name,
        email: UserModel.email,
        isDeleted: UserModel.isDeleted,
      },
      service: ServiceModel.name,
    })
    .from(BookingModel)
    .where(and(...baseConditions))
    .innerJoin(UserModel as any, eq(BookingModel.userId, UserModel.id))
    .innerJoin(ServiceModel as any, eq(BookingModel.serviceId, ServiceModel.id))
    .limit(pageSize)
    .offset(skip);

  const totalBookingsPromise = await db
    .select({
      count: sql<number>`COUNT(*)`,
    })
    .from(BookingModel)
    .where(and(...baseConditions))
    .innerJoin(UserModel as any, eq(BookingModel.userId, UserModel.id))
    .innerJoin(
      ServiceModel as any,
      eq(BookingModel.serviceId, ServiceModel.id)
    );

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
      appointmentDate: BookingModel.appointmentDate,
      duration: BookingModel.durationInDays,
      status: BookingModel.status,
      user: {
        id: UserModel.id,
        name: UserModel.name,
        email: UserModel.email,
        mobile: UserModel.mobile,
        avatar: UserModel.avatar,
        isDeleted: UserModel.isDeleted,
      },
      service: ServiceModel.name,
      completedAt: BookingModel.completedAt,
      cancelledAt: BookingModel.cancelledAt,
    })
    .from(BookingModel)
    .where(eq(BookingModel.id, bookingId))
    .innerJoin(UserModel as any, eq(BookingModel.userId, UserModel.id))
    .innerJoin(
      ServiceModel as any,
      eq(BookingModel.serviceId, ServiceModel.id)
    );

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
  const { appointmentDate, duration: durationInDays } = req.body;

  if (!appointmentDate || !durationInDays) {
    throw new BadRequestError("Please provide appointment date and duration.");
  }
  const updatedBooking = await db
    .update(BookingModel)
    .set({
      appointmentDate,
      durationInDays,
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
