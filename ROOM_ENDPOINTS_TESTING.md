# Room Endpoints Testing Guide

## Overview

This guide covers all room management endpoints. You'll need an admin token for creating/updating/deleting rooms.

---

## Authentication Setup

Before testing room endpoints, you need to:

1. **Sign in as Admin:**
   ```
   POST http://localhost:3000/api/auth/signin
   Body: {
     "email": "admin@hotel.com",
     "password": "AdminPass123!"
   }
   ```

2. **Save the token** from the response to use in admin endpoints

3. **Create a hotel first** (rooms belong to hotels):
   ```
   POST http://localhost:3000/api/hotels
   Headers: Authorization: Bearer {{token}}
   Body: {
     "hotel_name": "Grand Hotel",
     "address": "123 Main St",
     "city": "Cape Town",
     "country": "South Africa",
     "price_range": "R1,500-R3,000",
     "star_rating": 5,
     "amenities": ["WiFi", "Pool", "Spa"]
   }
   ```

---

## Public Endpoints (No Auth Required)

### 1. **Get All Rooms** - With Filters

**Endpoint:** `GET {{base_url}}/api/rooms`

**Query Parameters:**
- `hotel_id` - Filter by hotel ID (optional)
- `status` - Filter by availability status: `available`, `unavailable`, `maintenance` (optional)
- `minPrice` - Minimum price per night (optional)
- `maxPrice` - Maximum price per night (optional)
- `roomType` - Filter by room type (e.g., "Deluxe", "Suite") (optional)
- `limit` - Number of results per page (default: 20) (optional)
- `offset` - Number of results to skip (default: 0) (optional)

**Example Requests:**

