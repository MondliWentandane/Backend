"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkRoomAvailability = exports.deleteRoomPhoto = exports.addRoomPhoto = exports.updateRoomAvailability = exports.deleteRoom = exports.updateRoom = exports.createRoom = exports.getRoomById = exports.getRoomsByHotel = exports.getAllRooms = void 0;
const database_1 = __importDefault(require("../config/database"));
// GET ALL ROOMS (Public - with optional filters)
const getAllRooms = async (req, res) => {
    try {
        const { hotel_id, status, minPrice, maxPrice, roomType, limit, offset } = req.query;
        let query = `
      SELECT 
        r.room_id,
        r.hotel_id,
        r.room_type,
        r.price_per_night,
        r.availability_status,
        r.created_at,
        r.updated_at,
        h.hotel_name,
        h.city,
        h.country,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'photo_id', rp.photo_id,
              'photo_url', rp.photo_url
            )
          ) FILTER (WHERE rp.photo_id IS NOT NULL),
          '[]'::json
        ) as photos
      FROM Rooms r
      INNER JOIN Hotels h ON r.hotel_id = h.hotel_id
      LEFT JOIN RoomPhotos rp ON r.room_id = rp.room_id
    `;
        const conditions = [];
        const params = [];
        let paramCount = 1;
        // Filter by hotel
        if (hotel_id) {
            conditions.push(`r.hotel_id = $${paramCount}`);
            params.push(parseInt(hotel_id));
            paramCount++;
        }
        // Filter by availability status
        if (status) {
            conditions.push(`r.availability_status = $${paramCount}`);
            params.push(status);
            paramCount++;
        }
        // Filter by room type
        if (roomType) {
            conditions.push(`r.room_type ILIKE $${paramCount}`);
            params.push(`%${roomType}%`);
            paramCount++;
        }
        // Filter by minimum price
        if (minPrice) {
            conditions.push(`r.price_per_night >= $${paramCount}`);
            params.push(parseFloat(minPrice));
            paramCount++;
        }
        // Filter by maximum price
        if (maxPrice) {
            conditions.push(`r.price_per_night <= $${paramCount}`);
            params.push(parseFloat(maxPrice));
            paramCount++;
        }
        if (conditions.length > 0) {
            query += ` WHERE ${conditions.join(" AND ")}`;
        }
        query += ` GROUP BY r.room_id, h.hotel_name, h.city, h.country`;
        // Add pagination
        const limitValue = limit ? parseInt(limit) : 20;
        const offsetValue = offset ? parseInt(offset) : 0;
        query += ` ORDER BY r.price_per_night ASC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limitValue, offsetValue);
        const result = await database_1.default.query(query, params);
        // Get total count for pagination
        let countQuery = "SELECT COUNT(*) FROM Rooms r";
        if (conditions.length > 0) {
            countQuery += ` WHERE ${conditions.join(" AND ")}`;
        }
        const countParams = params.slice(0, -2); // Remove limit and offset
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
        console.error("Error fetching rooms:", err);
        res.status(500).json({
            success: false,
            error: "Failed to fetch rooms",
            details: err.message,
        });
    }
};
exports.getAllRooms = getAllRooms;
// GET ROOMS BY HOTEL ID (Public)
const getRoomsByHotel = async (req, res) => {
    try {
        const { hotelId } = req.params;
        const { status, minPrice, maxPrice, roomType } = req.query;
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
        r.room_id,
        r.hotel_id,
        r.room_type,
        r.price_per_night,
        r.availability_status,
        r.created_at,
        r.updated_at,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'photo_id', rp.photo_id,
              'photo_url', rp.photo_url
            )
          ) FILTER (WHERE rp.photo_id IS NOT NULL),
          '[]'::json
        ) as photos
      FROM Rooms r
      LEFT JOIN RoomPhotos rp ON r.room_id = rp.room_id
      WHERE r.hotel_id = $1
    `;
        const conditions = [];
        const params = [hotelId];
        let paramCount = 2;
        // Filter by availability status
        if (status) {
            conditions.push(`r.availability_status = $${paramCount}`);
            params.push(status);
            paramCount++;
        }
        // Filter by room type
        if (roomType) {
            conditions.push(`r.room_type ILIKE $${paramCount}`);
            params.push(`%${roomType}%`);
            paramCount++;
        }
        // Filter by minimum price
        if (minPrice) {
            conditions.push(`r.price_per_night >= $${paramCount}`);
            params.push(parseFloat(minPrice));
            paramCount++;
        }
        // Filter by maximum price
        if (maxPrice) {
            conditions.push(`r.price_per_night <= $${paramCount}`);
            params.push(parseFloat(maxPrice));
            paramCount++;
        }
        if (conditions.length > 0) {
            query += ` AND ${conditions.join(" AND ")}`;
        }
        query += ` GROUP BY r.room_id ORDER BY r.price_per_night ASC`;
        const result = await database_1.default.query(query, params);
        res.json({
            success: true,
            data: result.rows,
            hotel: {
                hotel_id: hotelCheck.rows[0].hotel_id,
                hotel_name: hotelCheck.rows[0].hotel_name,
                city: hotelCheck.rows[0].city,
                country: hotelCheck.rows[0].country,
            },
        });
    }
    catch (err) {
        console.error("Error fetching rooms by hotel:", err);
        res.status(500).json({
            success: false,
            error: "Failed to fetch rooms",
            details: err.message,
        });
    }
};
exports.getRoomsByHotel = getRoomsByHotel;
// GET ROOM BY ID (Public)
const getRoomById = async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
      SELECT 
        r.room_id,
        r.hotel_id,
        r.room_type,
        r.price_per_night,
        r.availability_status,
        r.created_at,
        r.updated_at,
        h.hotel_name,
        h.address,
        h.city,
        h.country,
        h.star_rating,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'photo_id', rp.photo_id,
              'photo_url', rp.photo_url
            )
          ) FILTER (WHERE rp.photo_id IS NOT NULL),
          '[]'::json
        ) as photos
      FROM Rooms r
      INNER JOIN Hotels h ON r.hotel_id = h.hotel_id
      LEFT JOIN RoomPhotos rp ON r.room_id = rp.room_id
      WHERE r.room_id = $1
      GROUP BY r.room_id, h.hotel_name, h.address, h.city, h.country, h.star_rating
    `;
        const result = await database_1.default.query(query, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Room not found",
            });
        }
        res.json({
            success: true,
            data: result.rows[0],
        });
    }
    catch (err) {
        console.error("Error fetching room:", err);
        res.status(500).json({
            success: false,
            error: "Failed to fetch room",
            details: err.message,
        });
    }
};
exports.getRoomById = getRoomById;
// CREATE ROOM (Admin only)
const createRoom = async (req, res) => {
    try {
        const { hotel_id, room_type, price_per_night, availability_status } = req.body;
        // Validation
        if (!hotel_id || !room_type || price_per_night === undefined) {
            return res.status(400).json({
                success: false,
                error: "Missing required fields: hotel_id, room_type, price_per_night",
            });
        }
        // Validate price
        if (price_per_night < 0) {
            return res.status(400).json({
                success: false,
                error: "Price per night must be a positive number",
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
        // Validate availability status
        const validStatuses = ["available", "unavailable", "maintenance"];
        if (availability_status && !validStatuses.includes(availability_status)) {
            return res.status(400).json({
                success: false,
                error: "Invalid availability_status. Must be: available, unavailable, or maintenance",
            });
        }
        // Insert room
        const insertQuery = `
      INSERT INTO Rooms (hotel_id, room_type, price_per_night, availability_status)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
        const result = await database_1.default.query(insertQuery, [
            hotel_id,
            room_type,
            price_per_night,
            availability_status || "available",
        ]);
        res.status(201).json({
            success: true,
            message: "Room created successfully",
            data: result.rows[0],
        });
    }
    catch (err) {
        console.error("Error creating room:", err);
        res.status(500).json({
            success: false,
            error: "Failed to create room",
            details: err.message,
        });
    }
};
exports.createRoom = createRoom;
// UPDATE ROOM (Admin only)
const updateRoom = async (req, res) => {
    try {
        const { id } = req.params;
        const { room_type, price_per_night, availability_status } = req.body;
        // Check if room exists
        const checkQuery = "SELECT * FROM Rooms WHERE room_id = $1";
        const checkResult = await database_1.default.query(checkQuery, [id]);
        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Room not found",
            });
        }
        // Validate price if provided
        if (price_per_night !== undefined && price_per_night < 0) {
            return res.status(400).json({
                success: false,
                error: "Price per night must be a positive number",
            });
        }
        // Validate availability status if provided
        const validStatuses = ["available", "unavailable", "maintenance"];
        if (availability_status && !validStatuses.includes(availability_status)) {
            return res.status(400).json({
                success: false,
                error: "Invalid availability_status. Must be: available, unavailable, or maintenance",
            });
        }
        // Build update query dynamically
        const updates = [];
        const params = [];
        let paramCount = 1;
        if (room_type !== undefined) {
            updates.push(`room_type = $${paramCount++}`);
            params.push(room_type);
        }
        if (price_per_night !== undefined) {
            updates.push(`price_per_night = $${paramCount++}`);
            params.push(price_per_night);
        }
        if (availability_status !== undefined) {
            updates.push(`availability_status = $${paramCount++}`);
            params.push(availability_status);
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
      UPDATE Rooms
      SET ${updates.join(", ")}
      WHERE room_id = $${paramCount}
      RETURNING *
    `;
        const result = await database_1.default.query(updateQuery, params);
        res.json({
            success: true,
            message: "Room updated successfully",
            data: result.rows[0],
        });
    }
    catch (err) {
        console.error("Error updating room:", err);
        res.status(500).json({
            success: false,
            error: "Failed to update room",
            details: err.message,
        });
    }
};
exports.updateRoom = updateRoom;
// DELETE ROOM (Admin only)
const deleteRoom = async (req, res) => {
    try {
        const { id } = req.params;
        // Check if room exists
        const checkQuery = "SELECT * FROM Rooms WHERE room_id = $1";
        const checkResult = await database_1.default.query(checkQuery, [id]);
        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Room not found",
            });
        }
        // Check if room has active bookings
        const bookingsCheck = await database_1.default.query(`SELECT COUNT(*) as count FROM Bookings 
       WHERE room_id = $1 
       AND status IN ('pending', 'confirmed')`, [id]);
        const activeBookings = parseInt(bookingsCheck.rows[0].count);
        if (activeBookings > 0) {
            return res.status(400).json({
                success: false,
                error: `Cannot delete room with ${activeBookings} active booking(s). Please cancel bookings first.`,
            });
        }
        // Delete room (cascade will delete related photos)
        const deleteQuery = "DELETE FROM Rooms WHERE room_id = $1 RETURNING *";
        const result = await database_1.default.query(deleteQuery, [id]);
        res.json({
            success: true,
            message: "Room deleted successfully",
            data: result.rows[0],
        });
    }
    catch (err) {
        console.error("Error deleting room:", err);
        res.status(500).json({
            success: false,
            error: "Failed to delete room",
            details: err.message,
        });
    }
};
exports.deleteRoom = deleteRoom;
// UPDATE ROOM AVAILABILITY (Admin only)
const updateRoomAvailability = async (req, res) => {
    try {
        const { id } = req.params;
        const { availability_status } = req.body;
        if (!availability_status) {
            return res.status(400).json({
                success: false,
                error: "availability_status is required",
            });
        }
        // Validate availability status
        const validStatuses = ["available", "unavailable", "maintenance"];
        if (!validStatuses.includes(availability_status)) {
            return res.status(400).json({
                success: false,
                error: "Invalid availability_status. Must be: available, unavailable, or maintenance",
            });
        }
        // Check if room exists
        const checkQuery = "SELECT * FROM Rooms WHERE room_id = $1";
        const checkResult = await database_1.default.query(checkQuery, [id]);
        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Room not found",
            });
        }
        // Update availability
        const updateQuery = `
      UPDATE Rooms
      SET availability_status = $1, updated_at = NOW()
      WHERE room_id = $2
      RETURNING *
    `;
        const result = await database_1.default.query(updateQuery, [availability_status, id]);
        res.json({
            success: true,
            message: "Room availability updated successfully",
            data: result.rows[0],
        });
    }
    catch (err) {
        console.error("Error updating room availability:", err);
        res.status(500).json({
            success: false,
            error: "Failed to update room availability",
            details: err.message,
        });
    }
};
exports.updateRoomAvailability = updateRoomAvailability;
// ADD ROOM PHOTO (Admin only)
const addRoomPhoto = async (req, res) => {
    try {
        const { id } = req.params;
        const { photo_url } = req.body;
        if (!photo_url) {
            return res.status(400).json({
                success: false,
                error: "photo_url is required",
            });
        }
        // Check if room exists
        const checkQuery = "SELECT * FROM Rooms WHERE room_id = $1";
        const checkResult = await database_1.default.query(checkQuery, [id]);
        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Room not found",
            });
        }
        // Insert photo
        const insertQuery = `
      INSERT INTO RoomPhotos (room_id, photo_url)
      VALUES ($1, $2)
      RETURNING *
    `;
        const result = await database_1.default.query(insertQuery, [id, photo_url]);
        res.status(201).json({
            success: true,
            message: "Photo added successfully",
            data: result.rows[0],
        });
    }
    catch (err) {
        console.error("Error adding room photo:", err);
        res.status(500).json({
            success: false,
            error: "Failed to add photo",
            details: err.message,
        });
    }
};
exports.addRoomPhoto = addRoomPhoto;
// DELETE ROOM PHOTO (Admin only)
const deleteRoomPhoto = async (req, res) => {
    try {
        const { id, photoId } = req.params;
        // Check if photo exists
        const checkQuery = `
      SELECT * FROM RoomPhotos 
      WHERE photo_id = $1 AND room_id = $2
    `;
        const checkResult = await database_1.default.query(checkQuery, [photoId, id]);
        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Photo not found",
            });
        }
        // Delete photo
        const deleteQuery = "DELETE FROM RoomPhotos WHERE photo_id = $1 RETURNING *";
        const result = await database_1.default.query(deleteQuery, [photoId]);
        res.json({
            success: true,
            message: "Photo deleted successfully",
            data: result.rows[0],
        });
    }
    catch (err) {
        console.error("Error deleting room photo:", err);
        res.status(500).json({
            success: false,
            error: "Failed to delete photo",
            details: err.message,
        });
    }
};
exports.deleteRoomPhoto = deleteRoomPhoto;
// CHECK ROOM AVAILABILITY (Public - for booking dates)
const checkRoomAvailability = async (req, res) => {
    try {
        const { roomId } = req.params;
        const { check_in_date, check_out_date } = req.query;
        if (!check_in_date || !check_out_date) {
            return res.status(400).json({
                success: false,
                error: "check_in_date and check_out_date are required",
            });
        }
        // Check if room exists
        const roomCheck = await database_1.default.query("SELECT * FROM Rooms WHERE room_id = $1", [roomId]);
        if (roomCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Room not found",
            });
        }
        const room = roomCheck.rows[0];
        // Check if room is available (not in maintenance or unavailable)
        if (room.availability_status !== "available") {
            return res.json({
                success: true,
                available: false,
                reason: `Room is currently ${room.availability_status}`,
                room: {
                    room_id: room.room_id,
                    room_type: room.room_type,
                    availability_status: room.availability_status,
                },
            });
        }
        // Check for conflicting bookings
        const bookingsQuery = `
      SELECT COUNT(*) as count
      FROM Bookings
      WHERE room_id = $1
        AND status IN ('pending', 'confirmed')
        AND (
          (check_in_date <= $2 AND check_out_date > $2)
          OR (check_in_date < $3 AND check_out_date >= $3)
          OR (check_in_date >= $2 AND check_out_date <= $3)
        )
    `;
        const bookingsResult = await database_1.default.query(bookingsQuery, [
            roomId,
            check_in_date,
            check_out_date,
        ]);
        const conflictingBookings = parseInt(bookingsResult.rows[0].count);
        if (conflictingBookings > 0) {
            return res.json({
                success: true,
                available: false,
                reason: "Room is already booked for the selected dates",
                room: {
                    room_id: room.room_id,
                    room_type: room.room_type,
                },
            });
        }
        // Calculate number of nights
        const checkIn = new Date(check_in_date);
        const checkOut = new Date(check_out_date);
        const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
        const totalPrice = room.price_per_night * nights;
        res.json({
            success: true,
            available: true,
            room: {
                room_id: room.room_id,
                room_type: room.room_type,
                price_per_night: parseFloat(room.price_per_night),
                availability_status: room.availability_status,
            },
            booking_info: {
                check_in_date,
                check_out_date,
                nights,
                total_price: totalPrice,
            },
        });
    }
    catch (err) {
        console.error("Error checking room availability:", err);
        res.status(500).json({
            success: false,
            error: "Failed to check room availability",
            details: err.message,
        });
    }
};
exports.checkRoomAvailability = checkRoomAvailability;
