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

        // 2. Get full user info from PostgreSQL (including role)
        const result = await pool.query(
            `SELECT user_id, email, name, phone_number, role, created_at, updated_at 
             FROM users WHERE email = $1 LIMIT 1`,
            [supabaseUser.email]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "User not found in database" });
        }

        const dbUser = result.rows[0];

        // 3. Attach user info to request (combining Supabase and DB data)
        (req as any).user = {
            user_id: dbUser.user_id,
            email: dbUser.email,
            name: dbUser.name,
            phone_number: dbUser.phone_number,
            role: dbUser.role,
            supabase_id: supabaseUser.id, // Supabase UUID
        };

        next();

    } catch (error) {
        return res.status(403).json({ message: "Invalid or expired token" });
    }

};

// Check user Role (Admin only)

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {

    const user = (req as any).user;

    if (!user || user.role !=="admin") {

        return res.status(403).json({message:"Access Denied:Admins only"});
        
    }
    next();
};

// Check user Customer role 


export const requireCustomer=(req:Request ,res:Response , next:NextFunction)=>{
    const user = (req as any).user

    if (!user || user.role !="customer") {
        return res.status(403).json({message:"Access Denied:Customers only"});
        
    }
    next();
};