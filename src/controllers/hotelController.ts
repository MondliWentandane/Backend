import { Request, Response } from "express";
import pool from "../config/database";
import { Hotels } from "../types/hotel.types";
import { DEFAULT_CURRENCY, addCurrencyInfo } from "../utils/currency";

// GET ALL HOTELS (Public - with optional search/filter)
export const getAllHotels = async (req: Request, res: Response) => {
  try {
    const { city, country, minRating, maxRating, search, limit, offset } = req.query;

    let query = `
      SELECT 
        h.hotel_id,
        h.hotel_name,
        h.address,
        h.city,
        h.country,
        h.price_range,
        h.star_rating,
        h.amenities,
        h.created_at,
        h.updated_at,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'photo_id', hp.photo_id,
              'photo_url', hp.photo_url
            )
          ) FILTER (WHERE hp.photo_id IS NOT NULL),
          '[]'::json
        ) as photos
      FROM Hotels h
      LEFT JOIN HotelPhotos hp ON h.hotel_id = hp.hotel_id
    `;

    const conditions: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    // Search by hotel name or address
    if (search) {
      conditions.push(`(h.hotel_name ILIKE $${paramCount} OR h.address ILIKE $${paramCount})`);
      params.push(`%${search}%`);
      paramCount++;
    }

    // Filter by city
    if (city) {
      conditions.push(`h.city ILIKE $${paramCount}`);
      params.push(`%${city}%`);
      paramCount++;
    }

    // Filter by country
    if (country) {
      conditions.push(`h.country ILIKE $${paramCount}`);
      params.push(`%${country}%`);
      paramCount++;
    }

    // Filter by minimum star rating
    if (minRating) {
      conditions.push(`h.star_rating >= $${paramCount}`);
      params.push(parseInt(minRating as string));
      paramCount++;
    }

    // Filter by maximum star rating
    if (maxRating) {
      conditions.push(`h.star_rating <= $${paramCount}`);
      params.push(parseInt(maxRating as string));
      paramCount++;
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }

    query += ` GROUP BY h.hotel_id`;

    // Add pagination
    const limitValue = limit ? parseInt(limit as string) : 20;
    const offsetValue = offset ? parseInt(offset as string) : 0;

    query += ` ORDER BY h.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limitValue, offsetValue);

    const result = await pool.query(query, params);

    // Get total count for pagination
    let countQuery = "SELECT COUNT(*) FROM Hotels h";
    if (conditions.length > 0) {
      countQuery += ` WHERE ${conditions.join(" AND ")}`;
    }
    const countParams = params.slice(0, -2); // Remove limit and offset
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: result.rows,
      currency: DEFAULT_CURRENCY,
      pagination: {
        total,
        limit: limitValue,
        offset: offsetValue,
        hasMore: offsetValue + limitValue < total,
      },
    });
  } catch (err: any) {
    console.error("Error fetching hotels:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch hotels",
      details: err.message,
    });
  }
};

// GET HOTEL BY ID (Public)
export const getHotelById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get hotel with photos
    const hotelQuery = `
      SELECT 
        h.hotel_id,
        h.hotel_name,
        h.address,
        h.city,
        h.country,
        h.price_range,
        h.star_rating,
        h.amenities,
        h.created_at,
        h.updated_at,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'photo_id', hp.photo_id,
              'photo_url', hp.photo_url
            )
          ) FILTER (WHERE hp.photo_id IS NOT NULL),
          '[]'::json
        ) as photos
      FROM Hotels h
      LEFT JOIN HotelPhotos hp ON h.hotel_id = hp.hotel_id
      WHERE h.hotel_id = $1
      GROUP BY h.hotel_id, h.hotel_name, h.address, h.city, h.country, h.price_range, h.star_rating, h.amenities, h.created_at, h.updated_at
    `;

    const hotelResult = await pool.query(hotelQuery, [id]);

    if (hotelResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Hotel not found",
      });
    }

    // Get available rooms count
    const roomsQuery = `
      SELECT 
        COUNT(*) as total_rooms,
        COUNT(*) FILTER (WHERE availability_status = 'available') as available_rooms,
        MIN(price_per_night) as min_price,
        MAX(price_per_night) as max_price
      FROM Rooms
      WHERE hotel_id = $1
    `;

    const roomsResult = await pool.query(roomsQuery, [id]);

    // Get average rating from reviews
    const reviewsQuery = `
      SELECT 
        COUNT(*) as total_reviews,
        AVG(rating) as average_rating
      FROM Reviews
      WHERE hotel_id = $1
    `;

    const reviewsResult = await pool.query(reviewsQuery, [id]);

    const minPrice = parseFloat(roomsResult.rows[0].min_price || "0");
    const maxPrice = parseFloat(roomsResult.rows[0].max_price || "0");

    const hotel = {
      ...hotelResult.rows[0],
      room_stats: {
        total_rooms: parseInt(roomsResult.rows[0].total_rooms || "0"),
        available_rooms: parseInt(roomsResult.rows[0].available_rooms || "0"),
        min_price: minPrice,
        max_price: maxPrice,
        min_price_info: minPrice > 0 ? addCurrencyInfo(minPrice) : null,
        max_price_info: maxPrice > 0 ? addCurrencyInfo(maxPrice) : null,
      },
      review_stats: {
        total_reviews: parseInt(reviewsResult.rows[0].total_reviews || "0"),
        average_rating: parseFloat(reviewsResult.rows[0].average_rating || "0"),
      },
    };

    res.json({
      success: true,
      data: hotel,
      currency: DEFAULT_CURRENCY,
    });
  } catch (err: any) {
    console.error("Error fetching hotel:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch hotel",
      details: err.message,
    });
  }
};

// CREATE HOTEL (Admin only)
export const createHotel = async (req: Request, res: Response) => {
  try {
    const { hotel_name, address, city, country, price_range, star_rating, amenities } = req.body;

    // Validation
    if (!hotel_name || !address || !city || !country || !price_range) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: hotel_name, address, city, country, price_range",
      });
    }

    // Validate star rating if provided
    if (star_rating && (star_rating < 1 || star_rating > 5)) {
      return res.status(400).json({
        success: false,
        error: "Star rating must be between 1 and 5",
      });
    }

    // Insert hotel
    const insertQuery = `
      INSERT INTO Hotels (hotel_name, address, city, country, price_range, star_rating, amenities)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const amenitiesArray = Array.isArray(amenities) ? amenities : amenities ? [amenities] : [];

    const result = await pool.query(insertQuery, [
      hotel_name,
      address,
      city,
      country,
      price_range,
      star_rating || null,
      amenitiesArray,
    ]);

    res.status(201).json({
      success: true,
      message: "Hotel created successfully",
      data: result.rows[0],
    });
  } catch (err: any) {
    console.error("Error creating hotel:", err);
    res.status(500).json({
      success: false,
      error: "Failed to create hotel",
      details: err.message,
    });
  }
};

