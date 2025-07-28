import express from "express";

import { auth, isAdmin, isGiver } from "../../middlewares/auth";
import {
  assignCaregiver,
  bookingRequest,
  completeBooking,
  cancelUserBooking,
} from "./booking.controller";

const BookingRouter = express.Router();

BookingRouter.route("/").post(auth, bookingRequest);
BookingRouter.route("/:id/assign").put(isAdmin, assignCaregiver);
BookingRouter.route("/:id/complete").put(isAdmin, completeBooking);
BookingRouter.route("/:id/cancel").put(isGiver, cancelUserBooking);

export default BookingRouter;
