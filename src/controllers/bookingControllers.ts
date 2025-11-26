import { Request, Response } from "express";
import pool from "../config/database";
import { Bookings, booking_status, payment_status } from "../types/booking.types";
import { DEFAULT_CURRENCY, addCurrencyInfo } from "../utils/currency";
import { notifyBookingConfirmation, notifyBookingUpdate, notifyBookingCancellation } from "../utils/notifications";

// Helper function to calculate nights and total price
const calculateBookingPrice = (checkIn: Date, checkOut: Date, pricePerNight: number) => {
  const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
  const totalPrice = pricePerNight * nights;
  return { nights, totalPrice };
};

// Helper function to validate dates
const validateDates = (checkIn: string, checkOut: string): { valid: boolean; error?: string } => {
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
export const createBooking = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { hotel_id, room_id, check_in_date, check_out_date, number_of_guests, number_of_rooms } = req.body;

    // Validation
    if (!hotel_id || !room_id || !check_in_date || !check_out_date) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: hotel_id, room_id, check_in_date, check_out_date",
      });
    }

    // Validate and set default for number_of_guests
    const guestCount = number_of_guests !== undefined ? parseInt(number_of_guests) : 1;
    if (isNaN(guestCount) || guestCount < 1 || guestCount > 20) {
      return res.status(400).json({
        success: false,
        error: "number_of_guests must be between 1 and 20",
      });
    }

    // Validate and set default for number_of_rooms
    const roomCount = number_of_rooms !== undefined ? parseInt(number_of_rooms) : 1;
    if (isNaN(roomCount) || roomCount < 1 || roomCount > 10) {
      return res.status(400).json({
        success: false,
        error: "number_of_rooms must be between 1 and 10",
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
    const hotelCheck = await pool.query("SELECT * FROM Hotels WHERE hotel_id = $1", [hotel_id]);
    if (hotelCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Hotel not found",
      });
    }

    // Check if room exists and belongs to hotel
    const roomCheck = await pool.query(
      "SELECT * FROM Rooms WHERE room_id = $1 AND hotel_id = $2",
      [room_id, hotel_id]
    );
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
    const checkInDate = new Date(check_in_date);
    const checkOutDate = new Date(check_out_date);

    const conflictingBookings = await pool.query(
      `SELECT COALESCE(SUM(number_of_rooms), 0) as total_booked_rooms
       FROM Bookings
       WHERE room_id = $1
         AND status IN ('pending', 'confirmed')
         AND (
           (check_in_date <= $2 AND check_out_date > $2)
           OR (check_in_date < $3 AND check_out_date >= $3)
           OR (check_in_date >= $2 AND check_out_date <= $3)
         )`,
      [room_id, check_in_date, check_out_date]
    );

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

    const result = await pool.query(insertQuery, [
      user.user_id,
      hotel_id,
      room_id,
      check_in_date,
      check_out_date,
      guestCount,
      roomCount,
      totalPrice,
    ]);

    // Add currency info to price
    const booking = {
      ...result.rows[0],
      total_price_info: addCurrencyInfo(parseFloat(result.rows[0].total_price)),
    };

    // Create notification for booking confirmation
    try {
      await notifyBookingConfirmation(
        user.user_id,
        result.rows[0].booking_id,
        hotelCheck.rows[0].hotel_name
      );
    } catch (notifError) {
      // Don't fail the booking if notification fails
      console.warn("Failed to create booking notification:", notifError);
    }

    res.status(201).json({
      success: true,
      message: "Booking created successfully",
      data: booking,
      currency: DEFAULT_CURRENCY,
    });
  } catch (err: any) {
    console.error("Error creating booking:", err);
    res.status(500).json({
      success: false,
      error: "Failed to create booking",
      details: err.message,
    });
  }
};

