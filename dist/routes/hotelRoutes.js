"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const hotelController_1 = require("../controllers/hotelController");
const userMiddleware_1 = require("../middleware/userMiddleware");
const router = (0, express_1.Router)();
// Public routes (no authentication required)
router.get("/", hotelController_1.getAllHotels); // GET /api/hotels - Get all hotels with search/filter
router.get("/:id", hotelController_1.getHotelById); // GET /api/hotels/:id - Get hotel by ID
// Admin routes (authentication + admin role required)
router.post("/", userMiddleware_1.verifyAuth, userMiddleware_1.requireAdmin, hotelController_1.createHotel); // POST /api/hotels - Create hotel
router.put("/:id", userMiddleware_1.verifyAuth, userMiddleware_1.requireAdmin, hotelController_1.updateHotel); // PUT /api/hotels/:id - Update hotel
router.delete("/:id", userMiddleware_1.verifyAuth, userMiddleware_1.requireAdmin, hotelController_1.deleteHotel); // DELETE /api/hotels/:id - Delete hotel
// Hotel photos management (Admin only)
router.post("/:id/photos", userMiddleware_1.verifyAuth, userMiddleware_1.requireAdmin, hotelController_1.addHotelPhoto); // POST /api/hotels/:id/photos - Add photo
router.delete("/:id/photos/:photoId", userMiddleware_1.verifyAuth, userMiddleware_1.requireAdmin, hotelController_1.deleteHotelPhoto); // DELETE /api/hotels/:id/photos/:photoId - Delete photo
exports.default = router;
