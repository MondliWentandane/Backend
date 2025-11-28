import { Request, Response } from "express";
import pool from "../config/database";
import { Rooms, room_status } from "../types/room.types";
import { DEFAULT_CURRENCY, addCurrencyInfo } from "../utils/currency";
import { 
  validatePositiveInteger, 
  validatePrice,
  validatePaginationParams,
  validateStringLength,
  validateEnum,
  validatePositiveNumber
} from "../utils/validation";
import { checkHotelAccess } from "../middleware/userMiddleware";
import fs from "fs";
import path from "path";

// GET ALL ROOMS (Public - with optional filters)
// Branch admins only see rooms from their assigned hotels
export const getAllRooms = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user; // May be undefined for public access
    const { hotel_id, status, minPrice, maxPrice, roomType, limit, offset } = req.query;

    // Validate pagination params
    const paginationValidation = validatePaginationParams(limit, offset);
    if (!paginationValidation.valid) {
      return res.status(400).json({
        success: false,
        error: paginationValidation.error
      });
    }

    // Validate hotel_id if provided
    if (hotel_id !== undefined) {
      const hotelIdValidation = validatePositiveInteger(hotel_id, "Hotel ID");
      if (!hotelIdValidation.valid) {
        return res.status(400).json({
          success: false,
          error: hotelIdValidation.error
        });
      }
    }

    // Validate status if provided
    if (status !== undefined) {
      const statusValidation = validateEnum(status, ['available', 'unavailable', 'maintenance'], 'Status');
      if (!statusValidation.valid) {
        return res.status(400).json({
          success: false,
          error: statusValidation.error
        });
      }
    }

    // Validate minPrice if provided
    if (minPrice !== undefined) {
      const minPriceValidation = validatePositiveNumber(minPrice, "Minimum price", 0);
      if (!minPriceValidation.valid) {
        return res.status(400).json({
          success: false,
          error: minPriceValidation.error
        });
      }
    }

    // Validate maxPrice if provided
    if (maxPrice !== undefined) {
      const maxPriceValidation = validatePositiveNumber(maxPrice, "Maximum price", 0);
      if (!maxPriceValidation.valid) {
        return res.status(400).json({
          success: false,
          error: maxPriceValidation.error
        });
      }
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

    const conditions: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    // Filter by hotel assignment for branch admins
    if (user && user.role === "branch_admin") {
      if (!user.assigned_hotel_ids || user.assigned_hotel_ids.length === 0) {
        // Branch admin with no hotels assigned - return empty result
        return res.json({
          success: true,
          data: [],
          message: "No hotels assigned to your account. Please contact a super admin.",
          currency: DEFAULT_CURRENCY,
          pagination: {
            total: 0,
            limit: paginationValidation.limitValue!,
            offset: paginationValidation.offsetValue!,
            hasMore: false
          }
        });
      }
      conditions.push(`r.hotel_id = ANY($${paramCount}::int[])`);
      params.push(user.assigned_hotel_ids);
      paramCount++;
    }

    // Filter by hotel (if provided, and not already filtered by branch admin)
    if (hotel_id !== undefined) {
      const hotelIdValidation = validatePositiveInteger(hotel_id, "Hotel ID");
      // For branch admins, ensure the requested hotel is in their assigned hotels
      if (user && user.role === "branch_admin") {
        if (!user.assigned_hotel_ids || !user.assigned_hotel_ids.includes(hotelIdValidation.parsed!)) {
          return res.status(403).json({
            success: false,
            error: "Access Denied: You do not have access to this hotel"
          });
        }
      }
      conditions.push(`r.hotel_id = $${paramCount}`);
      params.push(hotelIdValidation.parsed!);
      paramCount++;
    }

    // Filter by availability status
    if (status !== undefined) {
      const statusValidation = validateEnum(status, ['available', 'unavailable', 'maintenance'], 'Status');
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
      params.push(parseFloat(minPrice as string));
      paramCount++;
    }

    // Filter by maximum price
    if (maxPrice) {
      conditions.push(`r.price_per_night <= $${paramCount}`);
      params.push(parseFloat(maxPrice as string));
      paramCount++;
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }

    query += ` GROUP BY r.room_id, h.hotel_name, h.city, h.country`;

    // Add pagination
    const limitValue = paginationValidation.limitValue!;
    const offsetValue = paginationValidation.offsetValue!;

    query += ` ORDER BY r.price_per_night ASC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limitValue, offsetValue);

    const result = await pool.query(query, params);

    // Get total count for pagination
    let countQuery = "SELECT COUNT(*) FROM Rooms r";
    if (conditions.length > 0) {
      countQuery += ` WHERE ${conditions.join(" AND ")}`;
    }
    const countParams = params.slice(0, -2); // Remove limit and offset
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    // Add currency info to price fields
    const roomsWithCurrency = result.rows.map((room: any) => ({
      ...room,
      price_per_night_info: addCurrencyInfo(parseFloat(room.price_per_night)),
    }));

    res.json({
      success: true,
      data: roomsWithCurrency,
      currency: DEFAULT_CURRENCY,
      pagination: {
        total,
        limit: limitValue,
        offset: offsetValue,
        hasMore: offsetValue + limitValue < total,
      },
    });
  } catch (err: any) {
    console.error("Error fetching rooms:", err?.message || "Unknown error");
    res.status(500).json({
      success: false,
      error: "Failed to fetch rooms",
      details: err.message,
    });
  }
};

// GET ROOMS BY HOTEL ID (Public)
export const getRoomsByHotel = async (req: Request, res: Response) => {
  try {
    const { hotelId } = req.params;
    const { status, minPrice, maxPrice, roomType } = req.query;

    // Validate hotel ID
    const hotelIdValidation = validatePositiveInteger(hotelId, "Hotel ID");
    if (!hotelIdValidation.valid) {
      return res.status(400).json({
        success: false,
        error: hotelIdValidation.error
      });
    }

    // Validate status if provided
    if (status !== undefined) {
      const statusValidation = validateEnum(status, ['available', 'unavailable', 'maintenance'], 'Status');
      if (!statusValidation.valid) {
        return res.status(400).json({
          success: false,
          error: statusValidation.error
        });
      }
    }

    // Validate minPrice if provided
    if (minPrice !== undefined) {
      const minPriceValidation = validatePositiveNumber(minPrice, "Minimum price", 0);
      if (!minPriceValidation.valid) {
        return res.status(400).json({
          success: false,
          error: minPriceValidation.error
        });
      }
    }

    // Validate maxPrice if provided
    if (maxPrice !== undefined) {
      const maxPriceValidation = validatePositiveNumber(maxPrice, "Maximum price", 0);
      if (!maxPriceValidation.valid) {
        return res.status(400).json({
          success: false,
          error: maxPriceValidation.error
        });
      }
    }

    // Check if hotel exists
    const hotelCheck = await pool.query("SELECT * FROM Hotels WHERE hotel_id = $1", [hotelIdValidation.parsed!]);
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

    const conditions: string[] = [];
    const params: any[] = [hotelIdValidation.parsed!];
    let paramCount = 2;

    // Filter by availability status
    if (status !== undefined) {
      const statusValidation = validateEnum(status, ['available', 'unavailable', 'maintenance'], 'Status');
      conditions.push(`r.availability_status = $${paramCount}`);
      params.push(status);
      paramCount++;
    }

    // Filter by room type
    if (roomType !== undefined) {
      if (typeof roomType !== 'string') {
        return res.status(400).json({
          success: false,
          error: "Room type must be a string"
        });
      }
      conditions.push(`r.room_type ILIKE $${paramCount}`);
      params.push(`%${roomType}%`);
      paramCount++;
    }

    // Filter by minimum price
    if (minPrice !== undefined) {
      const minPriceValidation = validatePositiveNumber(minPrice, "Minimum price", 0);
      conditions.push(`r.price_per_night >= $${paramCount}`);
      params.push(minPriceValidation.parsed!);
      paramCount++;
    }

    // Filter by maximum price
    if (maxPrice !== undefined) {
      const maxPriceValidation = validatePositiveNumber(maxPrice, "Maximum price", 0);
      conditions.push(`r.price_per_night <= $${paramCount}`);
      params.push(maxPriceValidation.parsed!);
      paramCount++;
    }

    if (conditions.length > 0) {
      query += ` AND ${conditions.join(" AND ")}`;
    }

    query += ` GROUP BY r.room_id ORDER BY r.price_per_night ASC`;

    const result = await pool.query(query, params);

    // Add currency info to price fields
    const roomsWithCurrency = result.rows.map((room: any) => ({
      ...room,
      price_per_night_info: addCurrencyInfo(parseFloat(room.price_per_night)),
    }));

    res.json({
      success: true,
      data: roomsWithCurrency,
      currency: DEFAULT_CURRENCY,
      hotel: {
        hotel_id: hotelCheck.rows[0].hotel_id,
        hotel_name: hotelCheck.rows[0].hotel_name,
        city: hotelCheck.rows[0].city,
        country: hotelCheck.rows[0].country,
      },
    });
  } catch (err: any) {
    console.error("Error fetching rooms by hotel:", err?.message || "Unknown error");
    res.status(500).json({
      success: false,
      error: "Failed to fetch rooms",
      details: err.message,
    });
  }
};

// GET ROOM BY ID (Public)
export const getRoomById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate room ID
    const roomIdValidation = validatePositiveInteger(id, "Room ID");
    if (!roomIdValidation.valid) {
      return res.status(400).json({
        success: false,
        error: roomIdValidation.error
      });
    }

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

    const result = await pool.query(query, [roomIdValidation.parsed!]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Room not found",
      });
    }

    // Add currency info to price fields
    const room = {
      ...result.rows[0],
      price_per_night_info: addCurrencyInfo(parseFloat(result.rows[0].price_per_night)),
    };

    res.json({
      success: true,
      data: room,
      currency: DEFAULT_CURRENCY,
    });
  } catch (err: any) {
    console.error("Error fetching room:", err?.message || "Unknown error");
    res.status(500).json({
      success: false,
      error: "Failed to fetch room",
      details: err.message,
    });
  }
};

// CREATE ROOM (Admin only - with hotel access check)
export const createRoom = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { hotel_id, room_type, price_per_night, availability_status } = req.body;

    // Validate hotel_id
    const hotelIdValidation = validatePositiveInteger(hotel_id, "Hotel ID");
    if (!hotelIdValidation.valid) {
      return res.status(400).json({
        success: false,
        error: hotelIdValidation.error
      });
    }

    // Check hotel access (pass cached assigned_hotel_ids for performance)
    const hasAccess = await checkHotelAccess(user.user_id, user.role, hotelIdValidation.parsed!, user.assigned_hotel_ids);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: "Access Denied: You do not have access to this hotel"
      });
    }

    // Validate room_type
    const roomTypeValidation = validateStringLength(room_type, "Room type", 1, 100);
    if (!roomTypeValidation.valid) {
      return res.status(400).json({
        success: false,
        error: roomTypeValidation.error
      });
    }

    // Validate price
    const priceValidation = validatePrice(price_per_night, "Price per night", 0, 1000000, false);
    if (!priceValidation.valid) {
      return res.status(400).json({
        success: false,
        error: priceValidation.error
      });
    }

    // Validate availability_status if provided
    if (availability_status !== undefined) {
      const statusValidation = validateEnum(availability_status, ['available', 'unavailable', 'maintenance'], 'Availability status');
      if (!statusValidation.valid) {
        return res.status(400).json({
          success: false,
          error: statusValidation.error
        });
      }
    }

    // Check if hotel exists
    const hotelCheck = await pool.query("SELECT * FROM Hotels WHERE hotel_id = $1", [hotelIdValidation.parsed!]);
    if (hotelCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Hotel not found",
      });
    }

    // Insert room
    const insertQuery = `
      INSERT INTO Rooms (hotel_id, room_type, price_per_night, availability_status)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      hotelIdValidation.parsed!,
      roomTypeValidation.trimmed!,
      priceValidation.parsed!,
      availability_status || "available",
    ]);

    res.status(201).json({
      success: true,
      message: "Room created successfully",
      data: result.rows[0],
    });
  } catch (err: any) {
    console.error("Error creating room:", err?.message || "Unknown error");
    res.status(500).json({
      success: false,
      error: "Failed to create room",
      details: err.message,
    });
  }
};

