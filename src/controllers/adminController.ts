import { Request, Response } from "express";
import pool from "../config/database";
import { validatePositiveInteger, validateStringLength, validateEmail, validatePhoneNumber, validatePaginationParams } from "../utils/validation";

/**
 * CREATE BRANCH ADMIN (Super Admin only)
 * POST /api/admin/users
 * Body: { email, name, phone_number, hotel_id }
 */
export const createBranchAdmin = async (req: Request, res: Response) => {
  try {
    const { email, name, phone_number, hotel_id } = req.body;

    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return res.status(400).json({
        success: false,
        error: emailValidation.error
      });
    }

    // Validate name
    const nameValidation = validateStringLength(name, "Name", 2, 100);
    if (!nameValidation.valid) {
      return res.status(400).json({
        success: false,
        error: nameValidation.error
      });
    }

    // Validate phone number
    const phoneValidation = validatePhoneNumber(phone_number);
    if (!phoneValidation.valid) {
      return res.status(400).json({
        success: false,
        error: phoneValidation.error
      });
    }

    // Validate hotel_id
    const hotelIdValidation = validatePositiveInteger(hotel_id, "Hotel ID");
    if (!hotelIdValidation.valid) {
      return res.status(400).json({
        success: false,
        error: hotelIdValidation.error
      });
    }

    // Check if hotel exists
    const hotelCheck = await pool.query("SELECT * FROM Hotels WHERE hotel_id = $1", [hotelIdValidation.parsed!]);
    if (hotelCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Hotel not found"
      });
    }

    // Trim values manually since validateEmail and validatePhoneNumber don't return trimmed
    const trimmedEmail = email.trim();
    const trimmedPhone = phone_number.trim();

    // Check if user already exists
    const userCheck = await pool.query("SELECT * FROM users WHERE email = $1", [trimmedEmail]);
    if (userCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: "User with this email already exists"
      });
    }

    // Note: The actual user creation with Supabase should be done separately
    // This endpoint only creates the database record and assignment
    // The frontend/super admin should create the Supabase user first, then call this endpoint

    // Use transaction to ensure atomicity
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insert user with branch_admin role
      const insertUserQuery = `
        INSERT INTO users (email, name, phone_number, role)
        VALUES ($1, $2, $3, 'branch_admin')
        RETURNING *
      `;

      const userResult = await client.query(insertUserQuery, [
        trimmedEmail,
        nameValidation.trimmed!,
        trimmedPhone,
      ]);

      const newUser = userResult.rows[0];

      // Create hotel assignment
      const insertAssignmentQuery = `
        INSERT INTO UserHotelAssignments (user_id, hotel_id)
        VALUES ($1, $2)
        RETURNING *
      `;

      const assignmentResult = await client.query(insertAssignmentQuery, [
        newUser.user_id,
        hotelIdValidation.parsed!
      ]);

      await client.query('COMMIT');

      res.status(201).json({
        success: true,
        message: "Branch admin created successfully",
        data: {
          user: newUser,
          hotel_assignment: assignmentResult.rows[0],
          note: "Please create the Supabase user account separately with the same email"
        }
      });
    } catch (err: any) {
      await client.query('ROLLBACK');
      throw err; // Re-throw to be caught by outer catch
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error("Error creating branch admin:", err?.message || "Unknown error");
    res.status(500).json({
      success: false,
      error: "Failed to create branch admin",
      details: err?.message || "Unknown error"
    });
  }
};

/**
 * ASSIGN HOTEL TO BRANCH ADMIN (Super Admin only)
 * POST /api/admin/users/:userId/hotels/:hotelId
 */