// GET USER'S BOOKINGS (Customer - authenticated)
export const getUserBookings = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { status, limit, offset } = req.query;

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

    const params: any[] = [user.user_id];
    let paramCount = 2;

    // Filter by status
    if (status) {
      query += ` AND b.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    query += ` ORDER BY b.created_at DESC`;

    // Add pagination
    const limitValue = limit ? parseInt(limit as string) : 20;
    const offsetValue = offset ? parseInt(offset as string) : 0;

    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limitValue, offsetValue);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = "SELECT COUNT(*) FROM Bookings WHERE user_id = $1";
    const countParams: any[] = [user.user_id];
    if (status) {
      countQuery += ` AND status = $2`;
      countParams.push(status);
    }
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    // Add currency info to price fields
    const bookingsWithCurrency = result.rows.map((booking: any) => ({
      ...booking,
      total_price_info: addCurrencyInfo(parseFloat(booking.total_price)),
      price_per_night_info: booking.price_per_night ? addCurrencyInfo(parseFloat(booking.price_per_night)) : null,
    }));

    res.json({
      success: true,
      data: bookingsWithCurrency,
      currency: DEFAULT_CURRENCY,
      pagination: {
        total,
        limit: limitValue,
        offset: offsetValue,
        hasMore: offsetValue + limitValue < total,
      },
    });
  } catch (err: any) {
    console.error("Error fetching user bookings:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch bookings",
      details: err.message,
    });
  }
};

// GET ALL BOOKINGS (Admin only)
export const getAllBookings = async (req: Request, res: Response) => {
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

    const conditions: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    // Filter by user
    if (user_id) {
      conditions.push(`b.user_id = $${paramCount}`);
      params.push(parseInt(user_id as string));
      paramCount++;
    }

    // Filter by hotel
    if (hotel_id) {
      conditions.push(`b.hotel_id = $${paramCount}`);
      params.push(parseInt(hotel_id as string));
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
    const limitValue = limit ? parseInt(limit as string) : 20;
    const offsetValue = offset ? parseInt(offset as string) : 0;

    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limitValue, offsetValue);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = "SELECT COUNT(*) FROM Bookings b";
    if (conditions.length > 0) {
      countQuery += ` WHERE ${conditions.join(" AND ")}`;
    }
    const countParams = params.slice(0, -2);
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    // Add currency info to price fields
    const bookingsWithCurrency = result.rows.map((booking: any) => ({
      ...booking,
      total_price_info: addCurrencyInfo(parseFloat(booking.total_price)),
      price_per_night_info: booking.price_per_night ? addCurrencyInfo(parseFloat(booking.price_per_night)) : null,
    }));

    res.json({
      success: true,
      data: bookingsWithCurrency,
      currency: DEFAULT_CURRENCY,
      pagination: {
        total,
        limit: limitValue,
        offset: offsetValue,
        hasMore: offsetValue + limitValue < total,
      },
    });
  } catch (err: any) {
    console.error("Error fetching bookings:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch bookings",
      details: err.message,
    });
  }
};

// GET BOOKING BY ID
export const getBookingById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

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

    const result = await pool.query(query, [id]);

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
  } catch (err: any) {
    console.error("Error fetching booking:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch booking",
      details: err.message,
    });
  }
};

// UPDATE BOOKING STATUS (Admin only)
export const updateBookingStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, payment_status } = req.body;

    // Check if booking exists
    const checkQuery = "SELECT * FROM Bookings WHERE booking_id = $1";
    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Booking not found",
      });
    }

    // Validate status if provided
    const validBookingStatuses: booking_status[] = ["pending", "confirmed", "cancelled", "completed"];
    if (status && !validBookingStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: "Invalid status. Must be: pending, confirmed, cancelled, or completed",
      });
    }

    // Validate payment status if provided
    const validPaymentStatuses: payment_status[] = ["pending", "paid", "failed"];
    if (payment_status && !validPaymentStatuses.includes(payment_status)) {
      return res.status(400).json({
        success: false,
        error: "Invalid payment_status. Must be: pending, paid, or failed",
      });
    }

    // Build update query
    const updates: string[] = [];
    const params: any[] = [];
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

    const result = await pool.query(updateQuery, params);
    const updatedBooking = result.rows[0];

    // Create notification for booking update
    try {
      const hotelQuery = "SELECT hotel_name FROM Hotels WHERE hotel_id = $1";
      const hotelResult = await pool.query(hotelQuery, [updatedBooking.hotel_id]);
      const hotelName = hotelResult.rows[0]?.hotel_name || "Hotel";
      
      await notifyBookingUpdate(
        updatedBooking.user_id,
        updatedBooking.booking_id,
        hotelName,
        updatedBooking.status
      );
    } catch (notifError) {
      console.warn("Failed to create booking update notification:", notifError);
    }

    res.json({
      success: true,
      message: "Booking status updated successfully",
      data: updatedBooking,
    });
  } catch (err: any) {
    console.error("Error updating booking status:", err);
    res.status(500).json({
      success: false,
      error: "Failed to update booking status",
      details: err.message,
    });
  }
};

// CANCEL BOOKING (Customer or Admin)
export const cancelBooking = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    // Check if booking exists
    const checkQuery = "SELECT * FROM Bookings WHERE booking_id = $1";
    const checkResult = await pool.query(checkQuery, [id]);

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

    const result = await pool.query(updateQuery, [id]);
    const cancelledBooking = result.rows[0];

    // Create notification for booking cancellation
    try {
      const hotelQuery = "SELECT hotel_name FROM Hotels WHERE hotel_id = $1";
      const hotelResult = await pool.query(hotelQuery, [cancelledBooking.hotel_id]);
      const hotelName = hotelResult.rows[0]?.hotel_name || "Hotel";
      
      await notifyBookingCancellation(
        cancelledBooking.user_id,
        cancelledBooking.booking_id,
        hotelName
      );
    } catch (notifError) {
      console.warn("Failed to create booking cancellation notification:", notifError);
    }

    res.json({
      success: true,
      message: "Booking cancelled successfully",
      data: cancelledBooking,
    });
  } catch (err: any) {
    console.error("Error cancelling booking:", err);
    res.status(500).json({
      success: false,
      error: "Failed to cancel booking",
      details: err.message,
    });
  }
};

// GET BOOKINGS BY HOTEL (Admin only)
export const getBookingsByHotel = async (req: Request, res: Response) => {
  try {
    const { hotelId } = req.params;
    const { status, payment_status, limit, offset } = req.query;

    // Check if hotel exists
    const hotelCheck = await pool.query("SELECT * FROM Hotels WHERE hotel_id = $1", [hotelId]);
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

    const params: any[] = [hotelId];
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

    const limitValue = limit ? parseInt(limit as string) : 20;
    const offsetValue = offset ? parseInt(offset as string) : 0;

    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limitValue, offsetValue);

    const result = await pool.query(query, params);

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
  } catch (err: any) {
    console.error("Error fetching hotel bookings:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch bookings",
      details: err.message,
    });
  }
};

