import express from "express";

import { auth, isSeeker, isAdmin, isGiver } from "../../middlewares/auth";
import {
  assignCaregiver,
  bookingRequest,
  completeBooking,
  cancelBookingByGiver,
  cancelBookingByUser,
  getCaregiverBookings,
  getUserRecentBookings,
  getBookingsForAdmin,
  getBookingDetails,
  cancelBookingByAdmin,
  updateBookingDetails,
} from "./booking.controller";

const BookingRouter = express.Router();

BookingRouter.route("/")
  .post(isSeeker, bookingRequest)
  .get(isAdmin, getBookingsForAdmin);

BookingRouter.route("/:id")
  .get(isAdmin, getBookingDetails)
  .put(isAdmin, updateBookingDetails);

BookingRouter.route("/:id/assign").put(isAdmin, assignCaregiver);
BookingRouter.route("/:id/complete").put(isAdmin, completeBooking);

// BookingRouter.route("/:id/cancel/giver").put(isGiver, cancelBookingByGiver);
BookingRouter.route("/:id/cancel/user").put(isSeeker, cancelBookingByUser);
BookingRouter.route("/:id/cancel/admin").put(isAdmin, cancelBookingByAdmin);

BookingRouter.route("/recent/giver").get(isGiver, getCaregiverBookings);
BookingRouter.route("/recent/user").get(isSeeker, getUserRecentBookings);

export default BookingRouter;
