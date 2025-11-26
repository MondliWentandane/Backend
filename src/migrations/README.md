# Database Migrations

## Migration 1: Add Guest Count to Bookings

**File:** `add_guest_count_to_bookings.sql`

**Description:** Adds `number_of_guests` column to the Bookings table to track how many guests are in each booking.

### What This Migration Does

- Adds `number_of_guests` column (INT, default 1, range 1-20)
- Updates existing bookings to have 1 guest (default)
- Makes the column NOT NULL

---

## Migration 2: Add Number of Rooms to Bookings

**File:** `add_number_of_rooms_to_bookings.sql`

**Description:** Adds `number_of_rooms` column to the Bookings table to track how many rooms are booked in each booking.

### What This Migration Does

- Adds `number_of_rooms` column (INT, default 1, range 1-10)
- Updates existing bookings to have 1 room (default)
- Makes the column NOT NULL
- Total price calculation now multiplies by number of rooms

---

## How to Run Migrations

### Option 1: Supabase SQL Editor (Recommended)
1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste the SQL from the migration file
3. Click "Run"

### Option 2: PostgreSQL Command Line
```bash
psql -h your-host -U your-user -d your-database -f src/migrations/add_guest_count_to_bookings.sql
psql -h your-host -U your-user -d your-database -f src/migrations/add_number_of_rooms_to_bookings.sql
```

### Option 3: Node.js Script
```javascript
const pool = require('./config/database');
const fs = require('fs');

// Run guest count migration
const guestCountSQL = fs.readFileSync('./src/migrations/add_guest_count_to_bookings.sql', 'utf8');
await pool.query(guestCountSQL);

// Run number of rooms migration
const roomsSQL = fs.readFileSync('./src/migrations/add_number_of_rooms_to_bookings.sql', 'utf8');
await pool.query(roomsSQL);
```

### After Migrations

- All new bookings will accept `number_of_guests` (defaults to 1) and `number_of_rooms` (defaults to 1)
- Existing bookings will have both fields set to 1
- Total price = (price_per_night × nights) × number_of_rooms
- The API now accepts both fields in booking creation requests


