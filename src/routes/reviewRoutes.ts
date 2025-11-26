import { Router } from "express";
import {
  createReview,
  getReviewsByHotel,
  getReviewsByUser,
  getReviewById,
  updateReview,
  deleteReview,
} from "../controllers/ReviewController";
import { verifyAuth } from "../middleware/userMiddleware";

const router = Router();

// Public routes
router.get("/hotel/:hotelId", getReviewsByHotel); // GET /api/reviews/hotel/:hotelId - Get reviews by hotel
router.get("/:id", getReviewById); // GET /api/reviews/:id - Get review by ID

// Authenticated routes
router.post("/", verifyAuth, createReview); // POST /api/reviews - Create review
router.get("/user/:userId", verifyAuth, getReviewsByUser); // GET /api/reviews/user/:userId - Get reviews by user
router.put("/:id", verifyAuth, updateReview); // PUT /api/reviews/:id - Update review
router.delete("/:id", verifyAuth, deleteReview); // DELETE /api/reviews/:id - Delete review

export default router;

