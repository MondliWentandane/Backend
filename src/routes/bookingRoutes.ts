import { Router } from "express";
import {
  createBooking,
  getUserBookings,
  getAllBookings,
  getBookingById,
  updateBookingStatus,
  cancelBooking,
  modifyBooking,
  getBookingsByHotel,
} from "../controllers/bookingControllers";
import { verifyAuth, requireAdmin, requireCustomer } from "../middleware/userMiddleware";

const router = Router();

// Customer routes (authentication required)
router.post("/", verifyAuth, requireCustomer, createBooking); // POST /api/bookings - Create booking
router.get("/my-bookings", verifyAuth, requireCustomer, getUserBookings); // GET /api/bookings/my-bookings - Get user's bookings

// Admin routes (authentication + admin role required) - MUST come before parameterized routes
router.get("/", verifyAuth, requireAdmin, getAllBookings); // GET /api/bookings - Get all bookings (admin)
router.get("/hotel/:hotelId", verifyAuth, requireAdmin, getBookingsByHotel); // GET /api/bookings/hotel/:hotelId - Get bookings by hotel

// Parameterized routes (must come after specific routes)
router.get("/:id", verifyAuth, getBookingById); // GET /api/bookings/:id - Get booking by ID (customer can view own, admin can view all)
router.patch("/:id/modify", verifyAuth, modifyBooking); // PATCH /api/bookings/:id/modify - Modify booking (dates, room, guests)
router.patch("/:id/cancel", verifyAuth, cancelBooking); // PATCH /api/bookings/:id/cancel - Cancel booking
router.patch("/:id/status", verifyAuth, requireAdmin, updateBookingStatus); // PATCH /api/bookings/:id/status - Update booking status

export default router;

