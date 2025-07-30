import { Request, Response } from "express";
import { BadRequestError } from "../../errors";
import { db } from "../../db";
import { BookingCaregiver, BookingModel } from "./booking.model";
import { and, eq, isNotNull, ne, sql, isNull } from "drizzle-orm";
import { cancelBooking } from "./booking.service";
import { ServiceModel } from "../service";
import { UserModel } from "../user";
import { JobProfileModel } from "../jobProfile";

export const bookingRequest = async (req: Request, res: Response) => {
  const { appointmentDate, serviceId, durationInDays, selectedCaregivers } =
    req.body;

  const userId = req.user.id;

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

export const cancelBookingByGiver = async (req: Request, res: Response) => {
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

export const cancelBookingByUser = async (req: Request, res: Response) => {
  const { id: bookingId } = req.params;
  const { cancellationReason } = req.body;

  console.log("req.user.id", req.user.id);
  const isUsersBooking = await db.query.BookingModel.findFirst({
    where: and(
      eq(BookingModel.id, bookingId),
      eq(BookingModel.userId, req.user.id)
    ),
    columns: {
      id: true,
    },
  });

  if (!isUsersBooking) {
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

export const getCaregiverBookings = async (req: Request, res: Response) => {
  const caregiverId = req.user.id;
  let { status } = req.query;

  const baseConditions = [eq(BookingCaregiver.caregiverId, caregiverId)];

  if (status) {
    status = status.toString().toLowerCase();
    if (status === "rejected") {
      baseConditions.push(isNotNull(BookingCaregiver.cancelledAt));
    } else if (status === "hired") {
      baseConditions.push(eq(BookingCaregiver.isFinalSelection, true));
      baseConditions.push(isNull(BookingCaregiver.cancelledAt));
    } else if (status === "active") {
      baseConditions.push(eq(BookingCaregiver.isFinalSelection, false));
    }
  }

  const bookings = await db
    .select({
      bookingId: BookingCaregiver.bookingId,
      status: sql<string>`
        CASE 
          WHEN ${BookingCaregiver.cancelledAt} IS NOT NULL THEN 'rejected'
          WHEN ${BookingCaregiver.isFinalSelection} = true THEN 'hired'
          ELSE 'active'
        END
      `.as("status"),
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
    status = status.toString().toLowerCase();
    if (status === "accepted") {
      baseConditions.push(eq(BookingModel.status, "active"));
    } else if (status === "pending" || status === "completed") {
      baseConditions.push(eq(BookingModel.status, status));
    }
  }

  const bookings = await db
    .select({
      bookingId: BookingModel.id,
      bookedOn: BookingModel.createdAt,
      appointmentDate: BookingModel.appointmentDate,
      duration: BookingModel.durationInDays,
      status: sql<string>`
        CASE
          WHEN ${BookingModel.status} = 'active' THEN 'accepted'
          ELSE ${BookingModel.status}::text
        END
      `.as("status"),

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
        'isFinalSelection', ${BookingCaregiver.isFinalSelection},
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
    .leftJoin(JobProfileModel as any, eq(UserModel.id, JobProfileModel.userId))
    .groupBy(
      BookingModel.id,
      BookingModel.createdAt,
      BookingModel.appointmentDate,
      BookingModel.durationInDays,
      BookingModel.status
    );

  return res.status(200).json({
    success: true,
    message: "Recent bookings retrieved successfully.",
    data: { bookings },
  });
};

export const getBookingsForAdmin = async (req: Request, res: Response) => {
  const { bookedOn, appointmentDate, status, search } = req.query;

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

  const bookings = await db
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
    .innerJoin(
      ServiceModel as any,
      eq(BookingModel.serviceId, ServiceModel.id)
    );

  return res.status(200).json({
    success: true,
    message: "Bookings retrieved successfully.",
    data: { bookings },
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
      isUsersChoice: BookingCaregiver.isUsersChoice,
      isFinalSelection: BookingCaregiver.isFinalSelection,
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