export const assignHotelToAdmin = async (req: Request, res: Response) => {
  try {
    const { userId, hotelId } = req.params;

    // Validate user ID
    const userIdValidation = validatePositiveInteger(userId, "User ID");
    if (!userIdValidation.valid) {
      return res.status(400).json({
        success: false,
        error: userIdValidation.error
      });
    }

    // Validate hotel ID
    const hotelIdValidation = validatePositiveInteger(hotelId, "Hotel ID");
    if (!hotelIdValidation.valid) {
      return res.status(400).json({
        success: false,
        error: hotelIdValidation.error
      });
    }

    // Check if user exists and is a branch admin
    const userCheck = await pool.query("SELECT * FROM users WHERE user_id = $1", [userIdValidation.parsed!]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "User not found"
      });
    }

    const user = userCheck.rows[0];
    if (user.role !== "branch_admin") {
      return res.status(400).json({
        success: false,
        error: "User must be a branch admin to assign hotels"
      });
    }

    // Check if hotel exists
    const hotelCheck = await pool.query("SELECT * FROM Hotels WHERE hotel_id = $1", [hotelIdValidation.parsed!]);
    if (hotelCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Hotel not found"
      });
    }

    // Check if assignment already exists
    const assignmentCheck = await pool.query(
      "SELECT * FROM UserHotelAssignments WHERE user_id = $1 AND hotel_id = $2",
      [userIdValidation.parsed!, hotelIdValidation.parsed!]
    );

    if (assignmentCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Hotel is already assigned to this admin"
      });
    }

    // Create assignment
    const insertQuery = `
      INSERT INTO UserHotelAssignments (user_id, hotel_id)
      VALUES ($1, $2)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [userIdValidation.parsed!, hotelIdValidation.parsed!]);

    res.status(201).json({
      success: true,
      message: "Hotel assigned successfully",
      data: result.rows[0]
    });
  } catch (err: any) {
    console.error("Error assigning hotel:", err?.message || "Unknown error");
    res.status(500).json({
      success: false,
      error: "Failed to assign hotel",
      details: err?.message || "Unknown error"
    });
  }
};

/**
 * REMOVE HOTEL ASSIGNMENT FROM BRANCH ADMIN (Super Admin only)
 * DELETE /api/admin/users/:userId/hotels/:hotelId
 */
export const removeHotelFromAdmin = async (req: Request, res: Response) => {
  try {
    const { userId, hotelId } = req.params;

    // Validate user ID
    const userIdValidation = validatePositiveInteger(userId, "User ID");
    if (!userIdValidation.valid) {
      return res.status(400).json({
        success: false,
        error: userIdValidation.error
      });
    }

    // Validate hotel ID
    const hotelIdValidation = validatePositiveInteger(hotelId, "Hotel ID");
    if (!hotelIdValidation.valid) {
      return res.status(400).json({
        success: false,
        error: hotelIdValidation.error
      });
    }

    // Check if assignment exists
    const assignmentCheck = await pool.query(
      "SELECT * FROM UserHotelAssignments WHERE user_id = $1 AND hotel_id = $2",
      [userIdValidation.parsed!, hotelIdValidation.parsed!]
    );

    if (assignmentCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Hotel assignment not found"
      });
    }

    // Delete assignment
    const deleteQuery = `
      DELETE FROM UserHotelAssignments
      WHERE user_id = $1 AND hotel_id = $2
      RETURNING *
    `;

    const result = await pool.query(deleteQuery, [userIdValidation.parsed!, hotelIdValidation.parsed!]);

    res.json({
      success: true,
      message: "Hotel assignment removed successfully",
      data: result.rows[0]
    });
  } catch (err: any) {
    console.error("Error removing hotel assignment:", err?.message || "Unknown error");
    res.status(500).json({
      success: false,
      error: "Failed to remove hotel assignment",
      details: err?.message || "Unknown error"
    });
  }
};

/**
 * GET ALL ADMINS (Super Admin only)
 * GET /api/admin/users
 */
export const getAllAdmins = async (req: Request, res: Response) => {
  try {
    const { role, limit, offset } = req.query;

    // Validate pagination params using utility function
    const paginationValidation = validatePaginationParams(limit, offset);
    if (!paginationValidation.valid) {
      return res.status(400).json({
        success: false,
        error: paginationValidation.error
      });
    }

    const limitValue = paginationValidation.limitValue!;
    const offsetValue = paginationValidation.offsetValue!;

    let query = `
      SELECT 
        u.user_id,
        u.email,
        u.name,
        u.phone_number,
        u.role,
        u.created_at,
        u.updated_at,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'assignment_id', uha.assignment_id,
              'hotel_id', h.hotel_id,
              'hotel_name', h.hotel_name,
              'city', h.city,
              'country', h.country
            )
          ) FILTER (WHERE uha.assignment_id IS NOT NULL),
          '[]'::json
        ) as assigned_hotels
      FROM users u
      LEFT JOIN UserHotelAssignments uha ON u.user_id = uha.user_id
      LEFT JOIN Hotels h ON uha.hotel_id = h.hotel_id
      WHERE u.role IN ('admin', 'super_admin', 'branch_admin')
    `;

    const params: any[] = [];
    let paramCount = 1;

    // Filter by role if provided
    if (role) {
      const validRoles = ['admin', 'super_admin', 'branch_admin'];
      if (!validRoles.includes(role as string)) {
        return res.status(400).json({
          success: false,
          error: `Role must be one of: ${validRoles.join(', ')}`
        });
      }
      query += ` AND u.role = $${paramCount}`;
      params.push(role);
      paramCount++;
    }

    query += ` GROUP BY u.user_id ORDER BY u.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limitValue, offsetValue);

    const result = await pool.query(query, params);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM users
      WHERE role IN ('admin', 'super_admin', 'branch_admin')
      ${role ? `AND role = $1` : ''}
    `;
    const countParams = role ? [role] : [];
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total,
        limit: limitValue,
        offset: offsetValue,
        hasMore: offsetValue + limitValue < total
      }
    });
  } catch (err: any) {
    console.error("Error fetching admins:", err?.message || "Unknown error");
    res.status(500).json({
      success: false,
      error: "Failed to fetch admins",
      details: err?.message || "Unknown error"
    });
  }
};

/**
 * GET ADMIN BY ID (Super Admin only)
 * GET /api/admin/users/:userId
 */
export const getAdminById = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Validate user ID
    const userIdValidation = validatePositiveInteger(userId, "User ID");
    if (!userIdValidation.valid) {
      return res.status(400).json({
        success: false,
        error: userIdValidation.error
      });
    }

    const query = `
      SELECT 
        u.user_id,
        u.email,
        u.name,
        u.phone_number,
        u.role,
        u.created_at,
        u.updated_at,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'assignment_id', uha.assignment_id,
              'hotel_id', h.hotel_id,
              'hotel_name', h.hotel_name,
              'city', h.city,
              'country', h.country
            )
          ) FILTER (WHERE uha.assignment_id IS NOT NULL),
          '[]'::json
        ) as assigned_hotels
      FROM users u
      LEFT JOIN UserHotelAssignments uha ON u.user_id = uha.user_id
      LEFT JOIN Hotels h ON uha.hotel_id = h.hotel_id
      WHERE u.user_id = $1 AND u.role IN ('admin', 'super_admin', 'branch_admin')
      GROUP BY u.user_id
    `;

    const result = await pool.query(query, [userIdValidation.parsed!]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Admin not found"
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (err: any) {
    console.error("Error fetching admin:", err?.message || "Unknown error");
    res.status(500).json({
      success: false,
      error: "Failed to fetch admin",
      details: err?.message || "Unknown error"
    });
  }
};

