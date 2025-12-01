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
const validation_1 = require("../utils/validation");
// SIGN UP
const signUp = async (req, res) => {
    const { email, password, name, phone_number, role } = req.body;
    // Validate email
    const emailValidation = (0, validation_1.validateEmail)(email);
    if (!emailValidation.valid) {
        return res.status(400).json({
            error: emailValidation.error
        });
    }
    // Validate password
    const passwordValidation = (0, validation_1.validatePassword)(password);
    if (!passwordValidation.valid) {
        return res.status(400).json({
            error: passwordValidation.error
        });
    }
    // Validate name
    const nameValidation = (0, validation_1.validateName)(name);
    if (!nameValidation.valid) {
        return res.status(400).json({
            error: nameValidation.error
        });
    }
    // Validate phone number
    const phoneValidation = (0, validation_1.validatePhoneNumber)(phone_number);
    if (!phoneValidation.valid) {
        return res.status(400).json({
            error: phoneValidation.error
        });
    }
    // Validate role if provided
    if (role !== undefined && role !== null) {
        const validRoles = ['admin', 'super_admin', 'branch_admin', 'customer'];
        if (typeof role !== 'string' || !validRoles.includes(role)) {
            return res.status(400).json({
                error: `Invalid role. Must be one of: ${validRoles.join(', ')}`
            });
        }
    }
    // Use trimmed values
    const trimmedEmail = email.trim();
    const trimmedName = nameValidation.trimmed;
    const trimmedPhone = phone_number.trim();
    try {
        // 1. Hash password before storing
        const salt = await bcryptjs_1.default.genSalt(10);
        const passwordHash = await bcryptjs_1.default.hash(password, salt);
        // Check if user already exists in PostgreSQL (cleanup check)
        try {
            const existingUser = await (0, database_1.query)('SELECT * FROM users WHERE email = $1', [email]);
            if (existingUser.rows.length > 0) {
                // User exists in PostgreSQL but might be deleted from Supabase
                // Delete from PostgreSQL to allow fresh signup
                await (0, database_1.query)('DELETE FROM users WHERE email = $1', [email]);
            }
        }
        catch (dbError) {
            // Silently continue - this is just a cleanup check
            // If it fails, we'll continue with signup anyway
        }
        // 2. Create user in Supabase Auth
        const { data, error } = await supabase_1.supabase.auth.signUp({
            email: trimmedEmail,
            password,
            options: {
                data: { name: trimmedName, phone_number: trimmedPhone, role: role || "customer" },
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
       RETURNING user_id, email, name, phone_number, role, created_at, updated_at`, [trimmedEmail, passwordHash, trimmedName, trimmedPhone, role || "customer"]);
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
    // Validate email
    const emailValidation = (0, validation_1.validateEmail)(email);
    if (!emailValidation.valid) {
        return res.status(400).json({
            error: emailValidation.error
        });
    }
    // Validate password presence and type
    if (!password || typeof password !== 'string') {
        return res.status(400).json({
            error: "Password is required and must be a string"
        });
    }
    try {
        // 1. Validate Supabase login
        const { data, error } = await supabase_1.supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
        });
        if (error)
            return res.status(400).json({ error: error.message });
        // 2. Get user info from database (excluding password_hash)
        let user;
        try {
            const result = await (0, database_1.query)(`SELECT user_id, email, name, phone_number, role, created_at, updated_at 
       FROM users WHERE email = $1 LIMIT 1`, [email.trim()]);
            if (result.rows.length === 0) {
                // User exists in Supabase but not in PostgreSQL - return error
                return res.status(404).json({
                    error: "User not found in database",
                    details: "Please sign up first or contact support"
                });
            }
            user = result.rows[0];
        }
        catch (dbError) {
            console.error('Database query error:', dbError?.message || "Unknown error");
            return res.status(500).json({
                error: "Database error",
                details: dbError.message || "Failed to retrieve user information"
            });
        }
        // 3. Use Supabase's JWT token (access_token from session)
        const accessToken = data.session?.access_token;
        const refreshToken = data.session?.refresh_token;
        if (!accessToken) {
            return res.status(500).json({ error: "Failed to generate authentication token" });
        }
        res.json({
            message: "Login successful",
            token: accessToken,
            refreshToken: refreshToken,
            user,
        });
    }
    catch (err) {
        console.error('Signin error:', err?.message || "Unknown error");
        res.status(500).json({
            error: "Login failed",
            details: err?.message || "An error occurred during login"
        });
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
    // Validate email
    const emailValidation = (0, validation_1.validateEmail)(email);
    if (!emailValidation.valid) {
        return res.status(400).json({
            error: emailValidation.error
        });
    }
    try {
        const { error } = await supabase_1.supabase.auth.resetPasswordForEmail(email.trim(), {
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
    // Validate access token
    if (!access_token || typeof access_token !== 'string') {
        return res.status(400).json({
            error: "Access token is required and must be a string"
        });
    }
    // Validate new password
    const passwordValidation = (0, validation_1.validatePassword)(new_password);
    if (!passwordValidation.valid) {
        return res.status(400).json({
            error: passwordValidation.error
        });
    }
    // Validate email if provided
    let trimmedEmail = null;
    if (email) {
        const emailValidation = (0, validation_1.validateEmail)(email);
        if (!emailValidation.valid) {
            return res.status(400).json({
                error: emailValidation.error
            });
        }
        trimmedEmail = email.trim();
    }
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
        if (trimmedEmail) {
            await database_1.default.query(`UPDATE users 
         SET password_hash = $1, updated_at = NOW() 
         WHERE email = $2`, [passwordHash, trimmedEmail]);
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
    if (!refresh_token || typeof refresh_token !== 'string') {
        return res.status(400).json({
            error: "Refresh token is required and must be a string"
        });
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
