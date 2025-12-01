"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteHotelPhoto = exports.addHotelPhoto = exports.deleteHotel = exports.updateHotel = exports.createHotel = exports.getHotelById = exports.getAllHotels = void 0;
const database_1 = __importDefault(require("../config/database"));
const currency_1 = require("../utils/currency");
const validation_1 = require("../utils/validation");
const userMiddleware_1 = require("../middleware/userMiddleware");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// GET ALL HOTELS (Public - with optional search/filter)
// Branch admins only see their assigned hotels
const getAllHotels = async (req, res) => {
    try {
        const { city, country, minRating, maxRating, search, limit, offset } = req.query;
        const user = req.user; // May be undefined for public access
        // Validate pagination params
        const paginationValidation = (0, validation_1.validatePaginationParams)(limit, offset);
        if (!paginationValidation.valid) {
            return res.status(400).json({
                success: false,
                error: paginationValidation.error
            });
        }
        // Validate minRating if provided
        if (minRating !== undefined) {
            const minRatingValidation = (0, validation_1.validatePositiveInteger)(minRating, "Minimum rating");
            if (!minRatingValidation.valid) {
                return res.status(400).json({
                    success: false,
                    error: minRatingValidation.error
                });
            }
            if (minRatingValidation.parsed < 1 || minRatingValidation.parsed > 5) {
                return res.status(400).json({
                    success: false,
                    error: "Minimum rating must be between 1 and 5"
                });
            }
        }
        // Validate maxRating if provided
        if (maxRating !== undefined) {
            const maxRatingValidation = (0, validation_1.validatePositiveInteger)(maxRating, "Maximum rating");
            if (!maxRatingValidation.valid) {
                return res.status(400).json({
                    success: false,
                    error: maxRatingValidation.error
                });
            }
            if (maxRatingValidation.parsed < 1 || maxRatingValidation.parsed > 5) {
                return res.status(400).json({
                    success: false,
                    error: "Maximum rating must be between 1 and 5"
                });
            }
        }
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
                    pagination: {
                        total: 0,
                        limit: paginationValidation.limitValue,
                        offset: paginationValidation.offsetValue,
                        hasMore: false
                    }
                });
            }
            conditions.push(`h.hotel_id = ANY($${paramCount}::int[])`);
            params.push(user.assigned_hotel_ids);
            paramCount++;
        }
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
        if (minRating !== undefined) {
            const minRatingValidation = (0, validation_1.validatePositiveInteger)(minRating, "Minimum rating");
            conditions.push(`h.star_rating >= $${paramCount}`);
            params.push(minRatingValidation.parsed);
            paramCount++;
        }
        // Filter by maximum star rating
        if (maxRating !== undefined) {
            const maxRatingValidation = (0, validation_1.validatePositiveInteger)(maxRating, "Maximum rating");
            conditions.push(`h.star_rating <= $${paramCount}`);
            params.push(maxRatingValidation.parsed);
            paramCount++;
        }
        if (conditions.length > 0) {
            query += ` WHERE ${conditions.join(" AND ")}`;
        }
        query += ` GROUP BY h.hotel_id`;
        // Add pagination
        const limitValue = paginationValidation.limitValue;
        const offsetValue = paginationValidation.offsetValue;
        query += ` ORDER BY h.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limitValue, offsetValue);
        const result = await database_1.default.query(query, params);
        // Get total count for pagination
        let countQuery = "SELECT COUNT(*) FROM Hotels h";
        if (conditions.length > 0) {
            countQuery += ` WHERE ${conditions.join(" AND ")}`;
        }
        const countParams = params.slice(0, -2); // Remove limit and offset
        const countResult = await database_1.default.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].count);
        res.json({
            success: true,
            data: result.rows,
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
        console.error("Error fetching hotels:", err?.message || "Unknown error");
        res.status(500).json({
            success: false,
            error: "Failed to fetch hotels",
            details: err.message,
        });
    }
};
exports.getAllHotels = getAllHotels;
// GET HOTEL BY ID (Public)
const getHotelById = async (req, res) => {
    try {
        const { id } = req.params;
        // Validate hotel ID
        const hotelIdValidation = (0, validation_1.validatePositiveInteger)(id, "Hotel ID");
        if (!hotelIdValidation.valid) {
            return res.status(400).json({
                success: false,
                error: hotelIdValidation.error
            });
        }
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
        const hotelResult = await database_1.default.query(hotelQuery, [hotelIdValidation.parsed]);
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
        const roomsResult = await database_1.default.query(roomsQuery, [hotelIdValidation.parsed]);
        // Get average rating from reviews
        const reviewsQuery = `
      SELECT 
        COUNT(*) as total_reviews,
        AVG(rating) as average_rating
      FROM Reviews
      WHERE hotel_id = $1
    `;
        const reviewsResult = await database_1.default.query(reviewsQuery, [hotelIdValidation.parsed]);
        const minPrice = parseFloat(roomsResult.rows[0].min_price || "0");
        const maxPrice = parseFloat(roomsResult.rows[0].max_price || "0");
        const hotel = {
            ...hotelResult.rows[0],
            room_stats: {
                total_rooms: parseInt(roomsResult.rows[0].total_rooms || "0"),
                available_rooms: parseInt(roomsResult.rows[0].available_rooms || "0"),
                min_price: minPrice,
                max_price: maxPrice,
                min_price_info: minPrice > 0 ? (0, currency_1.addCurrencyInfo)(minPrice) : null,
                max_price_info: maxPrice > 0 ? (0, currency_1.addCurrencyInfo)(maxPrice) : null,
            },
            review_stats: {
                total_reviews: parseInt(reviewsResult.rows[0].total_reviews || "0"),
                average_rating: parseFloat(reviewsResult.rows[0].average_rating || "0"),
            },
        };
        res.json({
            success: true,
            data: hotel,
            currency: currency_1.DEFAULT_CURRENCY,
        });
    }
    catch (err) {
        console.error("Error fetching hotel:", err?.message || "Unknown error");
        res.status(500).json({
            success: false,
            error: "Failed to fetch hotel",
            details: err.message,
        });
    }
};
exports.getHotelById = getHotelById;
// CREATE HOTEL (Super Admin only, or Branch Admin creates for their assigned hotel)
const createHotel = async (req, res) => {
    try {
        const user = req.user;
        const { hotel_name, address, city, country, price_range, star_rating, amenities } = req.body;
        // Only super admin can create hotels (branch admins cannot create new hotels)
        if (user.role !== "super_admin") {
            return res.status(403).json({
                success: false,
                error: "Access Denied: Only Super Admin can create hotels"
            });
        }
        // Validate required fields
        const hotelNameValidation = (0, validation_1.validateStringLength)(hotel_name, "Hotel name", 1, 255);
        if (!hotelNameValidation.valid) {
            return res.status(400).json({
                success: false,
                error: hotelNameValidation.error
            });
        }
        const addressValidation = (0, validation_1.validateStringLength)(address, "Address", 1, 255);
        if (!addressValidation.valid) {
            return res.status(400).json({
                success: false,
                error: addressValidation.error
            });
        }
        const cityValidation = (0, validation_1.validateStringLength)(city, "City", 1, 100);
        if (!cityValidation.valid) {
            return res.status(400).json({
                success: false,
                error: cityValidation.error
            });
        }
        const countryValidation = (0, validation_1.validateStringLength)(country, "Country", 1, 100);
        if (!countryValidation.valid) {
            return res.status(400).json({
                success: false,
                error: countryValidation.error
            });
        }
        const priceRangeValidation = (0, validation_1.validateStringLength)(price_range, "Price range", 1, 100);
        if (!priceRangeValidation.valid) {
            return res.status(400).json({
                success: false,
                error: priceRangeValidation.error
            });
        }
        // Validate star rating if provided
        if (star_rating !== undefined && star_rating !== null) {
            const starRatingValidation = (0, validation_1.validatePositiveInteger)(star_rating, "Star rating");
            if (!starRatingValidation.valid) {
                return res.status(400).json({
                    success: false,
                    error: starRatingValidation.error
                });
            }
            if (starRatingValidation.parsed < 1 || starRatingValidation.parsed > 5) {
                return res.status(400).json({
                    success: false,
                    error: "Star rating must be between 1 and 5",
                });
            }
        }
        // Insert hotel
        const insertQuery = `
      INSERT INTO Hotels (hotel_name, address, city, country, price_range, star_rating, amenities)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
        const amenitiesArray = Array.isArray(amenities) ? amenities : amenities ? [amenities] : [];
        const result = await database_1.default.query(insertQuery, [
            hotelNameValidation.trimmed,
            addressValidation.trimmed,
            cityValidation.trimmed,
            countryValidation.trimmed,
            priceRangeValidation.trimmed,
            star_rating !== undefined && star_rating !== null ? (0, validation_1.validatePositiveInteger)(star_rating, "Star rating").parsed : null,
            amenitiesArray,
        ]);
        res.status(201).json({
            success: true,
            message: "Hotel created successfully",
            data: result.rows[0],
        });
    }
    catch (err) {
        console.error("Error creating hotel:", err?.message || "Unknown error");
        res.status(500).json({
            success: false,
            error: "Failed to create hotel",
            details: err.message,
        });
    }
};
exports.createHotel = createHotel;
// UPDATE HOTEL (Admin only - with hotel access check)
const updateHotel = async (req, res) => {
    try {
        const user = req.user;
        const { id } = req.params;
        const { hotel_name, address, city, country, price_range, star_rating, amenities } = req.body;
        // Validate hotel ID
        const hotelIdValidation = (0, validation_1.validatePositiveInteger)(id, "Hotel ID");
        if (!hotelIdValidation.valid) {
            return res.status(400).json({
                success: false,
                error: hotelIdValidation.error
            });
        }
        // Check if hotel exists
        const checkQuery = "SELECT * FROM Hotels WHERE hotel_id = $1";
        const checkResult = await database_1.default.query(checkQuery, [hotelIdValidation.parsed]);
        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Hotel not found",
            });
        }
        // Check hotel access (branch admin must have access to this hotel)
        const hasAccess = await (0, userMiddleware_1.checkHotelAccess)(user.user_id, user.role, hotelIdValidation.parsed);
        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                error: "Access Denied: You do not have access to this hotel"
            });
        }
        // Validate star rating if provided
        if (star_rating !== undefined && star_rating !== null) {
            const starRatingValidation = (0, validation_1.validatePositiveInteger)(star_rating, "Star rating");
            if (!starRatingValidation.valid) {
                return res.status(400).json({
                    success: false,
                    error: starRatingValidation.error
                });
            }
            if (starRatingValidation.parsed < 1 || starRatingValidation.parsed > 5) {
                return res.status(400).json({
                    success: false,
                    error: "Star rating must be between 1 and 5",
                });
            }
        }
        // Validate string lengths if provided
        if (hotel_name !== undefined) {
            const hotelNameValidation = (0, validation_1.validateStringLength)(hotel_name, "Hotel name", 1, 255);
            if (!hotelNameValidation.valid) {
                return res.status(400).json({
                    success: false,
                    error: hotelNameValidation.error
                });
            }
        }
        if (address !== undefined) {
            const addressValidation = (0, validation_1.validateStringLength)(address, "Address", 1, 255);
            if (!addressValidation.valid) {
                return res.status(400).json({
                    success: false,
                    error: addressValidation.error
                });
            }
        }
        if (city !== undefined) {
            const cityValidation = (0, validation_1.validateStringLength)(city, "City", 1, 100);
            if (!cityValidation.valid) {
                return res.status(400).json({
                    success: false,
                    error: cityValidation.error
                });
            }
        }
        if (country !== undefined) {
            const countryValidation = (0, validation_1.validateStringLength)(country, "Country", 1, 100);
            if (!countryValidation.valid) {
                return res.status(400).json({
                    success: false,
                    error: countryValidation.error
                });
            }
        }
        if (price_range !== undefined) {
            const priceRangeValidation = (0, validation_1.validateStringLength)(price_range, "Price range", 1, 100);
            if (!priceRangeValidation.valid) {
                return res.status(400).json({
                    success: false,
                    error: priceRangeValidation.error
                });
            }
        }
        // Build update query dynamically
        const updates = [];
        const params = [];
        let paramCount = 1;
        if (hotel_name !== undefined) {
            const hotelNameValidation = (0, validation_1.validateStringLength)(hotel_name, "Hotel name", 1, 255);
            updates.push(`hotel_name = $${paramCount++}`);
            params.push(hotelNameValidation.trimmed);
        }
        if (address !== undefined) {
            const addressValidation = (0, validation_1.validateStringLength)(address, "Address", 1, 255);
            updates.push(`address = $${paramCount++}`);
            params.push(addressValidation.trimmed);
        }
        if (city !== undefined) {
            const cityValidation = (0, validation_1.validateStringLength)(city, "City", 1, 100);
            updates.push(`city = $${paramCount++}`);
            params.push(cityValidation.trimmed);
        }
        if (country !== undefined) {
            const countryValidation = (0, validation_1.validateStringLength)(country, "Country", 1, 100);
            updates.push(`country = $${paramCount++}`);
            params.push(countryValidation.trimmed);
        }
        if (price_range !== undefined) {
            const priceRangeValidation = (0, validation_1.validateStringLength)(price_range, "Price range", 1, 100);
            updates.push(`price_range = $${paramCount++}`);
            params.push(priceRangeValidation.trimmed);
        }
        if (star_rating !== undefined && star_rating !== null) {
            const starRatingValidation = (0, validation_1.validatePositiveInteger)(star_rating, "Star rating");
            updates.push(`star_rating = $${paramCount++}`);
            params.push(starRatingValidation.parsed);
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
        params.push(hotelIdValidation.parsed);
        const updateQuery = `
      UPDATE Hotels
      SET ${updates.join(", ")}
      WHERE hotel_id = $${paramCount}
      RETURNING *
    `;
        const result = await database_1.default.query(updateQuery, params);
        res.json({
            success: true,
            message: "Hotel updated successfully",
            data: result.rows[0],
        });
    }
    catch (err) {
        console.error("Error updating hotel:", err?.message || "Unknown error");
        res.status(500).json({
            success: false,
            error: "Failed to update hotel",
            details: err.message,
        });
    }
};
exports.updateHotel = updateHotel;
// DELETE HOTEL (Super Admin only)
const deleteHotel = async (req, res) => {
    try {
        const user = req.user;
        const { id } = req.params;
        // Only super admin can delete hotels
        if (user.role !== "super_admin") {
            return res.status(403).json({
                success: false,
                error: "Access Denied: Only Super Admin can delete hotels"
            });
        }
        // Validate hotel ID
        const hotelIdValidation = (0, validation_1.validatePositiveInteger)(id, "Hotel ID");
        if (!hotelIdValidation.valid) {
            return res.status(400).json({
                success: false,
                error: hotelIdValidation.error
            });
        }
        // Check if hotel exists
        const checkQuery = "SELECT * FROM Hotels WHERE hotel_id = $1";
        const checkResult = await database_1.default.query(checkQuery, [hotelIdValidation.parsed]);
        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Hotel not found",
            });
        }
        // Delete hotel (cascade will delete related rooms, photos, bookings, etc.)
        const deleteQuery = "DELETE FROM Hotels WHERE hotel_id = $1 RETURNING *";
        const result = await database_1.default.query(deleteQuery, [hotelIdValidation.parsed]);
        res.json({
            success: true,
            message: "Hotel deleted successfully",
            data: result.rows[0],
        });
    }
    catch (err) {
        console.error("Error deleting hotel:", err?.message || "Unknown error");
        res.status(500).json({
            success: false,
            error: "Failed to delete hotel",
            details: err.message,
        });
    }
};
exports.deleteHotel = deleteHotel;
// ADD HOTEL PHOTO (Admin only) - Supports file upload or URL
const addHotelPhoto = async (req, res) => {
    try {
        const user = req.user;
        const { id } = req.params;
        const { photo_url } = req.body;
        const file = req.file;
        // Validate hotel ID
        const hotelIdValidation = (0, validation_1.validatePositiveInteger)(id, "Hotel ID");
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
        // Check if hotel exists
        const checkQuery = "SELECT * FROM Hotels WHERE hotel_id = $1";
        const checkResult = await database_1.default.query(checkQuery, [hotelIdValidation.parsed]);
        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Hotel not found",
            });
        }
        let finalPhotoUrl;
        // Check if file was uploaded
        if (file) {
            // Use uploaded file path
            finalPhotoUrl = `/uploads/${file.filename}`;
        }
        else if (photo_url) {
            // Use provided URL
            finalPhotoUrl = photo_url;
        }
        else {
            return res.status(400).json({
                success: false,
                error: "Either a photo file or photo_url is required",
            });
        }
        const parsedHotelId = hotelIdValidation.parsed;
        // Validate URL format if provided
        if (photo_url && !file) {
            try {
                new URL(photo_url);
            }
            catch {
                return res.status(400).json({
                    success: false,
                    error: "Invalid photo_url format. Must be a valid URL.",
                });
            }
        }
        // Insert photo
        const insertQuery = `
      INSERT INTO HotelPhotos (hotel_id, photo_url)
      VALUES ($1, $2)
      RETURNING *
    `;
        const result = await database_1.default.query(insertQuery, [parsedHotelId, finalPhotoUrl]);
        res.status(201).json({
            success: true,
            message: "Photo added successfully",
            data: result.rows[0],
            upload_method: file ? "file_upload" : "url",
        });
    }
    catch (err) {
        console.error("Error adding hotel photo:", err?.message || "Unknown error");
        res.status(500).json({
            success: false,
            error: "Failed to add photo",
            details: err.message,
        });
    }
};
exports.addHotelPhoto = addHotelPhoto;
// DELETE HOTEL PHOTO (Admin only)
const deleteHotelPhoto = async (req, res) => {
    try {
        const user = req.user;
        const { id, photoId } = req.params;
        // Validate hotel ID
        const hotelIdValidation = (0, validation_1.validatePositiveInteger)(id, "Hotel ID");
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
        // Check if photo exists
        const checkQuery = `
      SELECT * FROM HotelPhotos 
      WHERE photo_id = $1 AND hotel_id = $2
    `;
        const checkResult = await database_1.default.query(checkQuery, [photoId, hotelIdValidation.parsed]);
        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Photo not found",
            });
        }
        const photo = checkResult.rows[0];
        const photoUrl = photo.photo_url;
        // Delete photo from database
        const deleteQuery = "DELETE FROM HotelPhotos WHERE photo_id = $1 RETURNING *";
        const result = await database_1.default.query(deleteQuery, [photoId]);
        // Delete file from disk if it's a local upload (starts with /uploads/)
        if (photoUrl && photoUrl.startsWith('/uploads/')) {
            try {
                const filePath = path_1.default.join(process.cwd(), 'public', photoUrl);
                if (fs_1.default.existsSync(filePath)) {
                    fs_1.default.unlinkSync(filePath);
                }
            }
            catch (fileError) {
                // Log error but don't fail the request if file deletion fails
                console.warn("Failed to delete photo file from disk:", fileError?.message || "Unknown error");
            }
        }
        res.json({
            success: true,
            message: "Photo deleted successfully",
            data: result.rows[0],
        });
    }
    catch (err) {
        console.error("Error deleting hotel photo:", err?.message || "Unknown error");
        res.status(500).json({
            success: false,
            error: "Failed to delete photo",
            details: err.message,
        });
    }
};
exports.deleteHotelPhoto = deleteHotelPhoto;
