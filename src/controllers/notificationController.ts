import { Request, Response } from "express";
import pool from "../config/database";
import { notification_type } from "../types/notification.types";

// GET USER'S NOTIFICATIONS (Authenticated)
export const getMyNotifications = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { is_read, type, limit, offset } = req.query;

    let query = `
      SELECT 
        n.notification_id,
        n.user_id,
        n.type,
        n.title,
        n.message,
        n.is_read,
        n.related_booking_id,
        n.created_at,
        b.booking_id,
        b.status as booking_status,
        h.hotel_name
      FROM Notifications n
      LEFT JOIN Bookings b ON n.related_booking_id = b.booking_id
      LEFT JOIN Hotels h ON b.hotel_id = h.hotel_id
      WHERE n.user_id = $1
    `;

    const params: any[] = [user.user_id];
    let paramCount = 2;

    // Filter by read status
    if (is_read !== undefined) {
      query += ` AND n.is_read = $${paramCount}`;
      params.push(is_read === 'true');
      paramCount++;
    }

    // Filter by type
    if (type) {
      query += ` AND n.type = $${paramCount}`;
      params.push(type);
      paramCount++;
    }

    query += ` ORDER BY n.created_at DESC`;

    // Add pagination
    const limitValue = limit ? parseInt(limit as string) : 20;
    const offsetValue = offset ? parseInt(offset as string) : 0;

    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limitValue, offsetValue);

    const result = await pool.query(query, params);

    // Get total count and unread count
    let countQuery = "SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_read = false) as unread FROM Notifications WHERE user_id = $1";
    const countParams: any[] = [user.user_id];
    if (is_read !== undefined) {
      countQuery += ` AND is_read = $2`;
      countParams.push(is_read === 'true');
    }
    if (type) {
      countQuery += ` AND type = $${countParams.length + 1}`;
      countParams.push(type);
    }
    const countResult = await pool.query(countQuery, countParams);

    const total = parseInt(countResult.rows[0].total);
    const unread = parseInt(countResult.rows[0].unread);

    res.json({
      success: true,
      data: result.rows,
      stats: {
        total,
        unread,
        read: total - unread,
      },
      pagination: {
        total,
        limit: limitValue,
        offset: offsetValue,
        hasMore: offsetValue + limitValue < total,
      },
    });
  } catch (err: any) {
    console.error("Error fetching notifications:", err?.message || "Unknown error");
    res.status(500).json({
      success: false,
      error: "Failed to fetch notifications",
      details: err.message,
    });
  }
};

// GET NOTIFICATION BY ID (Authenticated)
export const getNotificationById = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const query = `
      SELECT 
        n.notification_id,
        n.user_id,
        n.type,
        n.title,
        n.message,
        n.is_read,
        n.related_booking_id,
        n.created_at,
        b.booking_id,
        b.status as booking_status,
        h.hotel_name
      FROM Notifications n
      LEFT JOIN Bookings b ON n.related_booking_id = b.booking_id
      LEFT JOIN Hotels h ON b.hotel_id = h.hotel_id
      WHERE n.notification_id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Notification not found",
      });
    }

    const notification = result.rows[0];

    // Check permissions (user can only view their own notifications)
    if (notification.user_id !== user.user_id) {
      return res.status(403).json({
        success: false,
        error: "Access denied. You can only view your own notifications.",
      });
    }

    res.json({
      success: true,
      data: notification,
    });
  } catch (err: any) {
    console.error("Error fetching notification:", err?.message || "Unknown error");
    res.status(500).json({
      success: false,
      error: "Failed to fetch notification",
      details: err.message,
    });
  }
};

// MARK NOTIFICATION AS READ (Authenticated)
export const markAsRead = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    // Check if notification exists and belongs to user
    const checkQuery = "SELECT * FROM Notifications WHERE notification_id = $1";
    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Notification not found",
      });
    }

    const notification = checkResult.rows[0];

    // Check permissions
    if (notification.user_id !== user.user_id) {
      return res.status(403).json({
        success: false,
        error: "Access denied. You can only update your own notifications.",
      });
    }

    // Update notification
    const updateQuery = `
      UPDATE Notifications
      SET is_read = true
      WHERE notification_id = $1
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [id]);

    res.json({
      success: true,
      message: "Notification marked as read",
      data: result.rows[0],
    });
  } catch (err: any) {
    console.error("Error marking notification as read:", err?.message || "Unknown error");
    res.status(500).json({
      success: false,
      error: "Failed to mark notification as read",
      details: err.message,
    });
  }
};

