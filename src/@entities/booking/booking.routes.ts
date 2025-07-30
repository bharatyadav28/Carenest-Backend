import express from "express";

import { auth, isAdmin, isGiver } from "../../middlewares/auth";
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
} from "./booking.controller";

const BookingRouter = express.Router();

BookingRouter.route("/")
  .post(auth, bookingRequest)
  .get(isAdmin, getBookingsForAdmin);

BookingRouter.route("/:id").get(isAdmin, getBookingDetails);

BookingRouter.route("/:id/assign").put(isAdmin, assignCaregiver);
BookingRouter.route("/:id/complete").put(isAdmin, completeBooking);

BookingRouter.route("/:id/cancel/giver").put(isGiver, cancelBookingByGiver);
BookingRouter.route("/:id/cancel/user").put(auth, cancelBookingByUser);

BookingRouter.route("/recent/giver").get(isGiver, getCaregiverBookings);
BookingRouter.route("/recent/user").get(auth, getUserRecentBookings);

export default BookingRouter;
