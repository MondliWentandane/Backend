import { Router } from "express";
import {
  getMyNotifications,
  getNotificationById,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification,
  getUnreadCount,
} from "../controllers/notificationController";
import { verifyAuth } from "../middleware/userMiddleware";

const router = Router();

// All routes require authentication
router.get("/", verifyAuth, getMyNotifications); // GET /api/notifications - Get user's notifications
router.get("/unread-count", verifyAuth, getUnreadCount); // GET /api/notifications/unread-count - Get unread count
router.get("/:id", verifyAuth, getNotificationById); // GET /api/notifications/:id - Get notification by ID
router.patch("/:id/read", verifyAuth, markAsRead); // PATCH /api/notifications/:id/read - Mark as read
router.patch("/read-all", verifyAuth, markAllAsRead); // PATCH /api/notifications/read-all - Mark all as read
router.delete("/:id", verifyAuth, deleteNotification); // DELETE /api/notifications/:id - Delete notification
router.post("/", verifyAuth, createNotification); // POST /api/notifications - Create notification (admin or own)

export default router;



