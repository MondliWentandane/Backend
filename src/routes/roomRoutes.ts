import { Router } from "express";
import {
  getAllRooms,
  getRoomsByHotel,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
  updateRoomAvailability,
  addRoomPhoto,
  deleteRoomPhoto,
  checkRoomAvailability,
} from "../controllers/roomController";
import { verifyAuth, requireAdmin } from "../middleware/userMiddleware";

const router = Router();

// Public routes (no authentication required)
router.get("/", getAllRooms); // GET /api/rooms - Get all rooms with filters
router.get("/hotel/:hotelId", getRoomsByHotel); // GET /api/rooms/hotel/:hotelId - Get rooms by hotel
router.get("/:id", getRoomById); // GET /api/rooms/:id - Get room by ID
router.get("/:roomId/availability", checkRoomAvailability); // GET /api/rooms/:roomId/availability - Check room availability

// Admin routes (authentication + admin role required)
router.post("/", verifyAuth, requireAdmin, createRoom); // POST /api/rooms - Create room
router.put("/:id", verifyAuth, requireAdmin, updateRoom); // PUT /api/rooms/:id - Update room
router.delete("/:id", verifyAuth, requireAdmin, deleteRoom); // DELETE /api/rooms/:id - Delete room
router.patch("/:id/availability", verifyAuth, requireAdmin, updateRoomAvailability); // PATCH /api/rooms/:id/availability - Update room availability

// Room photos management (Admin only)
router.post("/:id/photos", verifyAuth, requireAdmin, addRoomPhoto); // POST /api/rooms/:id/photos - Add photo
router.delete("/:id/photos/:photoId", verifyAuth, requireAdmin, deleteRoomPhoto); // DELETE /api/rooms/:id/photos/:photoId - Delete photo

export default router;

