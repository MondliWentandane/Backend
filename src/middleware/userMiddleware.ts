import { Request, Response, NextFunction } from "express";
import { supabase } from "../config/supabase";
import pool from "../config/database";

//Verifying Auth Token Middleware - Validates Supabase JWT
export const verifyAuth = async (req: Request, res: Response, next: NextFunction) => {

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer")) {
        return res.status(401).json({ message: "Unauthorized: No token provided" });
    }

    const token = authHeader.split(" ")[1];

    try {
        // 1. Validate token with Supabase
        const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);

        if (error || !supabaseUser) {
            return res.status(403).json({ message: "Invalid or expired token" });
        }

        // 2. Get full user info from PostgreSQL (including role and hotel assignments)
        const result = await pool.query(
            `SELECT 
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
                            'hotel_id', uha.hotel_id,
                            'hotel_name', h.hotel_name
                        )
                    ) FILTER (WHERE uha.hotel_id IS NOT NULL),
                    '[]'::json
                ) as assigned_hotels
             FROM users u
             LEFT JOIN UserHotelAssignments uha ON u.user_id = uha.user_id
             LEFT JOIN Hotels h ON uha.hotel_id = h.hotel_id
             WHERE u.email = $1 
             GROUP BY u.user_id, u.email, u.name, u.phone_number, u.role, u.created_at, u.updated_at
             LIMIT 1`,
            [supabaseUser.email]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "User not found in database" });
        }

        const dbUser = result.rows[0];

        // 3. Extract assigned hotel IDs for easy access
        const assignedHotelIds = dbUser.assigned_hotels 
            ? (Array.isArray(dbUser.assigned_hotels) 
                ? dbUser.assigned_hotels.map((h: any) => h.hotel_id)
                : [])
            : [];

        // 4. Attach user info to request (combining Supabase and DB data)
        (req as any).user = {
            user_id: dbUser.user_id,
            email: dbUser.email,
            name: dbUser.name,
            phone_number: dbUser.phone_number,
            role: dbUser.role,
            supabase_id: supabaseUser.id, // Supabase UUID
            assigned_hotel_ids: assignedHotelIds, // Array of hotel IDs for branch admins
        };

        next();

    } catch (error: any) {
        console.error("Error in verifyAuth middleware:", error?.message || "Unknown error");
        return res.status(403).json({ message: "Invalid or expired token" });
    }

};

// Check user Role (Admin only - Super Admin or Branch Admin)
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    if (!user || (user.role !== "admin" && user.role !== "super_admin" && user.role !== "branch_admin")) {
        return res.status(403).json({ message: "Access Denied: Admins only" });
    }
    next();
};

// Check user Role (Super Admin only)
export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    if (!user || user.role !== "super_admin") {
        return res.status(403).json({ message: "Access Denied: Super Admin only" });
    }
    next();
};

// Check user Role (Branch Admin only)
export const requireBranchAdmin = (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    if (!user || user.role !== "branch_admin") {
        return res.status(403).json({ message: "Access Denied: Branch Admin only" });
    }
    next();
};

// Helper function to check if user has access to a specific hotel
// Optionally accepts assignedHotelIds array to avoid database query if available
export const checkHotelAccess = async (
    userId: number,
    userRole: string,
    hotelId: number,
    assignedHotelIds?: number[]
): Promise<boolean> => {
    try {
        // Super admin has access to all hotels
        if (userRole === "super_admin") {
            return true;
        }

        // Regular admin (legacy) has access to all hotels
        if (userRole === "admin") {
            return true;
        }

        // Branch admin needs to check assignment
        if (userRole === "branch_admin") {
            // Use cached assigned_hotel_ids if available (from verifyAuth middleware)
            if (assignedHotelIds && Array.isArray(assignedHotelIds)) {
                return assignedHotelIds.includes(hotelId);
            }
            
            // Fallback to database query if cache not available
            const result = await pool.query(
                `SELECT * FROM UserHotelAssignments 
                 WHERE user_id = $1 AND hotel_id = $2`,
                [userId, hotelId]
            );
            return result.rows.length > 0;
        }

        // Customers and others have no admin access
        return false;
    } catch (error: any) {
        console.error("Error checking hotel access:", error?.message || "Unknown error");
        return false;
    }
};

// Middleware to check hotel access from request params
export const requireHotelAccess = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const user = (req as any).user;
        const hotelId = req.params.hotelId || req.params.id || req.body.hotel_id;

        if (!hotelId) {
            return res.status(400).json({
                success: false,
                error: "Hotel ID is required"
            });
        }

        const hotelIdNum = parseInt(hotelId);
        if (isNaN(hotelIdNum)) {
            return res.status(400).json({
                success: false,
                error: "Invalid hotel ID"
            });
        }

        const hasAccess = await checkHotelAccess(user.user_id, user.role, hotelIdNum, user.assigned_hotel_ids);

        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                error: "Access Denied: You do not have access to this hotel"
            });
        }

        next();
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            error: "Error checking hotel access",
            details: error.message
        });
    }
};

// Check user Customer role 


export const requireCustomer=(req:Request ,res:Response , next:NextFunction)=>{
    const user = (req as any).user

    if (!user || user.role !="customer") {
        return res.status(403).json({message:"Access Denied:Customers only"});
        
    }
    next();
};