// UPDATE ROOM (Admin only)
export const updateRoom = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { room_type, price_per_night, availability_status } = req.body;

    // Validate room ID
    const roomIdValidation = validatePositiveInteger(id, "Room ID");
    if (!roomIdValidation.valid) {
      return res.status(400).json({
        success: false,
        error: roomIdValidation.error
      });
    }

    // Validate room_type if provided
    if (room_type !== undefined) {
      const roomTypeValidation = validateStringLength(room_type, "Room type", 1, 100);
      if (!roomTypeValidation.valid) {
        return res.status(400).json({
          success: false,
          error: roomTypeValidation.error
        });
      }
    }

    // Validate price_per_night if provided
    if (price_per_night !== undefined) {
      const priceValidation = validatePrice(price_per_night, "Price per night", 0, 1000000, false);
      if (!priceValidation.valid) {
        return res.status(400).json({
          success: false,
          error: priceValidation.error
        });
      }
    }

    // Validate availability_status if provided
    if (availability_status !== undefined) {
      const statusValidation = validateEnum(availability_status, ['available', 'unavailable', 'maintenance'], 'Availability status');
      if (!statusValidation.valid) {
        return res.status(400).json({
          success: false,
          error: statusValidation.error
        });
      }
    }

    // Check if room exists
    const checkQuery = "SELECT * FROM Rooms WHERE room_id = $1";
    const checkResult = await pool.query(checkQuery, [roomIdValidation.parsed!]);

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
    const validStatuses: room_status[] = ["available", "unavailable", "maintenance"];
    if (availability_status && !validStatuses.includes(availability_status)) {
      return res.status(400).json({
        success: false,
        error: "Invalid availability_status. Must be: available, unavailable, or maintenance",
      });
    }

    // Build update query dynamically
    const updates: string[] = [];
    const params: any[] = [];
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

    const result = await pool.query(updateQuery, params);

    res.json({
      success: true,
      message: "Room updated successfully",
      data: result.rows[0],
    });
  } catch (err: any) {
    console.error("Error updating room:", err?.message || "Unknown error");
    res.status(500).json({
      success: false,
      error: "Failed to update room",
      details: err.message,
    });
  }
};

