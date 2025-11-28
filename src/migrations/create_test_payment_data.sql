-- Test Data for Receipt Functionality
-- This script creates test data to test receipt generation and email sending
-- Run this in your PostgreSQL database (Supabase SQL Editor)

-- Step 1: Check if you have a test user (or create one)
-- If you don't have a user, create one first:
-- INSERT INTO users (email, password_hash, name, phone_number, role)
-- VALUES ('test@example.com', 'hashed_password', 'Test User', '+1234567890', 'customer')
-- RETURNING user_id;

-- Step 2: Check if you have a hotel and room (or create them)
-- If you don't have a hotel, create one:
-- INSERT INTO Hotels (hotel_name, address, city, country, price_range, star_rating)
-- VALUES ('Test Hotel', '123 Test St', 'Cape Town', 'South Africa', '$100-$200', 4)
-- RETURNING hotel_id;

-- If you don't have a room, create one:
-- INSERT INTO Rooms (hotel_id, room_type, price_per_night, availability_status)
-- VALUES (1, 'Deluxe Room', 150.00, 'available')
-- RETURNING room_id;

-- Step 3: Create a test booking
-- Replace user_id, hotel_id, and room_id with actual IDs from your database
INSERT INTO Bookings (
    user_id,
    hotel_id,
    room_id,
    check_in_date,
    check_out_date,
    number_of_guests,
    number_of_rooms,
    total_price,
    status,
    payment_status
)
VALUES (
    1,  -- Replace with your actual user_id
    1,  -- Replace with your actual hotel_id
    1,  -- Replace with your actual room_id
    CURRENT_DATE + INTERVAL '7 days',  -- Check-in 7 days from now
    CURRENT_DATE + INTERVAL '10 days',  -- Check-out 10 days from now (3 nights)
    2,  -- 2 guests
    1,  -- 1 room
    450.00,  -- Total: 150 per night × 3 nights × 1 room
    'confirmed',
    'paid'
)
RETURNING booking_id;

-- Step 4: Create a test payment for the booking
-- Replace booking_id with the ID returned from Step 3
-- Replace the transaction_reference with a test PayPal transaction ID
INSERT INTO Payments (
    booking_id,
    amount,
    payment_gateway,
    transaction_reference,
    status
)
VALUES (
    1,  -- Replace with booking_id from Step 3
    450.00,
    'PayPal',
    'TEST-TXN-' || TO_CHAR(NOW(), 'YYYYMMDDHH24MISS'),  -- Generate unique test transaction ID
    'paid'
)
RETURNING payment_id;

-- Step 5: Verify the data
-- Check if everything is set up correctly:
SELECT 
    b.booking_id,
    b.status as booking_status,
    b.payment_status,
    b.total_price,
    u.email as user_email,
    u.name as user_name,
    h.hotel_name,
    p.payment_id,
    p.transaction_reference,
    p.amount as payment_amount,
    p.status as payment_status
FROM Bookings b
INNER JOIN users u ON b.user_id = u.user_id
INNER JOIN Hotels h ON b.hotel_id = h.hotel_id
INNER JOIN Payments p ON b.booking_id = p.booking_id
WHERE b.booking_id = 1;  -- Replace with your booking_id

-- If the query returns data, you're ready to test receipts!

