"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBookingsByHotel = exports.modifyBooking = exports.cancelBooking = exports.updateBookingStatus = exports.getBookingById = exports.getAllBookings = exports.getUserBookings = exports.createBooking = void 0;
const database_1 = __importDefault(require("../config/database"));
const currency_1 = require("../utils/currency");
const notifications_1 = require("../utils/notifications");
const validation_1 = require("../utils/validation");
const userMiddleware_1 = require("../middleware/userMiddleware");
// Helper function to calculate nights and total price
const calculateBookingPrice = (checkIn, checkOut, pricePerNight) => {
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    const totalPrice = pricePerNight * nights;
    return { nights, totalPrice };
};
// CREATE BOOKING (Customer - authenticated)
const createBooking = async (req, res) => {
    try {
        const user = req.user;
        const { hotel_id, room_id, check_in_date, check_out_date, number_of_guests, number_of_rooms } = req.body;
        // Validate hotel_id
        const hotelIdValidation = (0, validation_1.validatePositiveInteger)(hotel_id, "Hotel ID");
        if (!hotelIdValidation.valid) {
            return res.status(400).json({
                success: false,
                error: hotelIdValidation.error
            });
        }
        // Validate room_id
        const roomIdValidation = (0, validation_1.validatePositiveInteger)(room_id, "Room ID");
        if (!roomIdValidation.valid) {
            return res.status(400).json({
                success: false,
                error: roomIdValidation.error
            });
        }
        // Validate dates (with max 1 year advance booking)
        const dateValidation = (0, validation_1.validateDateRange)(check_in_date, check_out_date, false, 365);
        if (!dateValidation.valid) {
            return res.status(400).json({
                success: false,
                error: dateValidation.error,
            });
        }
        // Validate and set default for number_of_guests
        let guestCount = 1;
        if (number_of_guests !== undefined) {
            const guestValidation = (0, validation_1.validatePositiveInteger)(number_of_guests, "Number of guests");
            if (!guestValidation.valid) {
                return res.status(400).json({
                    success: false,
                    error: guestValidation.error
                });
            }
            guestCount = guestValidation.parsed;
            if (guestCount < 1 || guestCount > 20) {
                return res.status(400).json({
                    success: false,
                    error: "Number of guests must be between 1 and 20",
                });
            }
        }
        // Validate and set default for number_of_rooms
        let roomCount = 1;
        if (number_of_rooms !== undefined) {
            const roomCountValidation = (0, validation_1.validatePositiveInteger)(number_of_rooms, "Number of rooms");
            if (!roomCountValidation.valid) {
                return res.status(400).json({
                    success: false,
                    error: roomCountValidation.error
                });
            }
            roomCount = roomCountValidation.parsed;
            if (roomCount < 1 || roomCount > 10) {
                return res.status(400).json({
                    success: false,
                    error: "Number of rooms must be between 1 and 10",
                });
            }
        }
        // Check if hotel exists
        const hotelCheck = await database_1.default.query("SELECT * FROM Hotels WHERE hotel_id = $1", [hotelIdValidation.parsed]);
        if (hotelCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Hotel not found",
            });
        }
        // Check if room exists and belongs to hotel
        const roomCheck = await database_1.default.query("SELECT * FROM Rooms WHERE room_id = $1 AND hotel_id = $2", [roomIdValidation.parsed, hotelIdValidation.parsed]);
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
        // Check for conflicting bookings - need to check if enough rooms are available
        const checkInDate = dateValidation.checkInDate;
        const checkOutDate = dateValidation.checkOutDate;
        const conflictingBookings = await database_1.default.query(`SELECT COALESCE(SUM(number_of_rooms), 0) as total_booked_rooms
       FROM Bookings
       WHERE room_id = $1
         AND status IN ('pending', 'confirmed')
         AND (
           (check_in_date <= $2 AND check_out_date > $2)
           OR (check_in_date < $3 AND check_out_date >= $3)
           OR (check_in_date >= $2 AND check_out_date <= $3)
         )`, [roomIdValidation.parsed, check_in_date, check_out_date]);
        const totalBookedRooms = parseInt(conflictingBookings.rows[0].total_booked_rooms || "0");
        // Check if requested number of rooms is available
        // Note: This assumes all rooms of the same type are identical
        // In a real system, you might want to check available room count per room type
        if (totalBookedRooms + roomCount > 10) { // Assuming max 10 rooms of same type
            return res.status(400).json({
                success: false,
                error: `Only ${10 - totalBookedRooms} room(s) available for the selected dates. You requested ${roomCount} room(s).`,
            });
        }
        // Calculate total price (price per night * number of nights * number of rooms)
        const { totalPrice: pricePerRoom } = calculateBookingPrice(checkInDate, checkOutDate, parseFloat(room.price_per_night));
        const totalPrice = pricePerRoom * roomCount;
        // Create booking
        const insertQuery = `
      INSERT INTO Bookings (user_id, hotel_id, room_id, check_in_date, check_out_date, number_of_guests, number_of_rooms, total_price, status, payment_status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', 'pending')
      RETURNING *
    `;
        const result = await database_1.default.query(insertQuery, [
            user.user_id,
            hotelIdValidation.parsed,
            roomIdValidation.parsed,
            check_in_date,
            check_out_date,
            guestCount,
            roomCount,
            totalPrice,
        ]);
        // Add currency info to price
        const booking = {
            ...result.rows[0],
            total_price_info: (0, currency_1.addCurrencyInfo)(parseFloat(result.rows[0].total_price)),
        };
        // Create notification for booking confirmation
        try {
            await (0, notifications_1.notifyBookingConfirmation)(user.user_id, result.rows[0].booking_id, hotelCheck.rows[0].hotel_name);
        }
        catch (notifError) {
            // Don't fail the booking if notification fails
            console.warn("Failed to create booking notification:", notifError?.message || "Unknown error");
        }
        res.status(201).json({
            success: true,
            message: "Booking created successfully",
            data: booking,
            currency: currency_1.DEFAULT_CURRENCY,
        });
    }
    catch (err) {
        console.error("Error creating booking:", err?.message || "Unknown error");
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
        // Validate pagination params
        const paginationValidation = (0, validation_1.validatePaginationParams)(limit, offset);
        if (!paginationValidation.valid) {
            return res.status(400).json({
                success: false,
                error: paginationValidation.error
            });
        }
        // Validate status if provided
        if (status !== undefined) {
            const statusValidation = (0, validation_1.validateEnum)(status, ['pending', 'confirmed', 'cancelled', 'completed'], 'Status');
            if (!statusValidation.valid) {
                return res.status(400).json({
                    success: false,
                    error: statusValidation.error
                });
            }
        }
        let query = `
      SELECT 
        b.booking_id,
        b.user_id,
        b.hotel_id,
        b.room_id,
        b.check_in_date,
        b.check_out_date,
        b.number_of_guests,
        b.number_of_rooms,
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
        // Add currency info to price fields
        const bookingsWithCurrency = result.rows.map((booking) => ({
            ...booking,
            total_price_info: (0, currency_1.addCurrencyInfo)(parseFloat(booking.total_price)),
            price_per_night_info: booking.price_per_night ? (0, currency_1.addCurrencyInfo)(parseFloat(booking.price_per_night)) : null,
        }));
        res.json({
            success: true,
            data: bookingsWithCurrency,
            currency: currency_1.DEFAULT_CURRENCY,
            pagination: {
                total,
                limit: limitValue,
                offset: offsetValue,
                hasMore: offsetValue + limitValue < total,
            },
        });
    }
    catch (err) {
        console.error("Error fetching user bookings:", err?.message || "Unknown error");
        res.status(500).json({
            success: false,
            error: "Failed to fetch bookings",
            details: err.message,
        });
    }
};
exports.getUserBookings = getUserBookings;
// GET ALL BOOKINGS (Admin only - filtered by hotel assignment for branch admins)
const getAllBookings = async (req, res) => {
    try {
        const user = req.user;
        const { user_id, hotel_id, status, payment_status, limit, offset } = req.query;
        // Validate pagination params
        const paginationValidation = (0, validation_1.validatePaginationParams)(limit, offset);
        if (!paginationValidation.valid) {
            return res.status(400).json({
                success: false,
                error: paginationValidation.error
            });
        }
        // Validate user_id if provided
        if (user_id !== undefined) {
            const userIdValidation = (0, validation_1.validatePositiveInteger)(user_id, "User ID");
            if (!userIdValidation.valid) {
                return res.status(400).json({
                    success: false,
                    error: userIdValidation.error
                });
            }
        }
        // Validate hotel_id if provided
        if (hotel_id !== undefined) {
            const hotelIdValidation = (0, validation_1.validatePositiveInteger)(hotel_id, "Hotel ID");
            if (!hotelIdValidation.valid) {
                return res.status(400).json({
                    success: false,
                    error: hotelIdValidation.error
                });
            }
        }
        // Validate status if provided
        if (status !== undefined) {
            const statusValidation = (0, validation_1.validateEnum)(status, ['pending', 'confirmed', 'cancelled', 'completed'], 'Status');
            if (!statusValidation.valid) {
                return res.status(400).json({
                    success: false,
                    error: statusValidation.error
                });
            }
        }
        // Validate payment_status if provided
        if (payment_status !== undefined) {
            const paymentStatusValidation = (0, validation_1.validateEnum)(payment_status, ['pending', 'paid', 'failed', 'refunded'], 'Payment status');
            if (!paymentStatusValidation.valid) {
                return res.status(400).json({
                    success: false,
                    error: paymentStatusValidation.error
                });
            }
        }
        let query = `
      SELECT 
        b.booking_id,
        b.user_id,
        b.hotel_id,
        b.room_id,
        b.check_in_date,
        b.check_out_date,
        b.number_of_guests,
        b.number_of_rooms,
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
        // Filter by hotel assignment for branch admins
        if (user && user.role === "branch_admin") {
            if (!user.assigned_hotel_ids || user.assigned_hotel_ids.length === 0) {
                // Branch admin with no hotels assigned - return empty result
                return res.json({
                    success: true,
                    data: [],
                    message: "No hotels assigned to your account. Please contact a super admin.",
                    currency: currency_1.DEFAULT_CURRENCY,
                    pagination: {
                        total: 0,
                        limit: paginationValidation.limitValue,
                        offset: paginationValidation.offsetValue,
                        hasMore: false
                    }
                });
            }
            conditions.push(`b.hotel_id = ANY($${paramCount}::int[])`);
            params.push(user.assigned_hotel_ids);
            paramCount++;
        }
        // Filter by user
        if (user_id !== undefined) {
            const userIdValidation = (0, validation_1.validatePositiveInteger)(user_id, "User ID");
            conditions.push(`b.user_id = $${paramCount}`);
            params.push(userIdValidation.parsed);
            paramCount++;
        }
        // Filter by hotel (if provided, and not already filtered by branch admin)
        if (hotel_id !== undefined) {
            // For branch admins, ensure the requested hotel is in their assigned hotels
            if (user && user.role === "branch_admin") {
                const hotelIdValidation = (0, validation_1.validatePositiveInteger)(hotel_id, "Hotel ID");
                if (!user.assigned_hotel_ids || !user.assigned_hotel_ids.includes(hotelIdValidation.parsed)) {
                    return res.status(403).json({
                        success: false,
                        error: "Access Denied: You do not have access to this hotel"
                    });
                }
            }
            const hotelIdValidation = (0, validation_1.validatePositiveInteger)(hotel_id, "Hotel ID");
            conditions.push(`b.hotel_id = $${paramCount}`);
            params.push(hotelIdValidation.parsed);
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
        // Add currency info to price fields
        const bookingsWithCurrency = result.rows.map((booking) => ({
            ...booking,
            total_price_info: (0, currency_1.addCurrencyInfo)(parseFloat(booking.total_price)),
            price_per_night_info: booking.price_per_night ? (0, currency_1.addCurrencyInfo)(parseFloat(booking.price_per_night)) : null,
        }));
        res.json({
            success: true,
            data: bookingsWithCurrency,
            currency: currency_1.DEFAULT_CURRENCY,
            pagination: {
                total,
                limit: limitValue,
                offset: offsetValue,
                hasMore: offsetValue + limitValue < total,
            },
        });
    }
    catch (err) {
        console.error("Error fetching bookings:", err?.message || "Unknown error");
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
        // Validate booking ID
        const bookingIdValidation = (0, validation_1.validatePositiveInteger)(id, "Booking ID");
        if (!bookingIdValidation.valid) {
            return res.status(400).json({
                success: false,
                error: bookingIdValidation.error
            });
        }
        const query = `
      SELECT 
        b.booking_id,
        b.user_id,
        b.hotel_id,
        b.room_id,
        b.check_in_date,
        b.check_out_date,
        b.number_of_guests,
        b.number_of_rooms,
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
        const result = await database_1.default.query(query, [bookingIdValidation.parsed]);
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
        console.error("Error fetching booking:", err?.message || "Unknown error");
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
        // Validate booking ID
        const bookingIdValidation = (0, validation_1.validatePositiveInteger)(id, "Booking ID");
        if (!bookingIdValidation.valid) {
            return res.status(400).json({
                success: false,
                error: bookingIdValidation.error
            });
        }
        // Validate status if provided
        if (status !== undefined) {
            const statusValidation = (0, validation_1.validateEnum)(status, ['pending', 'confirmed', 'cancelled', 'completed'], 'Status');
            if (!statusValidation.valid) {
                return res.status(400).json({
                    success: false,
                    error: statusValidation.error
                });
            }
        }
        // Validate payment_status if provided
        if (payment_status !== undefined) {
            const paymentStatusValidation = (0, validation_1.validateEnum)(payment_status, ['pending', 'paid', 'failed', 'refunded'], 'Payment status');
            if (!paymentStatusValidation.valid) {
                return res.status(400).json({
                    success: false,
                    error: paymentStatusValidation.error
                });
            }
        }
        // Check if booking exists
        const checkQuery = "SELECT * FROM Bookings WHERE booking_id = $1";
        const checkResult = await database_1.default.query(checkQuery, [bookingIdValidation.parsed]);
        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Booking not found",
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
        params.push(bookingIdValidation.parsed);
        const updateQuery = `
      UPDATE Bookings
      SET ${updates.join(", ")}
      WHERE booking_id = $${paramCount}
      RETURNING *
    `;
        const result = await database_1.default.query(updateQuery, params);
        const updatedBooking = result.rows[0];
        // Create notification for booking update
        try {
            const hotelQuery = "SELECT hotel_name FROM Hotels WHERE hotel_id = $1";
            const hotelResult = await database_1.default.query(hotelQuery, [updatedBooking.hotel_id]);
            const hotelName = hotelResult.rows[0]?.hotel_name || "Hotel";
            await (0, notifications_1.notifyBookingUpdate)(updatedBooking.user_id, updatedBooking.booking_id, hotelName, updatedBooking.status);
        }
        catch (notifError) {
            console.warn("Failed to create booking update notification:", notifError?.message || "Unknown error");
        }
        res.json({
            success: true,
            message: "Booking status updated successfully",
            data: updatedBooking,
        });
    }
    catch (err) {
        console.error("Error updating booking status:", err?.message || "Unknown error");
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
        const cancelledBooking = result.rows[0];
        // Create notification for booking cancellation
        try {
            const hotelQuery = "SELECT hotel_name FROM Hotels WHERE hotel_id = $1";
            const hotelResult = await database_1.default.query(hotelQuery, [cancelledBooking.hotel_id]);
            const hotelName = hotelResult.rows[0]?.hotel_name || "Hotel";
            await (0, notifications_1.notifyBookingCancellation)(cancelledBooking.user_id, cancelledBooking.booking_id, hotelName);
        }
        catch (notifError) {
            console.warn("Failed to create booking cancellation notification:", notifError?.message || "Unknown error");
        }
        res.json({
            success: true,
            message: "Booking cancelled successfully",
            data: cancelledBooking,
        });
    }
    catch (err) {
        console.error("Error cancelling booking:", err?.message || "Unknown error");
        res.status(500).json({
            success: false,
            error: "Failed to cancel booking",
            details: err.message,
        });
    }
};
exports.cancelBooking = cancelBooking;
// MODIFY BOOKING (Customer or Admin)
const modifyBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        const { check_in_date, check_out_date, number_of_guests, number_of_rooms, room_id } = req.body;
        // Validate booking ID
        const bookingIdValidation = (0, validation_1.validatePositiveInteger)(id, "Booking ID");
        if (!bookingIdValidation.valid) {
            return res.status(400).json({
                success: false,
                error: bookingIdValidation.error
            });
        }
        const parsedBookingId = bookingIdValidation.parsed;
        // Check if booking exists
        const checkQuery = "SELECT * FROM Bookings WHERE booking_id = $1";
        const checkResult = await database_1.default.query(checkQuery, [parsedBookingId]);
        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Booking not found",
            });
        }
        const booking = checkResult.rows[0];
        // Check permissions (customer can only modify their own bookings, admin can modify any)
        if (user.role !== "admin" && booking.user_id !== user.user_id) {
            return res.status(403).json({
                success: false,
                error: "Access denied. You can only modify your own bookings.",
            });
        }
        // Check if booking can be modified
        if (booking.status === "cancelled") {
            return res.status(400).json({
                success: false,
                error: "Cannot modify a cancelled booking",
            });
        }
        if (booking.status === "completed") {
            return res.status(400).json({
                success: false,
                error: "Cannot modify a completed booking",
            });
        }
        // Validate dates if provided
        const newCheckIn = check_in_date || booking.check_in_date;
        const newCheckOut = check_out_date || booking.check_out_date;
        let checkInDate;
        let checkOutDate;
        if (check_in_date || check_out_date) {
            const dateValidation = (0, validation_1.validateDateRange)(newCheckIn, newCheckOut, false, 365);
            if (!dateValidation.valid) {
                return res.status(400).json({
                    success: false,
                    error: dateValidation.error,
                });
            }
            checkInDate = dateValidation.checkInDate;
            checkOutDate = dateValidation.checkOutDate;
        }
        else {
            checkInDate = new Date(booking.check_in_date);
            checkOutDate = new Date(booking.check_out_date);
        }
        // Validate number_of_guests if provided
        let newGuestCount = booking.number_of_guests;
        if (number_of_guests !== undefined) {
            const guestValidation = (0, validation_1.validatePositiveInteger)(number_of_guests, "Number of guests");
            if (!guestValidation.valid) {
                return res.status(400).json({
                    success: false,
                    error: guestValidation.error
                });
            }
            newGuestCount = guestValidation.parsed;
            if (newGuestCount < 1 || newGuestCount > 20) {
                return res.status(400).json({
                    success: false,
                    error: "Number of guests must be between 1 and 20",
                });
            }
        }
        // Validate number_of_rooms if provided
        let newRoomCount = booking.number_of_rooms;
        if (number_of_rooms !== undefined) {
            const roomCountValidation = (0, validation_1.validatePositiveInteger)(number_of_rooms, "Number of rooms");
            if (!roomCountValidation.valid) {
                return res.status(400).json({
                    success: false,
                    error: roomCountValidation.error
                });
            }
            newRoomCount = roomCountValidation.parsed;
            if (newRoomCount < 1 || newRoomCount > 10) {
                return res.status(400).json({
                    success: false,
                    error: "Number of rooms must be between 1 and 10",
                });
            }
        }
        // Determine which room to use
        let targetRoomId = booking.room_id;
        let targetHotelId = booking.hotel_id;
        if (room_id !== undefined) {
            const roomIdValidation = (0, validation_1.validatePositiveInteger)(room_id, "Room ID");
            if (!roomIdValidation.valid) {
                return res.status(400).json({
                    success: false,
                    error: roomIdValidation.error
                });
            }
            targetRoomId = roomIdValidation.parsed;
            // Check if new room exists
            const roomCheck = await database_1.default.query("SELECT * FROM Rooms WHERE room_id = $1", [targetRoomId]);
            if (roomCheck.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: "Room not found",
                });
            }
            const newRoom = roomCheck.rows[0];
            targetHotelId = newRoom.hotel_id;
            // Check if new room is available
            if (newRoom.availability_status !== "available") {
                return res.status(400).json({
                    success: false,
                    error: `Room is currently ${newRoom.availability_status}`,
                });
            }
            // Check if new room has availability for the dates
            const conflictingBookings = await database_1.default.query(`SELECT COALESCE(SUM(number_of_rooms), 0) as total_booked_rooms
         FROM Bookings
         WHERE room_id = $1
           AND booking_id != $2
           AND status IN ('pending', 'confirmed')
           AND (
             (check_in_date <= $3 AND check_out_date > $3)
             OR (check_in_date < $4 AND check_out_date >= $4)
             OR (check_in_date >= $3 AND check_out_date <= $4)
           )`, [targetRoomId, parsedBookingId, newCheckIn, newCheckOut]);
            const totalBookedRooms = parseInt(conflictingBookings.rows[0].total_booked_rooms || "0");
            if (totalBookedRooms + newRoomCount > 10) {
                return res.status(400).json({
                    success: false,
                    error: `Only ${10 - totalBookedRooms} room(s) available for the selected dates. You requested ${newRoomCount} room(s).`,
                });
            }
        }
        else {
            // If room not changed, check availability for existing room with new dates
            if (check_in_date || check_out_date) {
                const conflictingBookings = await database_1.default.query(`SELECT COALESCE(SUM(number_of_rooms), 0) as total_booked_rooms
           FROM Bookings
           WHERE room_id = $1
             AND booking_id != $2
             AND status IN ('pending', 'confirmed')
             AND (
               (check_in_date <= $3 AND check_out_date > $3)
               OR (check_in_date < $4 AND check_out_date >= $4)
               OR (check_in_date >= $3 AND check_out_date <= $4)
             )`, [targetRoomId, parsedBookingId, newCheckIn, newCheckOut]);
                const totalBookedRooms = parseInt(conflictingBookings.rows[0].total_booked_rooms || "0");
                if (totalBookedRooms + newRoomCount > 10) {
                    return res.status(400).json({
                        success: false,
                        error: `Only ${10 - totalBookedRooms} room(s) available for the selected dates. You requested ${newRoomCount} room(s).`,
                    });
                }
            }
        }
        // Get room price for new total calculation
        const roomQuery = "SELECT price_per_night FROM Rooms WHERE room_id = $1";
        const roomResult = await database_1.default.query(roomQuery, [targetRoomId]);
        const room = roomResult.rows[0];
        // Calculate new total price
        const { totalPrice: pricePerRoom } = calculateBookingPrice(checkInDate, checkOutDate, parseFloat(room.price_per_night));
        const newTotalPrice = pricePerRoom * newRoomCount;
        // Build update query
        const updates = [];
        const params = [];
        let paramCount = 1;
        if (check_in_date) {
            updates.push(`check_in_date = $${paramCount++}`);
            params.push(newCheckIn);
        }
        if (check_out_date) {
            updates.push(`check_out_date = $${paramCount++}`);
            params.push(newCheckOut);
        }
        if (number_of_guests !== undefined) {
            updates.push(`number_of_guests = $${paramCount++}`);
            params.push(newGuestCount);
        }
        if (number_of_rooms !== undefined) {
            updates.push(`number_of_rooms = $${paramCount++}`);
            params.push(newRoomCount);
        }
        if (room_id !== undefined) {
            updates.push(`room_id = $${paramCount++}`);
            params.push(targetRoomId);
            updates.push(`hotel_id = $${paramCount++}`);
            params.push(targetHotelId);
        }
        // Always update total price if dates, room, or room count changed
        if (check_in_date || check_out_date || room_id !== undefined || number_of_rooms !== undefined) {
            updates.push(`total_price = $${paramCount++}`);
            params.push(newTotalPrice);
        }
        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                error: "No fields to update",
            });
        }
        updates.push(`updated_at = NOW()`);
        params.push(parsedBookingId);
        const updateQuery = `
      UPDATE Bookings
      SET ${updates.join(", ")}
      WHERE booking_id = $${paramCount}
      RETURNING *
    `;
        const result = await database_1.default.query(updateQuery, params);
        const updatedBooking = result.rows[0];
        // Add currency info
        const bookingWithCurrency = {
            ...updatedBooking,
            total_price_info: (0, currency_1.addCurrencyInfo)(parseFloat(updatedBooking.total_price)),
        };
        // Create notification for booking update
        try {
            const hotelQuery = "SELECT hotel_name FROM Hotels WHERE hotel_id = $1";
            const hotelResult = await database_1.default.query(hotelQuery, [targetHotelId]);
            const hotelName = hotelResult.rows[0]?.hotel_name || "Hotel";
            await (0, notifications_1.notifyBookingUpdate)(updatedBooking.user_id, updatedBooking.booking_id, hotelName, updatedBooking.status);
        }
        catch (notifError) {
            console.warn("Failed to create booking modification notification:", notifError?.message || "Unknown error");
        }
        res.json({
            success: true,
            message: "Booking modified successfully",
            data: bookingWithCurrency,
            currency: currency_1.DEFAULT_CURRENCY,
        });
    }
    catch (err) {
        console.error("Error modifying booking:", err?.message || "Unknown error");
        res.status(500).json({
            success: false,
            error: "Failed to modify booking",
            details: err.message,
        });
    }
};
exports.modifyBooking = modifyBooking;
// GET BOOKINGS BY HOTEL (Admin only - with hotel access check)
const getBookingsByHotel = async (req, res) => {
    try {
        const user = req.user;
        const { hotelId } = req.params;
        const { status, payment_status, limit, offset } = req.query;
        // Validate hotel ID
        const hotelIdValidation = (0, validation_1.validatePositiveInteger)(hotelId, "Hotel ID");
        if (!hotelIdValidation.valid) {
            return res.status(400).json({
                success: false,
                error: hotelIdValidation.error
            });
        }
        // Check hotel access (pass cached assigned_hotel_ids for performance)
        const hasAccess = await (0, userMiddleware_1.checkHotelAccess)(user.user_id, user.role, hotelIdValidation.parsed, user.assigned_hotel_ids);
        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                error: "Access Denied: You do not have access to this hotel"
            });
        }
        // Validate pagination params
        const paginationValidation = (0, validation_1.validatePaginationParams)(limit, offset);
        if (!paginationValidation.valid) {
            return res.status(400).json({
                success: false,
                error: paginationValidation.error
            });
        }
        // Validate status if provided
        if (status !== undefined) {
            const statusValidation = (0, validation_1.validateEnum)(status, ['pending', 'confirmed', 'cancelled', 'completed'], 'Status');
            if (!statusValidation.valid) {
                return res.status(400).json({
                    success: false,
                    error: statusValidation.error
                });
            }
        }
        // Validate payment_status if provided
        if (payment_status !== undefined) {
            const paymentStatusValidation = (0, validation_1.validateEnum)(payment_status, ['pending', 'paid', 'failed', 'refunded'], 'Payment status');
            if (!paymentStatusValidation.valid) {
                return res.status(400).json({
                    success: false,
                    error: paymentStatusValidation.error
                });
            }
        }
        // Check if hotel exists
        const hotelCheck = await database_1.default.query("SELECT * FROM Hotels WHERE hotel_id = $1", [hotelIdValidation.parsed]);
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
        b.number_of_guests,
        b.number_of_rooms,
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
        const params = [hotelIdValidation.parsed];
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
        const limitValue = paginationValidation.limitValue;
        const offsetValue = paginationValidation.offsetValue;
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
        console.error("Error fetching hotel bookings:", err?.message || "Unknown error");
        res.status(500).json({
            success: false,
            error: "Failed to fetch bookings",
            details: err.message,
        });
    }
};
exports.getBookingsByHotel = getBookingsByHotel;
