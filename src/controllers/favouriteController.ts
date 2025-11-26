import { Request, Response } from "express";
import pool from "../config/database";

// ADD HOTEL TO FAVOURITES (Authenticated)
export const addToFavourites = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { hotel_id } = req.body;

    // Validation
    if (!hotel_id) {
      return res.status(400).json({
        success: false,
        error: "hotel_id is required",
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

    // Check if already in favourites (UNIQUE constraint will handle this, but we check first for better error message)
    const existingFavourite = await pool.query(
      "SELECT * FROM Favourites WHERE user_id = $1 AND hotel_id = $2",
      [user.user_id, hotel_id]
    );

    if (existingFavourite.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Hotel is already in your favourites",
        data: existingFavourite.rows[0],
      });
    }

    // Add to favourites
    const insertQuery = `
      INSERT INTO Favourites (user_id, hotel_id)
      VALUES ($1, $2)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [user.user_id, hotel_id]);

    res.status(201).json({
      success: true,
      message: "Hotel added to favourites successfully",
      data: result.rows[0],
    });
  } catch (err: any) {
    // Handle unique constraint violation
    if (err.code === "23505") {
      return res.status(400).json({
        success: false,
        error: "Hotel is already in your favourites",
      });
    }
    console.error("Error adding to favourites:", err);
    res.status(500).json({
      success: false,
      error: "Failed to add to favourites",
      details: err.message,
    });
  }
};

// REMOVE HOTEL FROM FAVOURITES (Authenticated)
export const removeFromFavourites = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params; // favourite_id

    // Check if favourite exists and belongs to user
    const checkQuery = "SELECT * FROM Favourites WHERE favourite_id = $1";
    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Favourite not found",
      });
    }

    const favourite = checkResult.rows[0];

    // Check permissions (user can only remove their own favourites, admin can remove any)
    if (user.role !== "admin" && favourite.user_id !== user.user_id) {
      return res.status(403).json({
        success: false,
        error: "Access denied. You can only remove your own favourites.",
      });
    }

    // Remove from favourites
    const deleteQuery = "DELETE FROM Favourites WHERE favourite_id = $1 RETURNING *";
    const result = await pool.query(deleteQuery, [id]);

    res.json({
      success: true,
      message: "Hotel removed from favourites successfully",
      data: result.rows[0],
    });
  } catch (err: any) {
    console.error("Error removing from favourites:", err);
    res.status(500).json({
      success: false,
      error: "Failed to remove from favourites",
      details: err.message,
    });
  }
};

// REMOVE BY HOTEL ID (Alternative endpoint - more convenient)
export const removeFromFavouritesByHotel = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { hotelId } = req.params;

    // Check if favourite exists and belongs to user
    const checkQuery = "SELECT * FROM Favourites WHERE user_id = $1 AND hotel_id = $2";
    const checkResult = await pool.query(checkQuery, [user.user_id, hotelId]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Hotel is not in your favourites",
      });
    }

    // Remove from favourites
    const deleteQuery = "DELETE FROM Favourites WHERE user_id = $1 AND hotel_id = $2 RETURNING *";
    const result = await pool.query(deleteQuery, [user.user_id, hotelId]);

    res.json({
      success: true,
      message: "Hotel removed from favourites successfully",
      data: result.rows[0],
    });
  } catch (err: any) {
    console.error("Error removing from favourites:", err);
    res.status(500).json({
      success: false,
      error: "Failed to remove from favourites",
      details: err.message,
    });
  }
};

// GET USER'S FAVOURITE HOTELS (Authenticated)
export const getMyFavourites = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { limit, offset } = req.query;

    let query = `
      SELECT 
        f.favourite_id,
        f.hotel_id,
        f.created_at as favourited_at,
        h.hotel_name,
        h.address,
        h.city,
        h.country,
        h.price_range,
        h.star_rating,
        h.amenities,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'photo_id', hp.photo_id,
              'photo_url', hp.photo_url
            )
          ) FILTER (WHERE hp.photo_id IS NOT NULL),
          '[]'::json
        ) as photos
      FROM Favourites f
      INNER JOIN Hotels h ON f.hotel_id = h.hotel_id
      LEFT JOIN HotelPhotos hp ON h.hotel_id = hp.hotel_id
      WHERE f.user_id = $1
      GROUP BY f.favourite_id, h.hotel_id, h.hotel_name, h.address, h.city, h.country, h.price_range, h.star_rating, h.amenities
      ORDER BY f.created_at DESC
    `;

    const params: any[] = [user.user_id];
    let paramCount = 2;

    // Add pagination
    const limitValue = limit ? parseInt(limit as string) : 20;
    const offsetValue = offset ? parseInt(offset as string) : 0;

    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limitValue, offsetValue);

    const result = await pool.query(query, params);

    // Get total count
    const countResult = await pool.query("SELECT COUNT(*) FROM Favourites WHERE user_id = $1", [user.user_id]);
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
  } catch (err: any) {
    console.error("Error fetching favourites:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch favourites",
      details: err.message,
    });
  }
};

// CHECK IF HOTEL IS IN USER'S FAVOURITES (Authenticated)
export const checkFavourite = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { hotelId } = req.params;

    // Check if hotel exists
    const hotelCheck = await pool.query("SELECT * FROM Hotels WHERE hotel_id = $1", [hotelId]);
    if (hotelCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Hotel not found",
      });
    }

    // Check if in favourites
    const favouriteCheck = await pool.query(
      "SELECT * FROM Favourites WHERE user_id = $1 AND hotel_id = $2",
      [user.user_id, hotelId]
    );

    res.json({
      success: true,
      is_favourite: favouriteCheck.rows.length > 0,
      data: favouriteCheck.rows.length > 0 ? favouriteCheck.rows[0] : null,
    });
  } catch (err: any) {
    console.error("Error checking favourite:", err);
    res.status(500).json({
      success: false,
      error: "Failed to check favourite",
      details: err.message,
    });
  }
};

// GET FAVOURITES BY USER ID (Admin or own user)
export const getFavouritesByUser = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { userId } = req.params;
    const { limit, offset } = req.query;

    // Check permissions (user can only view their own favourites, admin can view any)
    if (user.role !== "admin" && user.user_id !== parseInt(userId)) {
      return res.status(403).json({
        success: false,
        error: "Access denied. You can only view your own favourites.",
      });
    }

    let query = `
      SELECT 
        f.favourite_id,
        f.hotel_id,
        f.created_at as favourited_at,
        h.hotel_name,
        h.city,
        h.country,
        h.star_rating
      FROM Favourites f
      INNER JOIN Hotels h ON f.hotel_id = h.hotel_id
      WHERE f.user_id = $1
      ORDER BY f.created_at DESC
    `;

    const params: any[] = [userId];
    let paramCount = 2;

    // Add pagination
    const limitValue = limit ? parseInt(limit as string) : 20;
    const offsetValue = offset ? parseInt(offset as string) : 0;

    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limitValue, offsetValue);

    const result = await pool.query(query, params);

    // Get total count
    const countResult = await pool.query("SELECT COUNT(*) FROM Favourites WHERE user_id = $1", [userId]);
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
  } catch (err: any) {
    console.error("Error fetching favourites by user:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch favourites",
      details: err.message,
    });
  }
};