// UPDATE HOTEL (Admin only)
export const updateHotel = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { hotel_name, address, city, country, price_range, star_rating, amenities } = req.body;

    // Check if hotel exists
    const checkQuery = "SELECT * FROM Hotels WHERE hotel_id = $1";
    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Hotel not found",
      });
    }

    // Validate star rating if provided
    if (star_rating !== undefined && (star_rating < 1 || star_rating > 5)) {
      return res.status(400).json({
        success: false,
        error: "Star rating must be between 1 and 5",
      });
    }

    // Build update query dynamically
    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (hotel_name !== undefined) {
      updates.push(`hotel_name = $${paramCount++}`);
      params.push(hotel_name);
    }
    if (address !== undefined) {
      updates.push(`address = $${paramCount++}`);
      params.push(address);
    }
    if (city !== undefined) {
      updates.push(`city = $${paramCount++}`);
      params.push(city);
    }
    if (country !== undefined) {
      updates.push(`country = $${paramCount++}`);
      params.push(country);
    }
    if (price_range !== undefined) {
      updates.push(`price_range = $${paramCount++}`);
      params.push(price_range);
    }
    if (star_rating !== undefined) {
      updates.push(`star_rating = $${paramCount++}`);
      params.push(star_rating);
    }
    if (amenities !== undefined) {
      updates.push(`amenities = $${paramCount++}`);
      const amenitiesArray = Array.isArray(amenities) ? amenities : [amenities];
      params.push(amenitiesArray);
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
      UPDATE Hotels
      SET ${updates.join(", ")}
      WHERE hotel_id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(updateQuery, params);

    res.json({
      success: true,
      message: "Hotel updated successfully",
      data: result.rows[0],
    });
  } catch (err: any) {
    console.error("Error updating hotel:", err);
    res.status(500).json({
      success: false,
      error: "Failed to update hotel",
      details: err.message,
    });
  }
};

// DELETE HOTEL (Admin only)
export const deleteHotel = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if hotel exists
    const checkQuery = "SELECT * FROM Hotels WHERE hotel_id = $1";
    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Hotel not found",
      });
    }

    // Delete hotel (cascade will delete related rooms, photos, bookings, etc.)
    const deleteQuery = "DELETE FROM Hotels WHERE hotel_id = $1 RETURNING *";
    const result = await pool.query(deleteQuery, [id]);

    res.json({
      success: true,
      message: "Hotel deleted successfully",
      data: result.rows[0],
    });
  } catch (err: any) {
    console.error("Error deleting hotel:", err);
    res.status(500).json({
      success: false,
      error: "Failed to delete hotel",
      details: err.message,
    });
  }
};

// ADD HOTEL PHOTO (Admin only)
export const addHotelPhoto = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { photo_url } = req.body;

    if (!photo_url) {
      return res.status(400).json({
        success: false,
        error: "photo_url is required",
      });
    }

    // Check if hotel exists
    const checkQuery = "SELECT * FROM Hotels WHERE hotel_id = $1";
    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Hotel not found",
      });
    }

    // Insert photo
    const insertQuery = `
      INSERT INTO HotelPhotos (hotel_id, photo_url)
      VALUES ($1, $2)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [id, photo_url]);

    res.status(201).json({
      success: true,
      message: "Photo added successfully",
      data: result.rows[0],
    });
  } catch (err: any) {
    console.error("Error adding hotel photo:", err);
    res.status(500).json({
      success: false,
      error: "Failed to add photo",
      details: err.message,
    });
  }
};

// DELETE HOTEL PHOTO (Admin only)
export const deleteHotelPhoto = async (req: Request, res: Response) => {
  try {
    const { id, photoId } = req.params;

    // Check if photo exists
    const checkQuery = `
      SELECT * FROM HotelPhotos 
      WHERE photo_id = $1 AND hotel_id = $2
    `;
    const checkResult = await pool.query(checkQuery, [photoId, id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Photo not found",
      });
    }

    // Delete photo
    const deleteQuery = "DELETE FROM HotelPhotos WHERE photo_id = $1 RETURNING *";
    const result = await pool.query(deleteQuery, [photoId]);

    res.json({
      success: true,
      message: "Photo deleted successfully",
      data: result.rows[0],
    });
  } catch (err: any) {
    console.error("Error deleting hotel photo:", err);
    res.status(500).json({
      success: false,
      error: "Failed to delete photo",
      details: err.message,
    });
  }
};