// MARK ALL NOTIFICATIONS AS READ (Authenticated)
export const markAllAsRead = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    const updateQuery = `
      UPDATE Notifications
      SET is_read = true
      WHERE user_id = $1 AND is_read = false
      RETURNING notification_id
    `;

    const result = await pool.query(updateQuery, [user.user_id]);

    res.json({
      success: true,
      message: "All notifications marked as read",
      count: result.rows.length,
    });
  } catch (err: any) {
    console.error("Error marking all notifications as read:", err?.message || "Unknown error");
    res.status(500).json({
      success: false,
      error: "Failed to mark all notifications as read",
      details: err.message,
    });
  }
};

// DELETE NOTIFICATION (Authenticated)
export const deleteNotification = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    // Check if notification exists and belongs to user
    const checkQuery = "SELECT * FROM Notifications WHERE notification_id = $1";
    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Notification not found",
      });
    }

    const notification = checkResult.rows[0];

    // Check permissions
    if (notification.user_id !== user.user_id) {
      return res.status(403).json({
        success: false,
        error: "Access denied. You can only delete your own notifications.",
      });
    }

    // Delete notification
    const deleteQuery = "DELETE FROM Notifications WHERE notification_id = $1 RETURNING *";
    const result = await pool.query(deleteQuery, [id]);

    res.json({
      success: true,
      message: "Notification deleted successfully",
      data: result.rows[0],
    });
  } catch (err: any) {
    console.error("Error deleting notification:", err?.message || "Unknown error");
    res.status(500).json({
      success: false,
      error: "Failed to delete notification",
      details: err.message,
    });
  }
};

// CREATE NOTIFICATION (Internal/Admin use - for sending notifications)
export const createNotification = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { user_id, type, title, message, related_booking_id } = req.body;

    // Validation
    if (!user_id || !type || !title || !message) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: user_id, type, title, message",
      });
    }

    // Validate notification type
    const validTypes: notification_type[] = [
      'booking_confirmation',
      'booking_update',
      'booking_cancelled',
      'payment_received',
      'payment_failed',
      'promotion',
      'review_request',
      'system'
    ];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid notification type. Must be one of: ${validTypes.join(', ')}`,
      });
    }

    // Check permissions (admin can create for any user, users can only create for themselves)
    if (user.role !== "admin" && user.user_id !== parseInt(user_id)) {
      return res.status(403).json({
        success: false,
        error: "Access denied. You can only create notifications for yourself.",
      });
    }

    // Check if user exists
    const userCheck = await pool.query("SELECT * FROM users WHERE user_id = $1", [user_id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    // Check if related booking exists (if provided)
    if (related_booking_id) {
      const bookingCheck = await pool.query("SELECT * FROM Bookings WHERE booking_id = $1", [related_booking_id]);
      if (bookingCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Related booking not found",
        });
      }
    }

    // Create notification
    const insertQuery = `
      INSERT INTO Notifications (user_id, type, title, message, related_booking_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      user_id,
      type,
      title,
      message,
      related_booking_id || null,
    ]);

    res.status(201).json({
      success: true,
      message: "Notification created successfully",
      data: result.rows[0],
    });
  } catch (err: any) {
    console.error("Error creating notification:", err?.message || "Unknown error");
    res.status(500).json({
      success: false,
      error: "Failed to create notification",
      details: err.message,
    });
  }
};

// GET UNREAD COUNT (Authenticated - quick check)
export const getUnreadCount = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    const query = `
      SELECT COUNT(*) as unread_count
      FROM Notifications
      WHERE user_id = $1 AND is_read = false
    `;

    const result = await pool.query(query, [user.user_id]);
    const unreadCount = parseInt(result.rows[0].unread_count);

    res.json({
      success: true,
      unread_count: unreadCount,
    });
  } catch (err: any) {
    console.error("Error fetching unread count:", err?.message || "Unknown error");
    res.status(500).json({
      success: false,
      error: "Failed to fetch unread count",
      details: err.message,
    });
  }
};



