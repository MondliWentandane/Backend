import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
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
})

pool.on('error', (err: any) => {
    console.error('Database pool error:', err.message || err);
});

export const query = (text: string, params?: any[]) => {
    return pool.query(text, params);
};

export const testConnection = async () => {
    try {
        const result = await pool.query('SELECT NOW()');
        return { success: true, data: result.rows[0] };
    } catch (err: any) {
        return {
            success: false,
            error: err.message,
            code: err.code,
        };
    }
};

export default pool;