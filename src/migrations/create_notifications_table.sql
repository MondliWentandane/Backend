-- Migration: Create Notifications table
-- Run this SQL in your PostgreSQL database

CREATE TYPE notification_type AS ENUM (
    'booking_confirmation',
    'booking_update',
    'booking_cancelled',
    'payment_received',
    'payment_failed',
    'promotion',
    'review_request',
    'system'
);

CREATE TABLE Notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES Users(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
    type notification_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    related_booking_id INT REFERENCES Bookings(booking_id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_notifications_user_id ON Notifications(user_id);
CREATE INDEX idx_notifications_is_read ON Notifications(user_id, is_read);
CREATE INDEX idx_notifications_created_at ON Notifications(created_at DESC);