```bash
# Get all rooms
GET http://localhost:3000/api/rooms

# Get rooms by hotel
GET http://localhost:3000/api/rooms?hotel_id=1

# Filter by availability
GET http://localhost:3000/api/rooms?status=available

# Filter by price range
GET http://localhost:3000/api/rooms?minPrice=1000&maxPrice=3000

# Filter by room type
GET http://localhost:3000/api/rooms?roomType=Deluxe

# Combine filters
GET http://localhost:3000/api/rooms?hotel_id=1&status=available&minPrice=1500

# Pagination
GET http://localhost:3000/api/rooms?limit=10&offset=0
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "room_id": 1,
      "hotel_id": 1,
      "room_type": "Deluxe Suite",
      "price_per_night": 2500.00,
      "availability_status": "available",
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z",
      "hotel_name": "Grand Hotel",
      "city": "Cape Town",
      "country": "South Africa",
      "photos": [
        {
          "photo_id": 1,
          "photo_url": "https://example.com/room-photo1.jpg"
        }
      ]
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

---

### 2. **Get Rooms by Hotel ID**

**Endpoint:** `GET {{base_url}}/api/rooms/hotel/:hotelId`

**Query Parameters:** (Same as Get All Rooms)
- `status`, `minPrice`, `maxPrice`, `roomType`

**Example Request:**
```bash
GET http://localhost:3000/api/rooms/hotel/1?status=available
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "room_id": 1,
      "hotel_id": 1,
      "room_type": "Deluxe Suite",
      "price_per_night": 2500.00,
      "availability_status": "available",
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z",
      "photos": [...]
    }
  ],
  "hotel": {
    "hotel_id": 1,
    "hotel_name": "Grand Hotel",
    "city": "Cape Town",
    "country": "South Africa"
  }
}
```

**Error Response (404):**
```json
{
  "success": false,
  "error": "Hotel not found"
}
```

---

### 3. **Get Room by ID**

**Endpoint:** `GET {{base_url}}/api/rooms/:id`

**Example Request:**
```bash
GET http://localhost:3000/api/rooms/1
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "room_id": 1,
    "hotel_id": 1,
    "room_type": "Deluxe Suite",
    "price_per_night": 2500.00,
    "availability_status": "available",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z",
    "hotel_name": "Grand Hotel",
    "address": "123 Main St",
    "city": "Cape Town",
    "country": "South Africa",
    "star_rating": 5,
    "photos": [
      {
        "photo_id": 1,
        "photo_url": "https://example.com/room-photo1.jpg"
      }
    ]
  }
}
```

**Error Response (404):**
```json
{
  "success": false,
  "error": "Room not found"
}
```

---

### 4. **Check Room Availability** - For Booking Dates

**Endpoint:** `GET {{base_url}}/api/rooms/:roomId/availability`

**Query Parameters:**
- `check_in_date` - Check-in date (YYYY-MM-DD) (required)
- `check_out_date` - Check-out date (YYYY-MM-DD) (required)

**Example Request:**
```bash
GET http://localhost:3000/api/rooms/1/availability?check_in_date=2024-02-01&check_out_date=2024-02-05
```

**Expected Response - Available (200 OK):**
```json
{
  "success": true,
  "available": true,
  "room": {
    "room_id": 1,
    "room_type": "Deluxe Suite",
    "price_per_night": 2500.00,
    "availability_status": "available"
  },
  "booking_info": {
    "check_in_date": "2024-02-01",
    "check_out_date": "2024-02-05",
    "nights": 4,
    "total_price": 10000.00
  }
}
```

**Expected Response - Not Available (200 OK):**
```json
{
  "success": true,
  "available": false,
  "reason": "Room is already booked for the selected dates",
  "room": {
    "room_id": 1,
    "room_type": "Deluxe Suite"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Missing dates
  ```json
  {
    "success": false,
    "error": "check_in_date and check_out_date are required"
  }
  ```
- `404 Not Found` - Room doesn't exist

---

## Admin Endpoints (Auth Required)

### 5. **Create Room**

**Endpoint:** `POST {{base_url}}/api/rooms`

**Headers:**
```
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "hotel_id": 1,
  "room_type": "Deluxe Suite",
  "price_per_night": 2500.00,
  "availability_status": "available"
}
```

**Expected Response (201 Created):**
```json
{
  "success": true,
  "message": "Room created successfully",
  "data": {
    "room_id": 1,
    "hotel_id": 1,
    "room_type": "Deluxe Suite",
    "price_per_night": 2500.00,
    "availability_status": "available",
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
    "error": "Missing required fields: hotel_id, room_type, price_per_night"
  }
  ```
- `400 Bad Request` - Invalid price
  ```json
  {
    "success": false,
    "error": "Price per night must be a positive number"
  }
  ```
- `400 Bad Request` - Invalid status
  ```json
  {
    "success": false,
    "error": "Invalid availability_status. Must be: available, unavailable, or maintenance"
  }
  ```
- `404 Not Found` - Hotel doesn't exist
- `401 Unauthorized` - No token provided
- `403 Forbidden` - Not an admin

---

### 6. **Update Room**

**Endpoint:** `PUT {{base_url}}/api/rooms/:id`

**Headers:**
```
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Body (raw JSON) - All fields optional:**
```json
{
  "room_type": "Premium Suite",
  "price_per_night": 3000.00,
  "availability_status": "available"
}
```

**Example Request:**
```bash
PUT http://localhost:3000/api/rooms/1
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Room updated successfully",
  "data": {
    "room_id": 1,
    "hotel_id": 1,
    "room_type": "Premium Suite",
    "price_per_night": 3000.00,
    "availability_status": "available",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T12:00:00.000Z"
  }
}
```

**Error Responses:**
- `404 Not Found` - Room doesn't exist
- `400 Bad Request` - No fields to update or invalid values
- `401 Unauthorized` - No token
- `403 Forbidden` - Not an admin

---

### 7. **Delete Room**

**Endpoint:** `DELETE {{base_url}}/api/rooms/:id`

**Headers:**
```
Authorization: Bearer {{token}}
```

**Example Request:**
```bash
DELETE http://localhost:3000/api/rooms/1
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Room deleted successfully",
  "data": {
    "room_id": 1,
    "hotel_id": 1,
    "room_type": "Deluxe Suite",
    ...
  }
}
```

**Error Responses:**
- `404 Not Found` - Room doesn't exist
- `400 Bad Request` - Room has active bookings
  ```json
  {
    "success": false,
    "error": "Cannot delete room with 2 active booking(s). Please cancel bookings first."
  }
  ```
- `401 Unauthorized` - No token
- `403 Forbidden` - Not an admin

**Note:** Deleting a room will cascade delete all related photos. Rooms with active bookings cannot be deleted.

---

### 8. **Update Room Availability**

**Endpoint:** `PATCH {{base_url}}/api/rooms/:id/availability`

**Headers:**
```
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "availability_status": "maintenance"
}
```

**Example Request:**
```bash
PATCH http://localhost:3000/api/rooms/1/availability
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Room availability updated successfully",
  "data": {
    "room_id": 1,
    "hotel_id": 1,
    "room_type": "Deluxe Suite",
    "price_per_night": 2500.00,
    "availability_status": "maintenance",
    ...
  }
}
```

**Valid Status Values:**
- `available` - Room is available for booking
- `unavailable` - Room is not available
- `maintenance` - Room is under maintenance

**Error Responses:**
- `400 Bad Request` - Missing or invalid status
- `404 Not Found` - Room doesn't exist
- `401 Unauthorized` - No token
- `403 Forbidden` - Not an admin

---

## Room Photos Management

### 9. **Add Room Photo**

**Endpoint:** `POST {{base_url}}/api/rooms/:id/photos`

**Headers:**
```
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "photo_url": "https://example.com/room-photo.jpg"
}
```

**Example Request:**
```bash
POST http://localhost:3000/api/rooms/1/photos
```

**Expected Response (201 Created):**
```json
{
  "success": true,
  "message": "Photo added successfully",
  "data": {
    "photo_id": 1,
    "room_id": 1,
    "photo_url": "https://example.com/room-photo.jpg"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Missing photo_url
- `404 Not Found` - Room doesn't exist
- `401 Unauthorized` - No token
- `403 Forbidden` - Not an admin

---

### 10. **Delete Room Photo**

**Endpoint:** `DELETE {{base_url}}/api/rooms/:id/photos/:photoId`

**Headers:**
```
Authorization: Bearer {{token}}
```

**Example Request:**
```bash
DELETE http://localhost:3000/api/rooms/1/photos/1
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Photo deleted successfully",
  "data": {
    "photo_id": 1,
    "room_id": 1,
    "photo_url": "https://example.com/room-photo.jpg"
  }
}
```

**Error Responses:**
- `404 Not Found` - Photo doesn't exist
- `401 Unauthorized` - No token
- `403 Forbidden` - Not an admin

---

## Testing Scenarios

### Scenario 1: Complete Room Management Flow

1. **Sign in as Admin** → Get admin token
2. **Create Hotel** → Create a hotel first (rooms belong to hotels)
3. **Create Room** → Create multiple rooms for the hotel
4. **Get All Rooms** → Verify rooms appear in list
5. **Get Rooms by Hotel** → View all rooms for a specific hotel
6. **Get Room by ID** → View room details
7. **Add Photos** → Add multiple photos to room
8. **Check Availability** → Check if room is available for dates
9. **Update Room** → Modify room details
10. **Update Availability** → Change room status
11. **Delete Photo** → Remove a photo
12. **Delete Room** → Remove room (optional)

### Scenario 2: Filtering and Search Testing

1. **Create multiple rooms** with different types, prices, and statuses
2. **Filter by hotel** → `?hotel_id=1`
3. **Filter by status** → `?status=available`
4. **Filter by price** → `?minPrice=1500&maxPrice=3000`
5. **Filter by room type** → `?roomType=Suite`
6. **Combine filters** → `?hotel_id=1&status=available&minPrice=2000`
7. **Test pagination** → `?limit=5&offset=0`

### Scenario 3: Availability Checking

1. **Create a room**
2. **Check availability** for future dates → Should be available
3. **Create a booking** (when booking system is ready)
4. **Check availability** for booked dates → Should be unavailable
5. **Update room to maintenance** → Check availability → Should show maintenance reason

### Scenario 4: Error Handling

Test these error cases:

1. **Create room** without required fields → Should return 400
2. **Create room** with negative price → Should return 400
3. **Create room** with invalid hotel_id → Should return 404
4. **Create room** with invalid status → Should return 400
5. **Update non-existent room** → Should return 404
6. **Delete room with active bookings** → Should return 400
7. **Access admin endpoints without token** → Should return 401
8. **Access admin endpoints as customer** → Should return 403

---

## Sample Test Data

### Room 1 - Deluxe Suite
```json
{
  "hotel_id": 1,
  "room_type": "Deluxe Suite",
  "price_per_night": 2500.00,
  "availability_status": "available"
}
```

### Room 2 - Standard Room
```json
{
  "hotel_id": 1,
  "room_type": "Standard Room",
  "price_per_night": 1500.00,
  "availability_status": "available"
}
```

### Room 3 - Premium Suite
```json
{
  "hotel_id": 1,
  "room_type": "Premium Suite",
  "price_per_night": 3500.00,
  "availability_status": "available"
}
```

### Room 4 - Under Maintenance
```json
{
  "hotel_id": 1,
  "room_type": "Family Room",
  "price_per_night": 2000.00,
  "availability_status": "maintenance"
}
```

---

## Quick Test Checklist

- [ ] Server is running
- [ ] Admin user exists and can sign in
- [ ] Hotel exists (create one first)
- [ ] Get all rooms works (public)
- [ ] Get rooms by hotel works (public)
- [ ] Get room by ID works (public)
- [ ] Check room availability works (public)
- [ ] Create room works (admin)
- [ ] Update room works (admin)
- [ ] Update room availability works (admin)
- [ ] Delete room works (admin)
- [ ] Add photo works (admin)
- [ ] Delete photo works (admin)
- [ ] Filter functionality works
- [ ] Pagination works
- [ ] Error handling works correctly
- [ ] Authentication/Authorization works

---

## Postman Collection Setup

### Environment Variables:
- `base_url`: `http://localhost:3000`
- `token`: (admin token from sign in)
- `hotel_id`: (hotel ID - set after creating hotel)
- `room_id`: (will be set after creating room)

### Test Scripts:

**For Create Room:**
```javascript
if (pm.response.code === 201) {
    const jsonData = pm.response.json();
    pm.environment.set("room_id", jsonData.data.room_id);
        console.log("Room created - ID saved");
}
```

**For Get Room by ID:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has room data", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property("data");
    pm.expect(jsonData.data).to.have.property("room_id");
});
```

**For Check Availability:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response indicates availability", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property("available");
});
```

---

## Important Notes

1. **Rooms belong to Hotels:** Always create a hotel first before creating rooms
2. **Price in Rand:** All prices are in South African Rand (ZAR)
3. **Availability Status:** 
   - `available` - Can be booked
   - `unavailable` - Cannot be booked
   - `maintenance` - Under maintenance, cannot be booked
4. **Active Bookings:** Rooms with pending or confirmed bookings cannot be deleted
5. **Cascade Delete:** Deleting a room will automatically delete all its photos
6. **Date Format:** Use `YYYY-MM-DD` format for dates (e.g., `2024-02-01`)

---

Happy Testing!

