"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userController_1 = require("../controllers/userController");
const userMiddleware_1 = require("../middleware/userMiddleware");
const router = (0, express_1.Router)();
// All routes require authentication
router.get("/profile", userMiddleware_1.verifyAuth, userController_1.getMyProfile); // GET /api/users/profile - Get own profile
router.put("/profile", userMiddleware_1.verifyAuth, userController_1.updateProfile); // PUT /api/users/profile - Update own profile
router.put("/profile/:userId", userMiddleware_1.verifyAuth, userController_1.updateProfile); // PUT /api/users/profile/:userId - Update user profile (admin)
router.get("/:userId", userMiddleware_1.verifyAuth, userController_1.getUserById); // GET /api/users/:userId - Get user by ID (admin or own)
exports.default = router;
