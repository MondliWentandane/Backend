"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bookingControllers_1 = require("../controllers/bookingControllers");
const userMiddleware_1 = require("../middleware/userMiddleware");
const router = (0, express_1.Router)();
// Customer routes (authentication required)
router.post("/", userMiddleware_1.verifyAuth, userMiddleware_1.requireCustomer, bookingControllers_1.createBooking); // POST /api/bookings - Create booking
router.get("/my-bookings", userMiddleware_1.verifyAuth, userMiddleware_1.requireCustomer, bookingControllers_1.getUserBookings); // GET /api/bookings/my-bookings - Get user's bookings
router.get("/:id", userMiddleware_1.verifyAuth, bookingControllers_1.getBookingById); // GET /api/bookings/:id - Get booking by ID (customer can view own, admin can view all)
router.patch("/:id/cancel", userMiddleware_1.verifyAuth, bookingControllers_1.cancelBooking); // PATCH /api/bookings/:id/cancel - Cancel booking
// Admin routes (authentication + admin role required)
router.get("/", userMiddleware_1.verifyAuth, userMiddleware_1.requireAdmin, bookingControllers_1.getAllBookings); // GET /api/bookings - Get all bookings (admin)
router.get("/hotel/:hotelId", userMiddleware_1.verifyAuth, userMiddleware_1.requireAdmin, bookingControllers_1.getBookingsByHotel); // GET /api/bookings/hotel/:hotelId - Get bookings by hotel
router.patch("/:id/status", userMiddleware_1.verifyAuth, userMiddleware_1.requireAdmin, bookingControllers_1.updateBookingStatus); // PATCH /api/bookings/:id/status - Update booking status
exports.default = router;
