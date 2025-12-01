"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testConnection = exports.query = void 0;
exports.getBookingAmount = getBookingAmount;
exports.insertPayment = insertPayment;
exports.updateBookingStatus = updateBookingStatus;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const pool = new pg_1.Pool({
    host: process.env.PGHOST,
    port: parseInt(process.env.PGPORT || "5432"),
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : false,
    max: 5,
    min: 0,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 20000,
    keepAlive: false,
});
pool.on('error', (err) => {
    console.error('Database pool error:', err?.message || "Unknown error");
});
const query = (text, params) => {
    return pool.query(text, params);
};
exports.query = query;
const testConnection = async () => {
    try {
        const result = await pool.query('SELECT NOW()');
        return { success: true, data: result.rows[0] };
    }
    catch (err) {
        return {
            success: false,
            error: err.message,
            code: err.code,
        };
    }
};
exports.testConnection = testConnection;
async function getBookingAmount(booking_id) {
    try {
        const result = await pool.query("SELECT total_price FROM Bookings WHERE booking_id = $1", [booking_id]);
        if (result.rows.length > 0) {
            const amountString = result.rows[0].total_price;
            const amountNumber = parseFloat(amountString);
            if (!isNaN(amountNumber)) {
                return amountNumber;
            }
            else {
                console.error(`Invalid total price format for booking ${booking_id}`);
            }
        }
    }
    catch (error) {
        console.error("Failed to fetch booking amount:", error?.message || "Unknown error");
    }
    return null;
}
//To put in the database
async function insertPayment(booking_id, amount, transaction_reference, status) {
    try {
        const result = await pool.query(`INSERT INTO "Payments" (booking_id, amount, payment_gateway, transaction_reference, status) 
       VALUES ($1, $2, 'PayPal', $3, $4)
       RETURNING *`, [booking_id, amount, transaction_reference, status]);
        if (result.rows.length > 0) {
            return result.rows[0];
        }
        return null;
    }
    catch (error) {
        console.error("Database error inserting payment record:", error?.message || "Unknown error");
        throw new Error("Failed to insert payment record.");
    }
}
async function updateBookingStatus(booking_id, status) {
    try {
        await pool.query('UPDATE "Bookings" SET status = $1 WHERE booking_id = $2', [status, booking_id]);
    }
    catch (error) {
        console.error("Database error updating booking status:", error?.message || "Unknown error");
        throw new Error("Failed to update booking status.");
    }
}
exports.default = pool;
