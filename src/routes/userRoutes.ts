import { Router } from "express";
import {
  getMyProfile,
  updateProfile,
  getUserById,
} from "../controllers/userController";
import { verifyAuth } from "../middleware/userMiddleware";

const router = Router();

// All routes require authentication
router.get("/profile", verifyAuth, getMyProfile); // GET /api/users/profile - Get own profile
router.put("/profile", verifyAuth, updateProfile); // PUT /api/users/profile - Update own profile
router.put("/profile/:userId", verifyAuth, updateProfile); // PUT /api/users/profile/:userId - Update user profile (admin)
router.get("/:userId", verifyAuth, getUserById); // GET /api/users/:userId - Get user by ID (admin or own)

export default router;
