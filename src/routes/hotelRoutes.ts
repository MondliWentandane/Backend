import { Router } from "express";
import {
  getAllHotels,
  getHotelById,
  createHotel,
  updateHotel,
  deleteHotel,
  addHotelPhoto,
  deleteHotelPhoto,
} from "../controllers/hotelController";
import { verifyAuth, requireAdmin } from "../middleware/userMiddleware";

const router = Router();

// Public routes (no authentication required)
router.get("/", getAllHotels); // GET /api/hotels - Get all hotels with search/filter
router.get("/:id", getHotelById); // GET /api/hotels/:id - Get hotel by ID

// Admin routes (authentication + admin role required)
router.post("/", verifyAuth, requireAdmin, createHotel); // POST /api/hotels - Create hotel
router.put("/:id", verifyAuth, requireAdmin, updateHotel); // PUT /api/hotels/:id - Update hotel
router.delete("/:id", verifyAuth, requireAdmin, deleteHotel); // DELETE /api/hotels/:id - Delete hotel

// Hotel photos management (Admin only)
router.post("/:id/photos", verifyAuth, requireAdmin, addHotelPhoto); // POST /api/hotels/:id/photos - Add photo
router.delete("/:id/photos/:photoId", verifyAuth, requireAdmin, deleteHotelPhoto); // DELETE /api/hotels/:id/photos/:photoId - Delete photo

export default router;

