# Booking Endpoints Testing Guide

## Overview

This guide covers all booking management endpoints. You'll need customer authentication for creating bookings and admin authentication for managing all bookings.

---

## Authentication Setup

Before testing booking endpoints, you need to:

1. **Sign in as Customer:**
   ```
   POST http://localhost:3000/api/auth/signin
   Body: {
     "email": "customer@example.com",
     "password": "CustomerPass123!"
   }
   ```

2. **Sign in as Admin (for admin endpoints):**
   ```
   POST http://localhost:3000/api/auth/signin
   Body: {
     "email": "admin@hotel.com",
     "password": "AdminPass123!"
   }
   ```

3. **Create a hotel and room first** (bookings require both):
   - Create hotel: `POST /api/hotels`
   - Create room: `POST /api/rooms`

---

## Customer Endpoints (Auth Required)

### 1. **Create Booking**

**Endpoint:** `POST {{base_url}}/api/bookings`

**Headers:**
```
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "hotel_id": 1,
  "room_id": 1,
  "check_in_date": "2024-02-01",
  "check_out_date": "2024-02-05"
}
```

**Expected Response (201 Created):**
```json
{
  "success": true,
  "message": "Booking created successfully",
  "data": {
    "booking_id": 1,
    "user_id": 1,
    "hotel_id": 1,
    "room_id": 1,
    "check_in_date": "2024-02-01",
    "check_out_date": "2024-02-05",
    "status": "pending",
    "total_price": 10000.00,
    "payment_status": "pending",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Missing required fields
  ```json
  {
    "success": false,
    "error": "Missing required fields: hotel_id, room_id, check_in_date, check_out_date"
  }
  ```
- `400 Bad Request` - Invalid dates
  ```json
  {
    "success": false,
    "error": "Check-in date cannot be in the past"
  }
  ```
- `400 Bad Request` - Room not available
  ```json
  {
    "success": false,
    "error": "Room is already booked for the selected dates"
  }
  ```
- `404 Not Found` - Hotel or room not found
- `401 Unauthorized` - No token provided
- `403 Forbidden` - Not a customer

---

### 2. **Get User's Bookings**

**Endpoint:** `GET {{base_url}}/api/bookings/my-bookings`

**Headers:**
```
Authorization: Bearer {{token}}
```

**Query Parameters:**
- `status` - Filter by booking status: `pending`, `confirmed`, `cancelled`, `completed` (optional)
- `limit` - Number of results per page (default: 20) (optional)
- `offset` - Number of results to skip (default: 0) (optional)

**Example Requests:**
```bash
# Get all user bookings
GET http://localhost:3000/api/bookings/my-bookings

# Get only pending bookings
GET http://localhost:3000/api/bookings/my-bookings?status=pending

# Get confirmed bookings with pagination
GET http://localhost:3000/api/bookings/my-bookings?status=confirmed&limit=10&offset=0
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "booking_id": 1,
      "user_id": 1,
      "hotel_id": 1,
      "room_id": 1,
      "check_in_date": "2024-02-01",
      "check_out_date": "2024-02-05",
      "status": "pending",
      "total_price": 10000.00,
      "payment_status": "pending",
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z",
      "hotel_name": "Grand Hotel",
      "address": "123 Main St",
      "city": "Cape Town",
      "country": "South Africa",
      "room_type": "Deluxe Suite",
      "price_per_night": 2500.00
    }
  ],
  "pagination": {
    "total": 5,
    "limit": 20,
    "offset": 0,
    "hasMore": false
  }
}
```

---

### 3. **Get Booking by ID**

**Endpoint:** `GET {{base_url}}/api/bookings/:id`

**Headers:**
```
Authorization: Bearer {{token}}
```

**Example Request:**
```bash
GET http://localhost:3000/api/bookings/1
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "booking_id": 1,
    "user_id": 1,
    "hotel_id": 1,
    "room_id": 1,
    "check_in_date": "2024-02-01",
    "check_out_date": "2024-02-05",
    "status": "pending",
    "total_price": 10000.00,
    "payment_status": "pending",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z",
    "user_name": "John Doe",
    "user_email": "customer@example.com",
    "user_phone": "+1234567890",
    "hotel_name": "Grand Hotel",
    "address": "123 Main St",
    "city": "Cape Town",
    "country": "South Africa",
    "star_rating": 5,
    "room_type": "Deluxe Suite",
    "price_per_night": 2500.00,
    "availability_status": "available"
  }
}
```

**Error Responses:**
- `404 Not Found` - Booking doesn't exist
- `403 Forbidden` - Customer trying to view another user's booking
- `401 Unauthorized` - No token

**Note:** Customers can only view their own bookings. Admins can view any booking.

---

### 4. **Cancel Booking**

**Endpoint:** `PATCH {{base_url}}/api/bookings/:id/cancel`

**Headers:**
```
Authorization: Bearer {{token}}
```

**Example Request:**
```bash
PATCH http://localhost:3000/api/bookings/1/cancel
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Booking cancelled successfully",
  "data": {
    "booking_id": 1,
    "status": "cancelled",
    ...
  }
}
```

**Error Responses:**
- `404 Not Found` - Booking doesn't exist
- `400 Bad Request` - Booking already cancelled
  ```json
  {
    "success": false,
    "error": "Booking is already cancelled"
  }
  ```
- `400 Bad Request` - Cannot cancel completed booking
- `403 Forbidden` - Customer trying to cancel another user's booking
- `401 Unauthorized` - No token

**Note:** Customers can only cancel their own bookings. Admins can cancel any booking.

---

## Admin Endpoints (Auth + Admin Role Required)

### 5. **Get All Bookings**

**Endpoint:** `GET {{base_url}}/api/bookings`

**Headers:**
```
Authorization: Bearer {{admin_token}}
```

**Query Parameters:**
- `user_id` - Filter by user ID (optional)
- `hotel_id` - Filter by hotel ID (optional)
- `status` - Filter by booking status (optional)
- `payment_status` - Filter by payment status: `pending`, `paid`, `failed` (optional)
- `limit` - Number of results per page (default: 20) (optional)
- `offset` - Number of results to skip (default: 0) (optional)

**Example Requests:**
```bash
# Get all bookings
GET http://localhost:3000/api/bookings

