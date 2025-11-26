import pool from "../config/database";
import { notification_type } from "../types/notification.types";

// Helper function to create notifications (can be used internally)
export const createNotification = async (
  user_id: number,
  type: notification_type,
  title: string,
  message: string,
  related_booking_id?: number
) => {
  try {
    const insertQuery = `
      INSERT INTO Notifications (user_id, type, title, message, related_booking_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      user_id,
      type,
      title,
      message,
      related_booking_id || null,
    ]);

    return result.rows[0];
  } catch (err: any) {
    console.error("Error creating notification:", err);
    // Don't throw - notifications are non-critical
    return null;
  }
};

// Helper to create booking confirmation notification
export const notifyBookingConfirmation = async (user_id: number, booking_id: number, hotel_name: string) => {
  return createNotification(
    user_id,
    'booking_confirmation',
    'Booking Confirmed',
    `Your booking at ${hotel_name} has been confirmed. Booking ID: ${booking_id}`,
    booking_id
  );
};

// Helper to create booking update notification
export const notifyBookingUpdate = async (user_id: number, booking_id: number, hotel_name: string, status: string) => {
  return createNotification(
    user_id,
    'booking_update',
    'Booking Updated',
    `Your booking at ${hotel_name} has been updated. Status: ${status}`,
    booking_id
  );
};

// Helper to create booking cancellation notification
export const notifyBookingCancellation = async (user_id: number, booking_id: number, hotel_name: string) => {
  return createNotification(
    user_id,
    'booking_cancelled',
    'Booking Cancelled',
    `Your booking at ${hotel_name} has been cancelled. Booking ID: ${booking_id}`,
    booking_id
  );
};

// Helper to create payment received notification
export const notifyPaymentReceived = async (user_id: number, booking_id: number, amount: number) => {
  return createNotification(
    user_id,
    'payment_received',
    'Payment Received',
    `Payment of R ${amount.toFixed(2)} has been received for your booking.`,
    booking_id
  );
};

