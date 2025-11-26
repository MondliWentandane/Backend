# Hotel Endpoints Testing Guide

## Overview

This guide covers all hotel management endpoints. You'll need an admin token for creating/updating/deleting hotels.

---

## Authentication Setup

Before testing hotel endpoints, you need to:

1. **Sign in as Admin:**
   ```
   POST http://localhost:3000/api/auth/signin
   Body: {
     "email": "admin@hotel.com",
     "password": "AdminPass123!"
   }
   ```

2. **Save the token** from the response to use in admin endpoints

---

## Public Endpoints (No Auth Required)

### 1. **Get All Hotels** - With Search & Filter

**Endpoint:** `GET {{base_url}}/api/hotels`

**Query Parameters:**
- `search` - Search by hotel name or address (optional)
- `city` - Filter by city (optional)
- `country` - Filter by country (optional)
- `minRating` - Minimum star rating (1-5) (optional)
- `maxRating` - Maximum star rating (1-5) (optional)
- `limit` - Number of results per page (default: 20) (optional)
- `offset` - Number of results to skip (default: 0) (optional)

**Example Requests:**

```bash
# Get all hotels
GET http://localhost:3000/api/hotels

# Search hotels
GET http://localhost:3000/api/hotels?search=luxury

# Filter by city
GET http://localhost:3000/api/hotels?city=New York

# Filter by country and rating
GET http://localhost:3000/api/hotels?country=USA&minRating=4

# Pagination
GET http://localhost:3000/api/hotels?limit=10&offset=0
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "hotel_id": 1,
      "hotel_name": "Grand Hotel",
      "address": "123 Main St",
      "city": "New York",
      "country": "USA",
      "price_range": "R1,500-R3,000",
      "star_rating": 5,
      "amenities": ["WiFi", "Pool", "Spa"],
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z",
      "photos": [
        {
          "photo_id": 1,
          "photo_url": "https://example.com/photo1.jpg"
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

### 2. **Get Hotel by ID**

**Endpoint:** `GET {{base_url}}/api/hotels/:id`

**Example Request:**
```bash
GET http://localhost:3000/api/hotels/1
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "hotel_id": 1,
    "hotel_name": "Grand Hotel",
    "address": "123 Main St",
    "city": "New York",
    "country": "USA",
    "price_range": "R1,500-R3,000",
    "star_rating": 5,
    "amenities": ["WiFi", "Pool", "Spa"],
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z",
    "photos": [
      {
        "photo_id": 1,
        "photo_url": "https://example.com/photo1.jpg"
      }
    ],
    "room_stats": {
      "total_rooms": 50,
      "available_rooms": 30,
      "min_price": 1500.00,
      "max_price": 7500.00
    },
    "review_stats": {
      "total_reviews": 25,
      "average_rating": 4.5
    }
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

## Admin Endpoints (Auth Required)

### 3. **Create Hotel**

**Endpoint:** `POST {{base_url}}/api/hotels`

**Headers:**
```
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "hotel_name": "Luxury Resort",
  "address": "456 Beach Road",
  "city": "Miami",
  "country": "USA",
  "price_range": "R3,000-R7,500",
  "star_rating": 5,
  "amenities": ["WiFi", "Pool", "Spa", "Gym", "Restaurant"]
}
```

**Expected Response (201 Created):**
```json
{
  "success": true,
  "message": "Hotel created successfully",
  "data": {
    "hotel_id": 2,
    "hotel_name": "Luxury Resort",
    "address": "456 Beach Road",
    "city": "Miami",
    "country": "USA",
    "price_range": "R3,000-R7,500",
    "star_rating": 5,
    "amenities": ["WiFi", "Pool", "Spa", "Gym", "Restaurant"],
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
    "error": "Missing required fields: hotel_name, address, city, country, price_range"
  }
  ```
- `400 Bad Request` - Invalid star rating
  ```json
  {
    "success": false,
    "error": "Star rating must be between 1 and 5"
  }
  ```
- `401 Unauthorized` - No token provided
- `403 Forbidden` - Not an admin

---

### 4. **Update Hotel**

**Endpoint:** `PUT {{base_url}}/api/hotels/:id`

