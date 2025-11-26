import { Request, Response } from "express";
import pool from "../config/database";

// GET USER PROFILE (Authenticated - own profile)
export const getMyProfile = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    const query = `
      SELECT 
        user_id,
        email,
        name,
        phone_number,
        role,
        created_at,
        updated_at
      FROM users
      WHERE user_id = $1
    `;

    const result = await pool.query(query, [user.user_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (err: any) {
    console.error("Error fetching profile:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch profile",
      details: err.message,
    });
  }
};

// UPDATE USER PROFILE (Authenticated - own profile or admin)
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { userId } = req.params; // Optional: for admin to update other users
    const { name, phone_number } = req.body;

    // Determine which user to update
    const targetUserId = userId && user.role === "admin" ? parseInt(userId) : user.user_id;

    // Check permissions (user can only update their own profile, admin can update any)
    if (user.role !== "admin" && targetUserId !== user.user_id) {
      return res.status(403).json({
        success: false,
        error: "Access denied. You can only update your own profile.",
      });
    }

    // Check if user exists
    const checkQuery = "SELECT * FROM users WHERE user_id = $1";
    const checkResult = await pool.query(checkQuery, [targetUserId]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    const existingUser = checkResult.rows[0];

    // Validation
    if (!name && !phone_number) {
      return res.status(400).json({
        success: false,
        error: "At least one field (name or phone_number) is required to update",
      });
    }

    // Validate phone number format if provided
    if (phone_number && phone_number.length < 10) {
      return res.status(400).json({
        success: false,
        error: "Phone number must be at least 10 characters",
      });
    }

    // Check if phone number is already taken by another user
    if (phone_number && phone_number !== existingUser.phone_number) {
      const phoneCheck = await pool.query(
        "SELECT * FROM users WHERE phone_number = $1 AND user_id != $2",
        [phone_number, targetUserId]
      );

      if (phoneCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: "Phone number is already in use by another user",
        });
      }
    }

    // Build update query
    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      params.push(name);
    }

    if (phone_number !== undefined) {
      updates.push(`phone_number = $${paramCount++}`);
      params.push(phone_number);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No fields to update",
      });
    }

    updates.push(`updated_at = NOW()`);
    params.push(targetUserId);

    const updateQuery = `
      UPDATE users
      SET ${updates.join(", ")}
      WHERE user_id = $${paramCount}
      RETURNING user_id, email, name, phone_number, role, created_at, updated_at
    `;

    const result = await pool.query(updateQuery, params);

    // Note: Supabase user metadata can be updated separately if needed
    // For now, we only update PostgreSQL database

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: result.rows[0],
    });
  } catch (err: any) {
    console.error("Error updating profile:", err);
    
    // Handle unique constraint violation for phone_number
    if (err.code === "23505" && err.detail?.includes("phone_number")) {
      return res.status(400).json({
        success: false,
        error: "Phone number is already in use by another user",
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to update profile",
      details: err.message,
    });
  }
};

// GET USER BY ID (Admin only or own profile)
export const getUserById = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { userId } = req.params;

    // Check permissions (user can only view their own profile, admin can view any)
    if (user.role !== "admin" && user.user_id !== parseInt(userId)) {
      return res.status(403).json({
        success: false,
        error: "Access denied. You can only view your own profile.",
      });
    }

    const query = `
      SELECT 
        user_id,
        email,
        name,
        phone_number,
        role,
        created_at,
        updated_at
      FROM users
      WHERE user_id = $1
    `;

    const result = await pool.query(query, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (err: any) {
    console.error("Error fetching user:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch user",
      details: err.message,
    });
  }
};

