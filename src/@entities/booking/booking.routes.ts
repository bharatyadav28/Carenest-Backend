import express from "express";

import { auth, isSeeker, isAdmin, isGiver } from "../../middlewares/auth";
import {
  bookingRequest,
  assignCaregiver,
  completeBooking,
  // cancelBookingByGiver,
  cancelBookingByUser,
  cancelBookingByAdmin,
  getCaregiverBookings,
  getUserRecentBookings,
  getBookingsForAdmin,
  getBookingDetails,
  updateBookingDetails,
  updateWeeklySchedule,
  deleteWeeklySchedule,
  addNewWeeklySchedule,
  seekerBookingsForProfile,
  giverBookingsForProfile,
} from "./booking.controller";
import { validateData } from "../../middlewares/validation";
import { createBookingSchema } from "./booking.schema";

const BookingRouter = express.Router();

BookingRouter.route("/")
  .post(isSeeker, validateData(createBookingSchema), bookingRequest)
  .get(isAdmin, getBookingsForAdmin);

BookingRouter.route("/:id")
  .get(isAdmin, getBookingDetails)
  .put( updateBookingDetails);

BookingRouter.route("/:id/assign").put(isAdmin, assignCaregiver);
BookingRouter.route("/:id/complete").put(isAdmin, completeBooking);

// // BookingRouter.route("/:id/cancel/giver").put(isGiver, cancelBookingByGiver);
BookingRouter.route("/:id/cancel/user").put(isSeeker, cancelBookingByUser);
BookingRouter.route("/:id/cancel/admin").put(isAdmin, cancelBookingByAdmin);

BookingRouter.route("/recent/giver").get(isGiver, getCaregiverBookings);
BookingRouter.route("/recent/user").get(isSeeker, getUserRecentBookings);

BookingRouter.route("/:id/weekly-schedule").post(isAdmin, addNewWeeklySchedule);
BookingRouter.route("/:id/weekly-schedule/:wId")
  .put( updateWeeklySchedule)
  .delete(isAdmin, deleteWeeklySchedule);

BookingRouter.route("/seeker/:id").get(isAdmin, seekerBookingsForProfile);
BookingRouter.route("/giver/:id").get(isAdmin, giverBookingsForProfile);

export default BookingRouter;