// DELETE ROOM (Admin only - with hotel access check)
export const deleteRoom = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    // Validate room ID
    const roomIdValidation = validatePositiveInteger(id, "Room ID");
    if (!roomIdValidation.valid) {
      return res.status(400).json({
        success: false,
        error: roomIdValidation.error
      });
    }

    // Get room's hotel_id to check access
    const roomCheckQuery = "SELECT hotel_id FROM Rooms WHERE room_id = $1";
    const roomCheckResult = await pool.query(roomCheckQuery, [roomIdValidation.parsed!]);

    if (roomCheckResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Room not found"
      });
    }

    const hotelId = roomCheckResult.rows[0].hotel_id;

    // Check hotel access (pass cached assigned_hotel_ids for performance)
    const hasAccess = await checkHotelAccess(user.user_id, user.role, hotelId, user.assigned_hotel_ids);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: "Access Denied: You do not have access to this hotel"
      });
    }

    // Check if room has active bookings
    const bookingsCheck = await pool.query(
      `SELECT COUNT(*) as count FROM Bookings 
       WHERE room_id = $1 
       AND status IN ('pending', 'confirmed')`,
      [id]
    );

    const activeBookings = parseInt(bookingsCheck.rows[0].count);
    if (activeBookings > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete room with ${activeBookings} active booking(s). Please cancel bookings first.`,
      });
    }

    // Delete room (cascade will delete related photos)
    const deleteQuery = "DELETE FROM Rooms WHERE room_id = $1 RETURNING *";
    const result = await pool.query(deleteQuery, [roomIdValidation.parsed!]);

    res.json({
      success: true,
      message: "Room deleted successfully",
      data: result.rows[0],
    });
  } catch (err: any) {
    console.error("Error deleting room:", err?.message || "Unknown error");
    res.status(500).json({
      success: false,
      error: "Failed to delete room",
      details: err.message,
    });
  }
};

// UPDATE ROOM AVAILABILITY (Admin only - with hotel access check)
export const updateRoomAvailability = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { availability_status } = req.body;

    if (!availability_status) {
      return res.status(400).json({
        success: false,
        error: "availability_status is required",
      });
    }

    // Validate room ID
    const roomIdValidation = validatePositiveInteger(id, "Room ID");
    if (!roomIdValidation.valid) {
      return res.status(400).json({
        success: false,
        error: roomIdValidation.error
      });
    }

    // Get room's hotel_id to check access
    const roomCheckQuery = "SELECT hotel_id FROM Rooms WHERE room_id = $1";
    const roomCheckResult = await pool.query(roomCheckQuery, [roomIdValidation.parsed!]);

    if (roomCheckResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Room not found"
      });
    }

    const hotelId = roomCheckResult.rows[0].hotel_id;

    // Check hotel access (pass cached assigned_hotel_ids for performance)
    const hasAccess = await checkHotelAccess(user.user_id, user.role, hotelId, user.assigned_hotel_ids);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: "Access Denied: You do not have access to this hotel"
      });
    }

    // Validate availability status
    const validStatuses: room_status[] = ["available", "unavailable", "maintenance"];
    if (!validStatuses.includes(availability_status)) {
      return res.status(400).json({
        success: false,
        error: "Invalid availability_status. Must be: available, unavailable, or maintenance",
      });
    }

    // Check if room exists
    const checkQuery = "SELECT * FROM Rooms WHERE room_id = $1";
    const checkResult = await pool.query(checkQuery, [id]);

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

    const result = await pool.query(updateQuery, [availability_status, id]);

    res.json({
      success: true,
      message: "Room availability updated successfully",
      data: result.rows[0],
    });
  } catch (err: any) {
    console.error("Error updating room availability:", err?.message || "Unknown error");
    res.status(500).json({
      success: false,
      error: "Failed to update room availability",
      details: err.message,
    });
  }
};

// ADD ROOM PHOTO (Admin only) - Supports file upload or URL
export const addRoomPhoto = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { photo_url } = req.body;
    const file = (req as any).file;

    // Validate room ID first
    const roomIdValidation = validatePositiveInteger(id, "Room ID");
    if (!roomIdValidation.valid) {
      return res.status(400).json({
        success: false,
        error: roomIdValidation.error
      });
    }

    // Get room's hotel_id to check access
    const roomCheckQuery = "SELECT hotel_id FROM Rooms WHERE room_id = $1";
    const roomCheckResult = await pool.query(roomCheckQuery, [roomIdValidation.parsed!]);

    if (roomCheckResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Room not found"
      });
    }

    const hotelId = roomCheckResult.rows[0].hotel_id;

    // Check hotel access (pass cached assigned_hotel_ids for performance)
    const hasAccess = await checkHotelAccess(user.user_id, user.role, hotelId, user.assigned_hotel_ids);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: "Access Denied: You do not have access to this hotel"
      });
    }

    let finalPhotoUrl: string;

    // Check if file was uploaded
    if (file) {
      // Use uploaded file path
      finalPhotoUrl = `/uploads/${file.filename}`;
    } else if (photo_url) {
      // Use provided URL
      finalPhotoUrl = photo_url;
    } else {
      return res.status(400).json({
        success: false,
        error: "Either a photo file or photo_url is required",
      });
    }

    const parsedRoomId = roomIdValidation.parsed!;

    // Check if room exists
    const checkQuery = "SELECT * FROM Rooms WHERE room_id = $1";
    const checkResult = await pool.query(checkQuery, [parsedRoomId]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Room not found",
      });
    }

    // Validate URL format if provided
    if (photo_url && !file) {
      try {
        new URL(photo_url);
      } catch {
        return res.status(400).json({
          success: false,
          error: "Invalid photo_url format. Must be a valid URL.",
        });
      }
    }

    // Insert photo
    const insertQuery = `
      INSERT INTO RoomPhotos (room_id, photo_url)
      VALUES ($1, $2)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [parsedRoomId, finalPhotoUrl]);

    res.status(201).json({
      success: true,
      message: "Photo added successfully",
      data: result.rows[0],
      upload_method: file ? "file_upload" : "url",
    });
  } catch (err: any) {
    console.error("Error adding room photo:", err?.message || "Unknown error");
    res.status(500).json({
      success: false,
      error: "Failed to add photo",
      details: err.message,
    });
  }
};

