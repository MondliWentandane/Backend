"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshToken = exports.resetPassword = exports.forgotPassword = exports.signInWithGoogle = exports.signIn = exports.signUp = void 0;
const supabase_1 = require("../config/supabase");
const database_1 = __importStar(require("../config/database"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
// SIGN UP
const signUp = async (req, res) => {
    const { email, password, name, phone_number, role } = req.body;
    // Basic validation
    if (!email || !password || !name || !phone_number) {
        return res.status(400).json({
            error: "Missing required fields",
            details: "Please provide: email, password, name, and phone_number",
            received: { email: !!email, password: !!password, name: !!name, phone_number: !!phone_number }
        });
    }
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({
            error: "Invalid email format",
            details: "Please provide a valid email address"
        });
    }
    // Validate password length
    if (password.length < 6) {
        return res.status(400).json({
            error: "Password too short",
            details: "Password must be at least 6 characters long"
        });
    }
    try {
        // 1. Hash password before storing
        const salt = await bcryptjs_1.default.genSalt(10);
        const passwordHash = await bcryptjs_1.default.hash(password, salt);
        // Check if user already exists in PostgreSQL (cleanup check)
        try {
            const existingUser = await (0, database_1.query)("SELECT * FROM users WHERE email = $1", [email]);
            if (existingUser.rows.length > 0) {
                // User exists in PostgreSQL but might be deleted from Supabase
                // Delete from PostgreSQL to allow fresh signup
                await (0, database_1.query)("DELETE FROM users WHERE email = $1", [email]);
            }
        }
        catch (dbError) {
            // Silently continue - this is just a cleanup check
            // If it fails, we'll continue with signup anyway
        }
        // 2. Create user in Supabase Auth
        const { data, error } = await supabase_1.supabase.auth.signUp({
            email,
            password,
            options: {
                data: { name, phone_number, role: role || "customer" },
                emailRedirectTo: "http://localhost:3000/auth/verify-email",
            },
        });
        if (error) {
            // Provide more helpful error messages
            if (error.message.includes("already registered") || error.message.includes("already exists")) {
                return res.status(400).json({
                    error: "This email is already registered. If you deleted the account, please wait a few minutes or use a different email.",
                    details: error.message,
                    suggestion: "Try using a different email or wait 5-10 minutes before retrying with the same email."
                });
            }
            return res.status(400).json({ error: error.message, details: error });
        }
        // 3. Save user record in your own PostgreSQL Users table with hashed password
        const pgUser = await (0, database_1.query)(`INSERT INTO users (email, password_hash, name, phone_number, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING user_id, email, name, phone_number, role, created_at, updated_at`, [email, passwordHash, name, phone_number, role || "customer"]);
        // 4. Return Supabase JWT token if session is available (email confirmation might be disabled)
        const accessToken = data.session?.access_token;
        const refreshToken = data.session?.refresh_token;
        res.json({
            message: data.session
                ? "Signup successful"
                : "Signup successful — verification email sent.",
            token: accessToken || null,
            refreshToken: refreshToken || null,
            user: pgUser.rows[0],
        });
    }
    catch (err) {
        // Only handle duplicate email/phone errors
        if (err?.code === "23505") {
            if (err?.detail?.includes("email")) {
                return res.status(400).json({
                    error: "Email already exists",
                    details: "This email is already registered."
                });
            }
            if (err?.detail?.includes("phone_number")) {
                return res.status(400).json({
                    error: "Phone number already exists",
                    details: "This phone number is already registered."
                });
            }
        }
        // For any other error, just return generic message
        res.status(500).json({
            error: "Signup failed",
            details: err?.message || "An error occurred during signup."
        });
    }
};
exports.signUp = signUp;
// SIGN IN
const signIn = async (req, res) => {
    const { email, password } = req.body;
    try {
        // 1. Validate Supabase login
        const { data, error } = await supabase_1.supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error)
            return res.status(400).json({ error: error.message });
        // 2. Get user info from database (excluding password_hash)
        const result = await (0, database_1.query)(`SELECT user_id, email, name, phone_number, role, created_at, updated_at 
       FROM users WHERE email = $1 LIMIT 1`, [email]);
        if (result.rows.length === 0)
            return res.status(404).json({ error: "User not found in database" });
        const user = result.rows[0];
        // 3. Use Supabase's JWT token (access_token from session)
        // Supabase automatically generates and returns a JWT token
        const accessToken = data.session?.access_token;
        const refreshToken = data.session?.refresh_token;
        if (!accessToken) {
            return res.status(500).json({ error: "Failed to generate authentication token" });
        }
        res.json({
            message: "Login successful",
            token: accessToken, // Supabase JWT token
            refreshToken: refreshToken, // For token refresh
            user,
        });
    }
    catch (err) {
        res.status(500).json({ error: "Login failed", details: err });
    }
};
exports.signIn = signIn;
// GOOGLE SIGN-IN
const signInWithGoogle = async (req, res) => {
    const { redirectUrl } = req.body;
    try {
        const { data, error } = await supabase_1.supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: redirectUrl || "http://localhost:3000/auth/callback",
            },
        });
        if (error)
            return res.status(400).json({ error: error.message });
        res.json({
            message: "Google OAuth started",
            url: data.url,
        });
    }
    catch (err) {
        res.status(500).json({ error: "Google login failed" });
    }
};
exports.signInWithGoogle = signInWithGoogle;
// FORGOT PASSWORD
const forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const { error } = await supabase_1.supabase.auth.resetPasswordForEmail(email, {
            redirectTo: "http://localhost:3000/auth/reset-password",
        });
        if (error)
            return res.status(400).json({ error: error.message });
        res.json({ message: "Password reset email sent." });
    }
    catch (err) {
        res.status(500).json({ error: "Password reset request failed" });
    }
};
exports.forgotPassword = forgotPassword;
// RESET PASSWORD FROM EMAIL LINK
const resetPassword = async (req, res) => {
    const { access_token, new_password, email } = req.body;
    try {
        // 1. Update password in Supabase Auth
        const { data, error } = await supabase_1.supabase.auth.updateUser({
            password: new_password,
        }, {
            accessToken: access_token,
        });
        if (error)
            return res.status(400).json({ error: error.message });
        // 2. Hash the new password for PostgreSQL storage
        const salt = await bcryptjs_1.default.genSalt(10);
        const passwordHash = await bcryptjs_1.default.hash(new_password, salt);
        // 3. Update password hash in PostgreSQL database
        if (email) {
            await database_1.default.query(`UPDATE users 
         SET password_hash = $1, updated_at = NOW() 
         WHERE email = $2`, [passwordHash, email]);
        }
        res.json({
            message: "Password updated successfully",
            user: data.user,
        });
    }
    catch (err) {
        res.status(500).json({ error: "Reset password failed", details: err });
    }
};
exports.resetPassword = resetPassword;
// REFRESH TOKEN - Refresh Supabase JWT token using refresh token
const refreshToken = async (req, res) => {
    const { refresh_token } = req.body;
    if (!refresh_token) {
        return res.status(400).json({ error: "Refresh token is required" });
    }
    try {
        const { data, error } = await supabase_1.supabase.auth.refreshSession({
            refresh_token,
        });
        if (error || !data.session) {
            return res.status(401).json({ error: "Invalid or expired refresh token" });
        }
        res.json({
            message: "Token refreshed successfully",
            token: data.session.access_token,
            refreshToken: data.session.refresh_token,
        });
    }
    catch (err) {
        res.status(500).json({ error: "Token refresh failed", details: err });
    }
};
exports.refreshToken = refreshToken;
