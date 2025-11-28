import { Router } from "express";
import {
  createBranchAdmin,
  assignHotelToAdmin,
  removeHotelFromAdmin,
  getAllAdmins,
  getAdminById
} from "../controllers/adminController";
import { verifyAuth, requireSuperAdmin } from "../middleware/userMiddleware";

const router = Router();

// All routes require super admin access
router.use(verifyAuth);
router.use(requireSuperAdmin);

// Admin user management
router.post("/users", createBranchAdmin);
router.get("/users", getAllAdmins);
router.get("/users/:userId", getAdminById);

// Hotel assignment management
router.post("/users/:userId/hotels/:hotelId", assignHotelToAdmin);
router.delete("/users/:userId/hotels/:hotelId", removeHotelFromAdmin);

export default router;