// DELETE ROOM PHOTO (Admin only)
export const deleteRoomPhoto = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id, photoId } = req.params;

    // Validate room ID
    const roomIdValidation = validatePositiveInteger(id, "Room ID");
    if (!roomIdValidation.valid) {
      return res.status(400).json({
        success: false,
        error: roomIdValidation.error
      });
    }

    // Get room's hotel_id to check access
    const roomCheckQuery = "SELECT hotel_id FROM Rooms WHERE room_id = $1";
    const roomCheckResult = await pool.query(roomCheckQuery, [roomIdValidation.parsed!]);

    if (roomCheckResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Room not found"
      });
    }

    const hotelId = roomCheckResult.rows[0].hotel_id;

    // Check hotel access (pass cached assigned_hotel_ids for performance)
    const hasAccess = await checkHotelAccess(user.user_id, user.role, hotelId, user.assigned_hotel_ids);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: "Access Denied: You do not have access to this hotel"
      });
    }

    // Check if photo exists
    const checkQuery = `
      SELECT * FROM RoomPhotos 
      WHERE photo_id = $1 AND room_id = $2
    `;
    const checkResult = await pool.query(checkQuery, [photoId, roomIdValidation.parsed!]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Photo not found",
      });
    }

    const photo = checkResult.rows[0];
    const photoUrl = photo.photo_url;

    // Delete photo from database
    const deleteQuery = "DELETE FROM RoomPhotos WHERE photo_id = $1 RETURNING *";
    const result = await pool.query(deleteQuery, [photoId]);

    // Delete file from disk if it's a local upload (starts with /uploads/)
    if (photoUrl && photoUrl.startsWith('/uploads/')) {
      try {
        const filePath = path.join(process.cwd(), 'public', photoUrl);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (fileError: any) {
        // Log error but don't fail the request if file deletion fails
        console.warn("Failed to delete photo file from disk:", fileError?.message || "Unknown error");
      }
    }

    res.json({
      success: true,
      message: "Photo deleted successfully",
      data: result.rows[0],
    });
  } catch (err: any) {
    console.error("Error deleting room photo:", err?.message || "Unknown error");
    res.status(500).json({
      success: false,
      error: "Failed to delete photo",
      details: err.message,
    });
  }
};

// CHECK ROOM AVAILABILITY (Public - for booking dates)
export const checkRoomAvailability = async (req: Request, res: Response) => {
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
    const roomCheck = await pool.query("SELECT * FROM Rooms WHERE room_id = $1", [roomId]);
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

    const bookingsResult = await pool.query(bookingsQuery, [
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
    const checkIn = new Date(check_in_date as string);
    const checkOut = new Date(check_out_date as string);
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    const totalPrice = room.price_per_night * nights;

    res.json({
      success: true,
      available: true,
      room: {
        room_id: room.room_id,
        room_type: room.room_type,
        price_per_night: parseFloat(room.price_per_night),
        price_per_night_info: addCurrencyInfo(parseFloat(room.price_per_night)),
        availability_status: room.availability_status,
      },
      booking_info: {
        check_in_date,
        check_out_date,
        nights,
        total_price: totalPrice,
        total_price_info: addCurrencyInfo(totalPrice),
      },
      currency: DEFAULT_CURRENCY,
    });
  } catch (err: any) {
    console.error("Error checking room availability:", err?.message || "Unknown error");
    res.status(500).json({
      success: false,
      error: "Failed to check room availability",
      details: err.message,
    });
  }
};

