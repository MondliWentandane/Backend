"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testConnection = exports.query = void 0;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Determine if SSL is needed
// Supabase and most cloud databases require SSL
const host = process.env.PGHOST || '';
const isSupabase = host.includes('supabase.com');
const isCloud = !host.includes('localhost') && !host.includes('127.0.0.1');
const needsSSL = process.env.PGSSL === 'true' || isSupabase || isCloud;
// Pool configuration
const port = parseInt(process.env.PGPORT || '5432');
const isPooler = port === 6543; // Supabase pooler port
const poolConfig = {
    host: process.env.PGHOST,
    port: port,
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    // Supabase requires SSL for direct connections
    ssl: needsSSL ? { rejectUnauthorized: false } : false,
    // Conservative pool size for Supabase (free tier has connection limits)
    max: isSupabase ? 5 : 10, // Lower for Supabase to avoid hitting limits
    min: 0, // Don't keep idle connections (Supabase charges for active connections)
    idleTimeoutMillis: 10000, // Release idle connections faster
    connectionTimeoutMillis: 10000,
    // Don't keep connections alive unnecessarily
    keepAlive: false,
    // Statement timeout to prevent long queries from holding connections
    statement_timeout: 30000, // 30 seconds max per query
};
// Create PostgreSQL connection pool
const pool = new pg_1.Pool(poolConfig);
// Handle pool errors gracefully (don't crash the app)
pool.on('error', (err) => {
    console.error('Database pool error:', err.message || err);
    // Don't throw - let the app continue
});
// Test connection on startup (non-blocking, silent failure)
setTimeout(() => {
    pool.query('SELECT NOW()')
        .then(() => {
        console.log('Database connected successfully');
    })
        .catch((err) => {
        const errorMsg = err.message || err.toString();
        console.error('Database connection failed:', errorMsg);
        if (isSupabase) {
            console.error('Supabase connection tips:');
            if (isPooler) {
                console.error('   WARNING: You\'re using the pooler (port 6543)');
                console.error('   - The pooler can conflict with Node.js pg Pool');
                console.error('   - RECOMMENDED: Switch to direct connection (port 5432)');
                console.error('   - In Supabase Dashboard → Settings → Database → Connection string');
            }
            else {
                console.error('   - For DIRECT connection (port 5432), make sure:');
                console.error('     - Host is: db.xxxxx.supabase.co (NOT pooler.supabase.com)');
                console.error('     - Database is usually: postgres');
                console.error('     - SSL is enabled (should auto-detect)');
                console.error('     - Password is correct from Supabase Dashboard');
                console.error('   - Get connection string from: Supabase Dashboard → Settings → Database → Connection string');
            }
        }
    });
}, 1000); // Wait 1 second before testing
// Simple query helper - pool.query() automatically releases connections
// This is just a wrapper for consistency
const query = (text, params) => {
    return pool.query(text, params);
};
exports.query = query;
// Test connection helper for API endpoint
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
exports.default = pool;
