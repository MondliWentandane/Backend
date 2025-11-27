import { Pool } from 'pg';
import dotenv from 'dotenv';
import { payment_status, Payments } from '../types/payment.types';

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

export async function getBookingAmount(booking_id: number): Promise<number | null> {
    try {
        console.log(`Attempting to fetch total price for booking_id: ${booking_id}`);
        const result = await pool.query("SELECT total_price FROM Bookings WHERE booking_id = $1", [booking_id]);

        if (result.rows.length > 0) {
            const amountString = result.rows[0].total_price;
            const amountNumber = parseFloat(amountString);

            if (!isNaN(amountNumber)) {
                return amountNumber;
            } else {
                console.error(`Invalid total price format for booking ${booking_id}: ${amountString}`);
            }
        }
    } catch (error) {
        console.error("Failed to fetch booking amount:", error);
    }
    return null;
}


//To put in the database
export async function insertPayment(booking_id: number,amount: number,transaction_reference: string,status: payment_status): Promise<Payments | null> {
    try {
    const result = await pool.query(
      `INSERT INTO "Payments" (booking_id, amount, payment_gateway, transaction_reference, status) 
       VALUES ($1, $2, 'PayPal', $3, $4)
       RETURNING *`,
      [booking_id, amount, transaction_reference, status]
    );

    if (result.rows.length > 0) {
      return result.rows[0];
    }
    return null;
  } catch (error) {
    console.error("Database error inserting payment record:", error);
    throw new Error("Failed to insert payment record.");
  }
}

export async function updateBookingStatus(booking_id: number, status: string): Promise<void> {
    try {
        await pool.query('UPDATE "Bookings" SET status = $1 WHERE booking_id = $2', [status, booking_id]);
    } catch (error) {
        console.error("Database error updating booking status:", error);
        throw new Error("Failed to update booking status.");
    }
}
export default pool;
