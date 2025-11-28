"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBookingsByHotel = exports.cancelBooking = exports.updateBookingStatus = exports.getBookingById = exports.getAllBookings = exports.getUserBookings = exports.createBooking = void 0;
const database_1 = __importDefault(require("../config/database"));
// Helper function to calculate nights and total price
const calculateBookingPrice = (checkIn, checkOut, pricePerNight) => {
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    const totalPrice = pricePerNight * nights;
    return { nights, totalPrice };
};
// Helper function to validate dates
const validateDates = (checkIn, checkOut) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkInDate = new Date(checkIn);
    checkInDate.setHours(0, 0, 0, 0);
    const checkOutDate = new Date(checkOut);
    checkOutDate.setHours(0, 0, 0, 0);
    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
        return { valid: false, error: "Invalid date format. Use YYYY-MM-DD" };
    }
    if (checkInDate < today) {
        return { valid: false, error: "Check-in date cannot be in the past" };
    }
    if (checkOutDate <= checkInDate) {
        return { valid: false, error: "Check-out date must be after check-in date" };
    }
    return { valid: true };
};
// CREATE BOOKING (Customer - authenticated)
const createBooking = async (req, res) => {
    try {
        const user = req.user;
        const { hotel_id, room_id, check_in_date, check_out_date } = req.body;
        // Validation
        if (!hotel_id || !room_id || !check_in_date || !check_out_date) {
            return res.status(400).json({
                success: false,
                error: "Missing required fields: hotel_id, room_id, check_in_date, check_out_date",
            });
        }
        // Validate dates
        const dateValidation = validateDates(check_in_date, check_out_date);
        if (!dateValidation.valid) {
            return res.status(400).json({
                success: false,
                error: dateValidation.error,
            });
        }
        // Check if hotel exists
        const hotelCheck = await database_1.default.query("SELECT * FROM Hotels WHERE hotel_id = $1", [hotel_id]);
        if (hotelCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Hotel not found",
            });
        }
        // Check if room exists and belongs to hotel
        const roomCheck = await database_1.default.query("SELECT * FROM Rooms WHERE room_id = $1 AND hotel_id = $2", [room_id, hotel_id]);
        if (roomCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Room not found or does not belong to this hotel",
            });
        }
        const room = roomCheck.rows[0];
        // Check if room is available
        if (room.availability_status !== "available") {
            return res.status(400).json({
                success: false,
                error: `Room is currently ${room.availability_status}`,
            });
        }
        // Check for conflicting bookings
        const checkInDate = new Date(check_in_date);
        const checkOutDate = new Date(check_out_date);
        const conflictingBookings = await database_1.default.query(`SELECT COUNT(*) as count
       FROM Bookings
       WHERE room_id = $1
         AND status IN ('pending', 'confirmed')
         AND (
           (check_in_date <= $2 AND check_out_date > $2)
           OR (check_in_date < $3 AND check_out_date >= $3)
           OR (check_in_date >= $2 AND check_out_date <= $3)
         )`, [room_id, check_in_date, check_out_date]);
        if (parseInt(conflictingBookings.rows[0].count) > 0) {
            return res.status(400).json({
                success: false,
                error: "Room is already booked for the selected dates",
            });
        }
        // Calculate total price
        const { totalPrice } = calculateBookingPrice(checkInDate, checkOutDate, parseFloat(room.price_per_night));
        // Create booking
        const insertQuery = `
      INSERT INTO Bookings (user_id, hotel_id, room_id, check_in_date, check_out_date, total_price, status, payment_status)
      VALUES ($1, $2, $3, $4, $5, $6, 'pending', 'pending')
      RETURNING *
    `;
        const result = await database_1.default.query(insertQuery, [
            user.user_id,
            hotel_id,
            room_id,
            check_in_date,
            check_out_date,
            totalPrice,
        ]);
        res.status(201).json({
            success: true,
            message: "Booking created successfully",
            data: result.rows[0],
        });
    }
    catch (err) {
        console.error("Error creating booking:", err);
        res.status(500).json({
            success: false,
            error: "Failed to create booking",
            details: err.message,
        });
    }
};
exports.createBooking = createBooking;
// GET USER'S BOOKINGS (Customer - authenticated)
const getUserBookings = async (req, res) => {
    try {
        const user = req.user;
        const { status, limit, offset } = req.query;
        let query = `
      SELECT 
        b.booking_id,
        b.user_id,
        b.hotel_id,
        b.room_id,
        b.check_in_date,
        b.check_out_date,
        b.status,
        b.total_price,
        b.payment_status,
        b.created_at,
        b.updated_at,
        h.hotel_name,
        h.address,
        h.city,
        h.country,
        r.room_type,
        r.price_per_night
      FROM Bookings b
      INNER JOIN Hotels h ON b.hotel_id = h.hotel_id
      INNER JOIN Rooms r ON b.room_id = r.room_id
      WHERE b.user_id = $1
    `;
        const params = [user.user_id];
        let paramCount = 2;
        // Filter by status
        if (status) {
            query += ` AND b.status = $${paramCount}`;
            params.push(status);
            paramCount++;
        }
        query += ` ORDER BY b.created_at DESC`;
        // Add pagination
        const limitValue = limit ? parseInt(limit) : 20;
        const offsetValue = offset ? parseInt(offset) : 0;
        query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limitValue, offsetValue);
        const result = await database_1.default.query(query, params);
        // Get total count
        let countQuery = "SELECT COUNT(*) FROM Bookings WHERE user_id = $1";
        const countParams = [user.user_id];
        if (status) {
            countQuery += ` AND status = $2`;
            countParams.push(status);
        }
        const countResult = await database_1.default.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].count);
        res.json({
            success: true,
            data: result.rows,
            pagination: {
                total,
                limit: limitValue,
                offset: offsetValue,
                hasMore: offsetValue + limitValue < total,
            },
        });
    }
    catch (err) {
        console.error("Error fetching user bookings:", err);
        res.status(500).json({
            success: false,
            error: "Failed to fetch bookings",
            details: err.message,
        });
    }
};
exports.getUserBookings = getUserBookings;
// GET ALL BOOKINGS (Admin only)
const getAllBookings = async (req, res) => {
    try {
        const { user_id, hotel_id, status, payment_status, limit, offset } = req.query;
        let query = `
      SELECT 
        b.booking_id,
        b.user_id,
        b.hotel_id,
        b.room_id,
        b.check_in_date,
        b.check_out_date,
        b.status,
        b.total_price,
        b.payment_status,
        b.created_at,
        b.updated_at,
        u.name as user_name,
        u.email as user_email,
        h.hotel_name,
        h.city,
        h.country,
        r.room_type,
        r.price_per_night
      FROM Bookings b
      INNER JOIN Users u ON b.user_id = u.user_id
      INNER JOIN Hotels h ON b.hotel_id = h.hotel_id
      INNER JOIN Rooms r ON b.room_id = r.room_id
    `;
        const conditions = [];
        const params = [];
        let paramCount = 1;
        // Filter by user
        if (user_id) {
            conditions.push(`b.user_id = $${paramCount}`);
            params.push(parseInt(user_id));
            paramCount++;
        }
        // Filter by hotel
        if (hotel_id) {
            conditions.push(`b.hotel_id = $${paramCount}`);
            params.push(parseInt(hotel_id));
            paramCount++;
        }
        // Filter by booking status
        if (status) {
            conditions.push(`b.status = $${paramCount}`);
            params.push(status);
            paramCount++;
        }
        // Filter by payment status
        if (payment_status) {
            conditions.push(`b.payment_status = $${paramCount}`);
            params.push(payment_status);
            paramCount++;
        }
        if (conditions.length > 0) {
            query += ` WHERE ${conditions.join(" AND ")}`;
        }
        query += ` ORDER BY b.created_at DESC`;
        // Add pagination
        const limitValue = limit ? parseInt(limit) : 20;
        const offsetValue = offset ? parseInt(offset) : 0;
        query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limitValue, offsetValue);
        const result = await database_1.default.query(query, params);
        // Get total count
        let countQuery = "SELECT COUNT(*) FROM Bookings b";
        if (conditions.length > 0) {
            countQuery += ` WHERE ${conditions.join(" AND ")}`;
        }
        const countParams = params.slice(0, -2);
        const countResult = await database_1.default.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].count);
        res.json({
            success: true,
            data: result.rows,
            pagination: {
                total,
                limit: limitValue,
                offset: offsetValue,
                hasMore: offsetValue + limitValue < total,
            },
        });
    }
    catch (err) {
        console.error("Error fetching bookings:", err);
        res.status(500).json({
            success: false,
            error: "Failed to fetch bookings",
            details: err.message,
        });
    }
};
exports.getAllBookings = getAllBookings;
// GET BOOKING BY ID
const getBookingById = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        const query = `
      SELECT 
        b.booking_id,
        b.user_id,
        b.hotel_id,
        b.room_id,
        b.check_in_date,
        b.check_out_date,
        b.status,
        b.total_price,
        b.payment_status,
        b.created_at,
        b.updated_at,
        u.name as user_name,
        u.email as user_email,
        u.phone_number as user_phone,
        h.hotel_name,
        h.address,
        h.city,
        h.country,
        h.star_rating,
        r.room_type,
        r.price_per_night,
        r.availability_status
      FROM Bookings b
      INNER JOIN Users u ON b.user_id = u.user_id
      INNER JOIN Hotels h ON b.hotel_id = h.hotel_id
      INNER JOIN Rooms r ON b.room_id = r.room_id
      WHERE b.booking_id = $1
    `;
        const result = await database_1.default.query(query, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Booking not found",
            });
        }
        const booking = result.rows[0];
        // Check if user has permission (customer can only view their own bookings, admin can view all)
        if (user.role !== "admin" && booking.user_id !== user.user_id) {
            return res.status(403).json({
                success: false,
                error: "Access denied. You can only view your own bookings.",
            });
        }
        res.json({
            success: true,
            data: booking,
        });
    }
    catch (err) {
        console.error("Error fetching booking:", err);
        res.status(500).json({
            success: false,
            error: "Failed to fetch booking",
            details: err.message,
        });
    }
};
exports.getBookingById = getBookingById;
// UPDATE BOOKING STATUS (Admin only)
const updateBookingStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, payment_status } = req.body;
        // Check if booking exists
        const checkQuery = "SELECT * FROM Bookings WHERE booking_id = $1";
        const checkResult = await database_1.default.query(checkQuery, [id]);
        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Booking not found",
            });
        }
        // Validate status if provided
        const validBookingStatuses = ["pending", "confirmed", "cancelled", "completed"];
        if (status && !validBookingStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: "Invalid status. Must be: pending, confirmed, cancelled, or completed",
            });
        }
        // Validate payment status if provided
        const validPaymentStatuses = ["pending", "paid", "failed"];
        if (payment_status && !validPaymentStatuses.includes(payment_status)) {
            return res.status(400).json({
                success: false,
                error: "Invalid payment_status. Must be: pending, paid, or failed",
            });
        }
        // Build update query
        const updates = [];
        const params = [];
        let paramCount = 1;
        if (status !== undefined) {
            updates.push(`status = $${paramCount++}`);
            params.push(status);
        }
        if (payment_status !== undefined) {
            updates.push(`payment_status = $${paramCount++}`);
            params.push(payment_status);
        }
        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                error: "No fields to update",
            });
        }
        updates.push(`updated_at = NOW()`);
        params.push(id);
        const updateQuery = `
      UPDATE Bookings
      SET ${updates.join(", ")}
      WHERE booking_id = $${paramCount}
      RETURNING *
    `;
        const result = await database_1.default.query(updateQuery, params);
        res.json({
            success: true,
            message: "Booking status updated successfully",
            data: result.rows[0],
        });
    }
    catch (err) {
        console.error("Error updating booking status:", err);
        res.status(500).json({
            success: false,
            error: "Failed to update booking status",
            details: err.message,
        });
    }
};
exports.updateBookingStatus = updateBookingStatus;
// CANCEL BOOKING (Customer or Admin)
const cancelBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        // Check if booking exists
        const checkQuery = "SELECT * FROM Bookings WHERE booking_id = $1";
        const checkResult = await database_1.default.query(checkQuery, [id]);
        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Booking not found",
            });
        }
        const booking = checkResult.rows[0];
        // Check permissions (customer can only cancel their own bookings, admin can cancel any)
        if (user.role !== "admin" && booking.user_id !== user.user_id) {
            return res.status(403).json({
                success: false,
                error: "Access denied. You can only cancel your own bookings.",
            });
        }
        // Check if booking can be cancelled
        if (booking.status === "cancelled") {
            return res.status(400).json({
                success: false,
                error: "Booking is already cancelled",
            });
        }
        if (booking.status === "completed") {
            return res.status(400).json({
                success: false,
                error: "Cannot cancel a completed booking",
            });
        }
        // Update booking status to cancelled
        const updateQuery = `
      UPDATE Bookings
      SET status = 'cancelled', updated_at = NOW()
      WHERE booking_id = $1
      RETURNING *
    `;
        const result = await database_1.default.query(updateQuery, [id]);
        res.json({
            success: true,
            message: "Booking cancelled successfully",
            data: result.rows[0],
        });
    }
    catch (err) {
        console.error("Error cancelling booking:", err);
        res.status(500).json({
            success: false,
            error: "Failed to cancel booking",
            details: err.message,
        });
    }
};
exports.cancelBooking = cancelBooking;
// GET BOOKINGS BY HOTEL (Admin only)
const getBookingsByHotel = async (req, res) => {
    try {
        const { hotelId } = req.params;
        const { status, payment_status, limit, offset } = req.query;
        // Check if hotel exists
        const hotelCheck = await database_1.default.query("SELECT * FROM Hotels WHERE hotel_id = $1", [hotelId]);
        if (hotelCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Hotel not found",
            });
        }
        let query = `
      SELECT 
        b.booking_id,
        b.user_id,
        b.hotel_id,
        b.room_id,
        b.check_in_date,
        b.check_out_date,
        b.status,
        b.total_price,
        b.payment_status,
        b.created_at,
        b.updated_at,
        u.name as user_name,
        u.email as user_email,
        r.room_type,
        r.price_per_night
      FROM Bookings b
      INNER JOIN Users u ON b.user_id = u.user_id
      INNER JOIN Rooms r ON b.room_id = r.room_id
      WHERE b.hotel_id = $1
    `;
        const params = [hotelId];
        let paramCount = 2;
        if (status) {
            query += ` AND b.status = $${paramCount}`;
            params.push(status);
            paramCount++;
        }
        if (payment_status) {
            query += ` AND b.payment_status = $${paramCount}`;
            params.push(payment_status);
            paramCount++;
        }
        query += ` ORDER BY b.created_at DESC`;
        const limitValue = limit ? parseInt(limit) : 20;
        const offsetValue = offset ? parseInt(offset) : 0;
        query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limitValue, offsetValue);
        const result = await database_1.default.query(query, params);
        res.json({
            success: true,
            data: result.rows,
            hotel: {
                hotel_id: hotelCheck.rows[0].hotel_id,
                hotel_name: hotelCheck.rows[0].hotel_name,
            },
            pagination: {
                limit: limitValue,
                offset: offsetValue,
            },
        });
    }
    catch (err) {
        console.error("Error fetching hotel bookings:", err);
        res.status(500).json({
            success: false,
            error: "Failed to fetch bookings",
            details: err.message,
        });
    }
};
exports.getBookingsByHotel = getBookingsByHotel;