# Filter by status
GET http://localhost:3000/api/bookings?status=confirmed

# Filter by hotel
GET http://localhost:3000/api/bookings?hotel_id=1

# Filter by payment status
GET http://localhost:3000/api/bookings?payment_status=paid

# Combine filters
GET http://localhost:3000/api/bookings?hotel_id=1&status=confirmed&payment_status=paid
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "booking_id": 1,
      "user_id": 1,
      "hotel_id": 1,
      "room_id": 1,
      "check_in_date": "2024-02-01",
      "check_out_date": "2024-02-05",
      "status": "confirmed",
      "total_price": 10000.00,
      "payment_status": "paid",
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z",
      "user_name": "John Doe",
      "user_email": "customer@example.com",
      "hotel_name": "Grand Hotel",
      "city": "Cape Town",
      "country": "South Africa",
      "room_type": "Deluxe Suite",
      "price_per_night": 2500.00
    }
  ],
  "pagination": {
    "total": 50,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

**Error Responses:**
- `401 Unauthorized` - No token
- `403 Forbidden` - Not an admin

---

### 6. **Get Bookings by Hotel**

**Endpoint:** `GET {{base_url}}/api/bookings/hotel/:hotelId`

**Headers:**
```
Authorization: Bearer {{admin_token}}
```

**Query Parameters:**
- `status` - Filter by booking status (optional)
- `payment_status` - Filter by payment status (optional)
- `limit` - Number of results per page (optional)
- `offset` - Number of results to skip (optional)

**Example Request:**
```bash
GET http://localhost:3000/api/bookings/hotel/1?status=confirmed
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "booking_id": 1,
      "user_id": 1,
      "hotel_id": 1,
      "room_id": 1,
      "check_in_date": "2024-02-01",
      "check_out_date": "2024-02-05",
      "status": "confirmed",
      "total_price": 10000.00,
      "payment_status": "paid",
      ...
    }
  ],
  "hotel": {
    "hotel_id": 1,
    "hotel_name": "Grand Hotel"
  },
  "pagination": {
    "limit": 20,
    "offset": 0
  }
}
```

**Error Responses:**
- `404 Not Found` - Hotel doesn't exist
- `401 Unauthorized` - No token
- `403 Forbidden` - Not an admin

---

### 7. **Update Booking Status**

**Endpoint:** `PATCH {{base_url}}/api/bookings/:id/status`

**Headers:**
```
Authorization: Bearer {{admin_token}}
Content-Type: application/json
```

**Body (raw JSON) - All fields optional:**
```json
{
  "status": "confirmed",
  "payment_status": "paid"
}
```

**Example Request:**
```bash
PATCH http://localhost:3000/api/bookings/1/status
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Booking status updated successfully",
  "data": {
    "booking_id": 1,
    "status": "confirmed",
    "payment_status": "paid",
    ...
  }
}
```

**Valid Status Values:**
- Booking Status: `pending`, `confirmed`, `cancelled`, `completed`
- Payment Status: `pending`, `paid`, `failed`

**Error Responses:**
- `404 Not Found` - Booking doesn't exist
- `400 Bad Request` - Invalid status values
  ```json
  {
    "success": false,
    "error": "Invalid status. Must be: pending, confirmed, cancelled, or completed"
  }
  ```
- `400 Bad Request` - No fields to update
- `401 Unauthorized` - No token
- `403 Forbidden` - Not an admin

---

## Testing Scenarios

### Scenario 1: Complete Booking Flow

1. **Sign in as Customer** → Get customer token
2. **Check Room Availability** → Verify room is available for dates
3. **Create Booking** → Create a new booking
4. **Get User Bookings** → Verify booking appears in list
5. **Get Booking by ID** → View booking details
6. **Cancel Booking** → Cancel the booking (optional)

### Scenario 2: Admin Management Flow

1. **Sign in as Admin** → Get admin token
2. **Get All Bookings** → View all bookings
3. **Filter Bookings** → Filter by status, hotel, payment status
4. **Get Bookings by Hotel** → View bookings for specific hotel
5. **Update Booking Status** → Confirm booking and mark payment as paid
6. **View Booking Details** → Get full booking information

### Scenario 3: Date Validation Testing

1. **Create booking** with past check-in date → Should return 400
2. **Create booking** with check-out before check-in → Should return 400
3. **Create booking** with invalid date format → Should return 400
4. **Create booking** with valid dates → Should succeed

### Scenario 4: Availability Testing

1. **Create booking** for room and dates
2. **Try to create another booking** for same room and overlapping dates → Should return 400
3. **Check room availability** for booked dates → Should show unavailable
4. **Cancel first booking**
5. **Check room availability** again → Should show available

### Scenario 5: Error Handling

Test these error cases:

1. **Create booking** without required fields → Should return 400
2. **Create booking** for non-existent hotel → Should return 404
3. **Create booking** for non-existent room → Should return 404
4. **Create booking** for unavailable room → Should return 400
5. **Customer view another user's booking** → Should return 403
6. **Customer cancel another user's booking** → Should return 403
7. **Access admin endpoints as customer** → Should return 403

---

## Sample Test Data

### Booking 1 - Pending
```json
{
  "hotel_id": 1,
  "room_id": 1,
  "check_in_date": "2024-02-01",
  "check_out_date": "2024-02-05"
}
```

### Booking 2 - Confirmed
```json
{
  "hotel_id": 1,
  "room_id": 2,
  "check_in_date": "2024-02-10",
  "check_out_date": "2024-02-15"
}
```

### Booking 3 - Different Hotel
```json
{
  "hotel_id": 2,
  "room_id": 3,
  "check_in_date": "2024-03-01",
  "check_out_date": "2024-03-03"
}
```

---

## Quick Test Checklist

- [ ] Server is running
- [ ] Customer user exists and can sign in
- [ ] Admin user exists and can sign in
- [ ] Hotel exists (create one first)
- [ ] Room exists (create one first)
- [ ] Create booking works (customer)
- [ ] Get user bookings works (customer)
- [ ] Get booking by ID works (customer)
- [ ] Cancel booking works (customer)
- [ ] Get all bookings works (admin)
- [ ] Get bookings by hotel works (admin)
- [ ] Update booking status works (admin)
- [ ] Date validation works correctly
- [ ] Availability checking works correctly
- [ ] Price calculation is correct
- [ ] Error handling works correctly
- [ ] Authentication/Authorization works

---

## Postman Collection Setup

### Environment Variables:
- `base_url`: `http://localhost:3000`
- `customer_token`: (customer token from sign in)
- `admin_token`: (admin token from sign in)
- `hotel_id`: (hotel ID - set after creating hotel)
- `room_id`: (room ID - set after creating room)
- `booking_id`: (will be set after creating booking)

### Test Scripts:

**For Create Booking:**
```javascript
if (pm.response.code === 201) {
    const jsonData = pm.response.json();
    pm.environment.set("booking_id", jsonData.data.booking_id);
        console.log("Booking created - ID saved");
    
    // Calculate nights
    const checkIn = new Date(jsonData.data.check_in_date);
    const checkOut = new Date(jsonData.data.check_out_date);
    const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    console.log(`📅 Booking for ${nights} nights`);
}
```

**For Get Booking by ID:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has booking data", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property("data");
    pm.expect(jsonData.data).to.have.property("booking_id");
});
```

---

## Important Notes

1. **Date Format:** Use `YYYY-MM-DD` format (e.g., `2024-02-01`)
2. **Price Calculation:** Total price = (nights) × (price_per_night)
3. **Booking Status Flow:**
   - `pending` → `confirmed` → `completed`
   - Can be `cancelled` at any time (except completed)
4. **Payment Status:** Separate from booking status
   - `pending` → `paid` or `failed`
5. **Availability:** Bookings check for conflicts with existing `pending` or `confirmed` bookings
6. **Permissions:**
   - Customers can only view/manage their own bookings
   - Admins can view/manage all bookings
7. **Room Status:** Room must be `available` to create a booking

---

## Booking Status Workflow

```
pending → confirmed → completed
   ↓
cancelled (can cancel from pending or confirmed, but not from completed)
```

**Payment Status:**
```
pending → paid
   ↓
failed
```

---

Happy Testing!