**Headers:**
```
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Body (raw JSON) - All fields optional:**
```json
{
  "hotel_name": "Updated Hotel Name",
  "star_rating": 4,
  "amenities": ["WiFi", "Pool"]
}
```

**Example Request:**
```bash
PUT http://localhost:3000/api/hotels/1
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Hotel updated successfully",
  "data": {
    "hotel_id": 1,
    "hotel_name": "Updated Hotel Name",
    "address": "123 Main St",
    "city": "New York",
    "country": "USA",
    "price_range": "R1,500-R3,000",
    "star_rating": 4,
    "amenities": ["WiFi", "Pool"],
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T12:00:00.000Z"
  }
}
```

**Error Responses:**
- `404 Not Found` - Hotel doesn't exist
- `400 Bad Request` - No fields to update or invalid star rating
- `401 Unauthorized` - No token
- `403 Forbidden` - Not an admin

---

### 5. **Delete Hotel**

**Endpoint:** `DELETE {{base_url}}/api/hotels/:id`

**Headers:**
```
Authorization: Bearer {{token}}
```

**Example Request:**
```bash
DELETE http://localhost:3000/api/hotels/1
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Hotel deleted successfully",
  "data": {
    "hotel_id": 1,
    "hotel_name": "Grand Hotel",
    ...
  }
}
```

**Error Responses:**
- `404 Not Found` - Hotel doesn't exist
- `401 Unauthorized` - No token
- `403 Forbidden` - Not an admin

**Note:** Deleting a hotel will cascade delete all related rooms, photos, bookings, and reviews.

---

## Hotel Photos Management

### 6. **Add Hotel Photo**

**Endpoint:** `POST {{base_url}}/api/hotels/:id/photos`

**Headers:**
```
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "photo_url": "https://example.com/hotel-photo.jpg"
}
```

**Example Request:**
```bash
POST http://localhost:3000/api/hotels/1/photos
```

**Expected Response (201 Created):**
```json
{
  "success": true,
  "message": "Photo added successfully",
  "data": {
    "photo_id": 1,
    "hotel_id": 1,
    "photo_url": "https://example.com/hotel-photo.jpg"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Missing photo_url
  ```json
  {
    "success": false,
    "error": "photo_url is required"
  }
  ```
- `404 Not Found` - Hotel doesn't exist
- `401 Unauthorized` - No token
- `403 Forbidden` - Not an admin

---

### 7. **Delete Hotel Photo**

**Endpoint:** `DELETE {{base_url}}/api/hotels/:id/photos/:photoId`

**Headers:**
```
Authorization: Bearer {{token}}
```

**Example Request:**
```bash
DELETE http://localhost:3000/api/hotels/1/photos/1
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Photo deleted successfully",
  "data": {
    "photo_id": 1,
    "hotel_id": 1,
    "photo_url": "https://example.com/hotel-photo.jpg"
  }
}
```

**Error Responses:**
- `404 Not Found` - Photo doesn't exist
- `401 Unauthorized` - No token
- `403 Forbidden` - Not an admin

---

## Testing Scenarios

### Scenario 1: Complete Hotel Management Flow

1. **Sign in as Admin** → Get admin token
2. **Create Hotel** → Create a new hotel
3. **Get All Hotels** → Verify hotel appears in list
4. **Get Hotel by ID** → View hotel details
5. **Add Photos** → Add multiple photos to hotel
6. **Update Hotel** → Modify hotel details
7. **Delete Photo** → Remove a photo
8. **Delete Hotel** → Remove hotel (optional)

### Scenario 2: Search and Filter Testing

1. **Create multiple hotels** with different cities, countries, ratings
2. **Search by name** → `?search=luxury`
3. **Filter by city** → `?city=New York`
4. **Filter by country** → `?country=USA`
5. **Filter by rating** → `?minRating=4`
6. **Combine filters** → `?city=Miami&minRating=4&maxRating=5`
7. **Test pagination** → `?limit=5&offset=0`

### Scenario 3: Error Handling

Test these error cases:

1. **Create hotel** without required fields → Should return 400
2. **Create hotel** with invalid star rating (0 or 6) → Should return 400
3. **Update non-existent hotel** → Should return 404
4. **Delete non-existent hotel** → Should return 404
5. **Access admin endpoints without token** → Should return 401
6. **Access admin endpoints as customer** → Should return 403

---

## Sample Test Data

### Hotel 1 - Luxury Hotel
```json
{
  "hotel_name": "Grand Luxury Hotel",
  "address": "123 Main Street",
  "city": "New York",
  "country": "USA",
  "price_range": "R3,000-R7,500",
  "star_rating": 5,
  "amenities": ["WiFi", "Pool", "Spa", "Gym", "Restaurant", "Bar"]
}
```

### Hotel 2 - Budget Hotel
```json
{
  "hotel_name": "Budget Inn",
  "address": "456 Economy Lane",
  "city": "Miami",
  "country": "USA",
  "price_range": "R750-R1,500",
  "star_rating": 3,
  "amenities": ["WiFi", "Parking"]
}
```

### Hotel 3 - International Hotel
```json
{
  "hotel_name": "Parisian Boutique",
  "address": "789 Champs-Élysées",
  "city": "Paris",
  "country": "France",
  "price_range": "R2,250-R4,500",
  "star_rating": 4,
  "amenities": ["WiFi", "Restaurant", "Concierge"]
}
```

---

## Quick Test Checklist

- [ ] Server is running
- [ ] Admin user exists and can sign in
- [ ] Get all hotels works (public)
- [ ] Get hotel by ID works (public)
- [ ] Create hotel works (admin)
- [ ] Update hotel works (admin)
- [ ] Delete hotel works (admin)
- [ ] Add photo works (admin)
- [ ] Delete photo works (admin)
- [ ] Search functionality works
- [ ] Filter functionality works
- [ ] Pagination works
- [ ] Error handling works correctly
- [ ] Authentication/Authorization works

---

## Postman Collection Setup

### Environment Variables:
- `base_url`: `http://localhost:3000`
- `token`: (admin token from sign in)
- `hotel_id`: (will be set after creating hotel)

### Test Scripts:

**For Create Hotel:**
```javascript
if (pm.response.code === 201) {
    const jsonData = pm.response.json();
    pm.environment.set("hotel_id", jsonData.data.hotel_id);
        console.log("Hotel created - ID saved");
}
```

**For Get Hotel by ID:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has hotel data", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property("data");
    pm.expect(jsonData.data).to.have.property("hotel_id");
});
```

---

Happy Testing!

