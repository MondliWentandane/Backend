import { Router } from "express";
import {
  createBooking,
  getUserBookings,
  getAllBookings,
  getBookingById,
  updateBookingStatus,
  cancelBooking,
  getBookingsByHotel,
} from "../controllers/bookingControllers";
import { verifyAuth, requireAdmin, requireCustomer } from "../middleware/userMiddleware";

const router = Router();

// Customer routes (authentication required)
router.post("/", verifyAuth, requireCustomer, createBooking); // POST /api/bookings - Create booking
router.get("/my-bookings", verifyAuth, requireCustomer, getUserBookings); // GET /api/bookings/my-bookings - Get user's bookings
router.get("/:id", verifyAuth, getBookingById); // GET /api/bookings/:id - Get booking by ID (customer can view own, admin can view all)
router.patch("/:id/cancel", verifyAuth, cancelBooking); // PATCH /api/bookings/:id/cancel - Cancel booking

// Admin routes (authentication + admin role required)
router.get("/", verifyAuth, requireAdmin, getAllBookings); // GET /api/bookings - Get all bookings (admin)
router.get("/hotel/:hotelId", verifyAuth, requireAdmin, getBookingsByHotel); // GET /api/bookings/hotel/:hotelId - Get bookings by hotel
router.patch("/:id/status", verifyAuth, requireAdmin, updateBookingStatus); // PATCH /api/bookings/:id/status - Update booking status

export default router;

