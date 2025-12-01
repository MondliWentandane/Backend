"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const roomController_1 = require("../controllers/roomController");
const userMiddleware_1 = require("../middleware/userMiddleware");
const uploadMiddleware_1 = require("../middleware/uploadMiddleware");
const router = (0, express_1.Router)();
// Public routes (no authentication required)
router.get("/", roomController_1.getAllRooms); // GET /api/rooms - Get all rooms with filters
router.get("/hotel/:hotelId", roomController_1.getRoomsByHotel); // GET /api/rooms/hotel/:hotelId - Get rooms by hotel
router.get("/:id", roomController_1.getRoomById); // GET /api/rooms/:id - Get room by ID
router.get("/:roomId/availability", roomController_1.checkRoomAvailability); // GET /api/rooms/:roomId/availability - Check room availability
// Admin routes (authentication + admin role required)
router.post("/", userMiddleware_1.verifyAuth, userMiddleware_1.requireAdmin, roomController_1.createRoom); // POST /api/rooms - Create room
router.put("/:id", userMiddleware_1.verifyAuth, userMiddleware_1.requireAdmin, roomController_1.updateRoom); // PUT /api/rooms/:id - Update room
router.delete("/:id", userMiddleware_1.verifyAuth, userMiddleware_1.requireAdmin, roomController_1.deleteRoom); // DELETE /api/rooms/:id - Delete room
router.patch("/:id/availability", userMiddleware_1.verifyAuth, userMiddleware_1.requireAdmin, roomController_1.updateRoomAvailability); // PATCH /api/rooms/:id/availability - Update room availability
// Room photos management (Admin only)
router.post("/:id/photos", userMiddleware_1.verifyAuth, userMiddleware_1.requireAdmin, uploadMiddleware_1.uploadSingle, uploadMiddleware_1.handleUploadError, roomController_1.addRoomPhoto); // POST /api/rooms/:id/photos - Add photo (supports file upload or photo_url)
router.delete("/:id/photos/:photoId", userMiddleware_1.verifyAuth, userMiddleware_1.requireAdmin, roomController_1.deleteRoomPhoto); // DELETE /api/rooms/:id/photos/:photoId - Delete photo
exports.default = router;
