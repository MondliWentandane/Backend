"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteReview = exports.updateReview = exports.getReviewById = exports.getReviewsByUser = exports.getReviewsByHotel = exports.createReview = void 0;
const database_1 = __importDefault(require("../config/database"));
const validation_1 = require("../utils/validation");
// CREATE REVIEW (Authenticated users)
const createReview = async (req, res) => {
    try {
        const user = req.user;
        const { hotel_id, rating, comment } = req.body;
        // Validate hotel_id
        const hotelIdValidation = (0, validation_1.validatePositiveInteger)(hotel_id, "Hotel ID");
        if (!hotelIdValidation.valid) {
            return res.status(400).json({
                success: false,
                error: hotelIdValidation.error
            });
        }
        // Validate rating
        if (rating === undefined || rating === null) {
            return res.status(400).json({
                success: false,
                error: "Rating is required"
            });
        }
        const ratingValidation = (0, validation_1.validatePositiveInteger)(rating, "Rating");
        if (!ratingValidation.valid) {
            return res.status(400).json({
                success: false,
                error: ratingValidation.error
            });
        }
        if (ratingValidation.parsed < 1 || ratingValidation.parsed > 5) {
            return res.status(400).json({
                success: false,
                error: "Rating must be between 1 and 5",
            });
        }
        // Validate comment if provided
        if (comment !== undefined && comment !== null) {
            const commentValidation = (0, validation_1.validateStringLength)(comment, "Comment", 0, 2000);
            if (!commentValidation.valid) {
                return res.status(400).json({
                    success: false,
                    error: commentValidation.error
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
        // Check if user already reviewed this hotel
        const existingReview = await database_1.default.query("SELECT * FROM Reviews WHERE user_id = $1 AND hotel_id = $2", [user.user_id, hotelIdValidation.parsed]);
        if (existingReview.rows.length > 0) {
            return res.status(400).json({
                success: false,
                error: "You have already reviewed this hotel. You can update your existing review instead.",
            });
        }
        // Create review
        const insertQuery = `
      INSERT INTO Reviews (user_id, hotel_id, rating, comment)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
        const result = await database_1.default.query(insertQuery, [
            user.user_id,
            hotelIdValidation.parsed,
            ratingValidation.parsed,
            comment !== undefined && comment !== null ? (0, validation_1.validateStringLength)(comment, "Comment", 0, 2000).trimmed : null,
        ]);
        res.status(201).json({
            success: true,
            message: "Review created successfully",
            data: result.rows[0],
        });
    }
    catch (err) {
        console.error("Error creating review:", err?.message || "Unknown error");
        res.status(500).json({
            success: false,
            error: "Failed to create review",
            details: err.message,
        });
    }
};
exports.createReview = createReview;
// GET REVIEWS BY HOTEL (Public)
const getReviewsByHotel = async (req, res) => {
    try {
        const { hotelId } = req.params;
        const { limit, offset, minRating } = req.query;
        // Validate hotel ID
        const hotelIdValidation = (0, validation_1.validatePositiveInteger)(hotelId, "Hotel ID");
        if (!hotelIdValidation.valid) {
            return res.status(400).json({
                success: false,
                error: hotelIdValidation.error
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
        r.review_id,
        r.user_id,
        r.hotel_id,
        r.rating,
        r.comment,
        r.created_at,
        r.updated_at,
        u.name as user_name,
        u.email as user_email
      FROM Reviews r
      INNER JOIN Users u ON r.user_id = u.user_id
      WHERE r.hotel_id = $1
    `;
        const params = [hotelIdValidation.parsed];
        let paramCount = 2;
        // Filter by minimum rating
        if (minRating !== undefined) {
            const minRatingValidation = (0, validation_1.validatePositiveInteger)(minRating, "Minimum rating");
            query += ` AND r.rating >= $${paramCount}`;
            params.push(minRatingValidation.parsed);
            paramCount++;
        }
        query += ` ORDER BY r.created_at DESC`;
        // Add pagination
        const limitValue = paginationValidation.limitValue;
        const offsetValue = paginationValidation.offsetValue;
        query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limitValue, offsetValue);
        const result = await database_1.default.query(query, params);
        // Get total count and average rating
        let countQuery = "SELECT COUNT(*) as count, AVG(rating) as avg_rating FROM Reviews WHERE hotel_id = $1";
        const countParams = [hotelId];
        if (minRating) {
            countQuery += ` AND rating >= $2`;
            countParams.push(parseInt(minRating));
        }
        const countResult = await database_1.default.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].count);
        const avgRating = countResult.rows[0].avg_rating ? parseFloat(countResult.rows[0].avg_rating) : 0;
        res.json({
            success: true,
            data: result.rows,
            stats: {
                total_reviews: total,
                average_rating: Math.round(avgRating * 10) / 10, // Round to 1 decimal
            },
            pagination: {
                total,
                limit: limitValue,
                offset: offsetValue,
                hasMore: offsetValue + limitValue < total,
            },
        });
    }
    catch (err) {
        console.error("Error fetching reviews by hotel:", err?.message || "Unknown error");
        res.status(500).json({
            success: false,
            error: "Failed to fetch reviews",
            details: err.message,
        });
    }
};
exports.getReviewsByHotel = getReviewsByHotel;
// GET REVIEWS BY USER (Authenticated - can only see own reviews)
const getReviewsByUser = async (req, res) => {
    try {
        const user = req.user;
        const { userId } = req.params;
        const { limit, offset } = req.query;
        // Check if user is viewing their own reviews or is admin
        if (user.role !== "admin" && user.user_id !== parseInt(userId)) {
            return res.status(403).json({
                success: false,
                error: "Access denied. You can only view your own reviews.",
            });
        }
        let query = `
      SELECT 
        r.review_id,
        r.user_id,
        r.hotel_id,
        r.rating,
        r.comment,
        r.created_at,
        r.updated_at,
        h.hotel_name,
        h.city,
        h.country
      FROM Reviews r
      INNER JOIN Hotels h ON r.hotel_id = h.hotel_id
      WHERE r.user_id = $1
      ORDER BY r.created_at DESC
    `;
        const params = [userId];
        let paramCount = 2;
        // Add pagination
        const limitValue = limit ? parseInt(limit) : 20;
        const offsetValue = offset ? parseInt(offset) : 0;
        query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limitValue, offsetValue);
        const result = await database_1.default.query(query, params);
        // Get total count
        const countResult = await database_1.default.query("SELECT COUNT(*) FROM Reviews WHERE user_id = $1", [userId]);
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
        console.error("Error fetching reviews by user:", err?.message || "Unknown error");
        res.status(500).json({
            success: false,
            error: "Failed to fetch reviews",
            details: err.message,
        });
    }
};
exports.getReviewsByUser = getReviewsByUser;
// GET REVIEW BY ID (Public)
const getReviewById = async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
      SELECT 
        r.review_id,
        r.user_id,
        r.hotel_id,
        r.rating,
        r.comment,
        r.created_at,
        r.updated_at,
        u.name as user_name,
        u.email as user_email,
        h.hotel_name,
        h.city,
        h.country
      FROM Reviews r
      INNER JOIN Users u ON r.user_id = u.user_id
      INNER JOIN Hotels h ON r.hotel_id = h.hotel_id
      WHERE r.review_id = $1
    `;
        const result = await database_1.default.query(query, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Review not found",
            });
        }
        res.json({
            success: true,
            data: result.rows[0],
        });
    }
    catch (err) {
        console.error("Error fetching review:", err?.message || "Unknown error");
        res.status(500).json({
            success: false,
            error: "Failed to fetch review",
            details: err.message,
        });
    }
};
exports.getReviewById = getReviewById;
// UPDATE REVIEW (Authenticated - can only update own review)
const updateReview = async (req, res) => {
    try {
        const user = req.user;
        const { id } = req.params;
        const { rating, comment } = req.body;
        // Validate review ID
        const reviewIdValidation = (0, validation_1.validatePositiveInteger)(id, "Review ID");
        if (!reviewIdValidation.valid) {
            return res.status(400).json({
                success: false,
                error: reviewIdValidation.error
            });
        }
        // Validate rating if provided
        if (rating !== undefined && rating !== null) {
            const ratingValidation = (0, validation_1.validatePositiveInteger)(rating, "Rating");
            if (!ratingValidation.valid) {
                return res.status(400).json({
                    success: false,
                    error: ratingValidation.error
                });
            }
            if (ratingValidation.parsed < 1 || ratingValidation.parsed > 5) {
                return res.status(400).json({
                    success: false,
                    error: "Rating must be between 1 and 5",
                });
            }
        }
        // Validate comment if provided
        if (comment !== undefined && comment !== null) {
            const commentValidation = (0, validation_1.validateStringLength)(comment, "Comment", 0, 2000);
            if (!commentValidation.valid) {
                return res.status(400).json({
                    success: false,
                    error: commentValidation.error
                });
            }
        }
        // Check if review exists
        const checkQuery = "SELECT * FROM Reviews WHERE review_id = $1";
        const checkResult = await database_1.default.query(checkQuery, [reviewIdValidation.parsed]);
        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Review not found",
            });
        }
        const review = checkResult.rows[0];
        // Check permissions (user can only update their own reviews, admin can update any)
        if (user.role !== "admin" && review.user_id !== user.user_id) {
            return res.status(403).json({
                success: false,
                error: "Access denied. You can only update your own reviews.",
            });
        }
        // Validate rating if provided
        if (rating !== undefined && (rating < 1 || rating > 5)) {
            return res.status(400).json({
                success: false,
                error: "Rating must be between 1 and 5",
            });
        }
        // Build update query
        const updates = [];
        const params = [];
        let paramCount = 1;
        if (rating !== undefined) {
            updates.push(`rating = $${paramCount++}`);
            params.push(rating);
        }
        if (comment !== undefined) {
            updates.push(`comment = $${paramCount++}`);
            params.push(comment);
        }
        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                error: "No fields to update",
            });
        }
        updates.push(`updated_at = NOW()`);
        params.push(reviewIdValidation.parsed);
        const updateQuery = `
      UPDATE Reviews
      SET ${updates.join(", ")}
      WHERE review_id = $${paramCount}
      RETURNING *
    `;
        const result = await database_1.default.query(updateQuery, params);
        res.json({
            success: true,
            message: "Review updated successfully",
            data: result.rows[0],
        });
    }
    catch (err) {
        console.error("Error updating review:", err?.message || "Unknown error");
        res.status(500).json({
            success: false,
            error: "Failed to update review",
            details: err.message,
        });
    }
};
exports.updateReview = updateReview;
// DELETE REVIEW (Authenticated - can only delete own review or admin can delete any)
const deleteReview = async (req, res) => {
    try {
        const user = req.user;
        const { id } = req.params;
        // Validate review ID
        const reviewIdValidation = (0, validation_1.validatePositiveInteger)(id, "Review ID");
        if (!reviewIdValidation.valid) {
            return res.status(400).json({
                success: false,
                error: reviewIdValidation.error
            });
        }
        // Check if review exists
        const checkQuery = "SELECT * FROM Reviews WHERE review_id = $1";
        const checkResult = await database_1.default.query(checkQuery, [reviewIdValidation.parsed]);
        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Review not found",
            });
        }
        const review = checkResult.rows[0];
        // Check permissions (user can only delete their own reviews, admin can delete any)
        if (user.role !== "admin" && review.user_id !== user.user_id) {
            return res.status(403).json({
                success: false,
                error: "Access denied. You can only delete your own reviews.",
            });
        }
        // Delete review
        const deleteQuery = "DELETE FROM Reviews WHERE review_id = $1 RETURNING *";
        const result = await database_1.default.query(deleteQuery, [reviewIdValidation.parsed]);
        res.json({
            success: true,
            message: "Review deleted successfully",
            data: result.rows[0],
        });
    }
    catch (err) {
        console.error("Error deleting review:", err?.message || "Unknown error");
        res.status(500).json({
            success: false,
            error: "Failed to delete review",
            details: err.message,
        });
    }
};
exports.deleteReview = deleteReview;
