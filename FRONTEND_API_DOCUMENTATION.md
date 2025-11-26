# Frontend API Documentation

## Base URL
```
http://localhost:3000/api
```
(Replace with your production URL when deployed)

---

## Authentication Flow

### Important: Using Supabase for Authentication

Your backend uses **Supabase** for authentication. The frontend should:

1. **Sign up/Sign in** using the backend endpoints below
2. **Receive a Supabase JWT token** from the response
3. **Store the token** (localStorage, sessionStorage, or state management)
4. **Include the token** in all authenticated requests as: `Authorization: Bearer <token>`

### Token Format
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Authentication Endpoints

### 1. Sign Up
**POST** `/api/auth/signup`

**Body:**
```json
{
  "email": "user@example.com",
  "password": "Password123!",
  "name": "John Doe",
  "phone_number": "+1234567890",
  "role": "customer"  // Optional: "customer" (default) or "admin"
}
```

**Response:**
```json
{
  "message": "Signup successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "user_id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "phone_number": "+1234567890",
    "role": "customer",
    "created_at": "2025-11-26T00:00:00.000Z"
  }
}
```

### 2. Sign In
**POST** `/api/auth/signin`

**Body:**
```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "user_id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "phone_number": "+1234567890",
    "role": "customer"
  }
}
```

### 3. Google Sign In
**POST** `/api/auth/signin/google`

**Body:**
```json
{
  "redirectUrl": "http://localhost:3000/auth/callback"
}
```

**Response:**
```json
{
  "message": "Google OAuth started",
  "url": "https://supabase.co/auth/v1/authorize?..."
}
```

### 4. Forgot Password
**POST** `/api/auth/forgot-password`

**Body:**
```json
{
  "email": "user@example.com"
}
```

### 5. Reset Password
**POST** `/api/auth/reset-password`

**Body:**
```json
{
  "access_token": "token-from-email",
  "new_password": "NewPassword123!",
  "email": "user@example.com"
}
```

### 6. Refresh Token
**POST** `/api/auth/refresh-token`

**Body:**
```json
{
  "refresh_token": "refresh-token-from-signin"
}
```

---

## Public Endpoints (No Authentication Required)

### Hotels

#### Get All Hotels
**GET** `/api/hotels`

**Query Parameters:**
- `search` - Search by name or address
- `city` - Filter by city
- `country` - Filter by country
- `minRating` - Minimum star rating (1-5)
- `maxRating` - Maximum star rating (1-5)
- `limit` - Results per page (default: 20)
- `offset` - Skip results (default: 0)

**Example:**
```
GET /api/hotels?search=luxury&city=Cape Town&minRating=4
```

#### Get Hotel by ID
**GET** `/api/hotels/:id`

---

### Rooms

#### Get All Rooms
**GET** `/api/rooms`

**Query Parameters:**
- `hotel_id` - Filter by hotel
- `status` - Filter by status: `available`, `unavailable`, `maintenance`
- `minPrice` - Minimum price
- `maxPrice` - Maximum price
- `roomType` - Filter by room type
- `limit` - Results per page
- `offset` - Skip results

**Example:**
```
GET /api/rooms?hotel_id=1&status=available&minPrice=1000
```

#### Get Rooms by Hotel
**GET** `/api/rooms/hotel/:hotelId`

#### Get Room by ID
**GET** `/api/rooms/:id`

#### Check Room Availability
**GET** `/api/rooms/:roomId/availability?check_in=2025-12-01&check_out=2025-12-05`

---

## Customer Endpoints (Authentication Required)

### Bookings

#### Create Booking
**POST** `/api/bookings`

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "hotel_id": 1,
  "room_id": 1,
  "check_in_date": "2025-12-01",
  "check_out_date": "2025-12-05",
  "number_of_guests": 2,
  "number_of_rooms": 1
}
```

#### Get My Bookings
**GET** `/api/bookings/my-bookings`

**Headers:**
```
Authorization: Bearer <token>
```

#### Get Booking by ID
**GET** `/api/bookings/:id`

**Headers:**
```
Authorization: Bearer <token>
```
(Customer can only view their own bookings)

#### Cancel Booking
**PATCH** `/api/bookings/:id/cancel`

**Headers:**
```
Authorization: Bearer <token>
```

---

### User Profile

#### Get My Profile
**GET** `/api/users/profile`

**Headers:**
```
Authorization: Bearer <token>
```

#### Update My Profile
**PUT** `/api/users/profile`

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "name": "Updated Name",
  "phone_number": "+1234567890"
}
```

#### Get User by ID
**GET** `/api/users/:userId`

**Headers:**
```
Authorization: Bearer <token>
```
(Users can only view their own profile)

---

### Reviews

#### Create Review
**POST** `/api/reviews`

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "hotel_id": 1,
  "rating": 5,
  "comment": "Great hotel!"
}
```

#### Get Reviews by Hotel
**GET** `/api/reviews/hotel/:hotelId`

(No auth required - public)

#### Get Review by ID
**GET** `/api/reviews/:id`

(No auth required - public)

#### Get Reviews by User
**GET** `/api/reviews/user/:userId`

**Headers:**
```
Authorization: Bearer <token>
```
(Users can only view their own reviews)

#### Update Review
**PUT** `/api/reviews/:id`

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "rating": 4,
  "comment": "Updated review"
}
```

#### Delete Review
**DELETE** `/api/reviews/:id`

**Headers:**
```
Authorization: Bearer <token>
```

---

### Favourites

#### Add to Favourites
**POST** `/api/favourites`

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "hotel_id": 1
}
```

#### Remove from Favourites
**DELETE** `/api/favourites/:hotelId`

**Headers:**
```
Authorization: Bearer <token>
```

#### Get My Favourites
**GET** `/api/favourites/my-favourites`

**Headers:**
```
Authorization: Bearer <token>
```

#### Check if Hotel is Favourite
**GET** `/api/favourites/check/:hotelId`

**Headers:**
```
Authorization: Bearer <token>
```

#### Get Favourites by User
**GET** `/api/favourites/user/:userId`

**Headers:**
```
Authorization: Bearer <token>
```
(Users can only view their own favourites)

---

### Notifications

#### Get My Notifications
**GET** `/api/notifications`

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `is_read` - Filter by read status: `true` or `false`
- `type` - Filter by notification type
- `limit` - Results per page
- `offset` - Skip results

#### Get Notification by ID
**GET** `/api/notifications/:id`

**Headers:**
```
Authorization: Bearer <token>
```

#### Mark Notification as Read
**PATCH** `/api/notifications/:id/read`

**Headers:**
```
Authorization: Bearer <token>
```

#### Mark All Notifications as Read
**PATCH** `/api/notifications/read-all`

**Headers:**
```
Authorization: Bearer <token>
```

#### Delete Notification
**DELETE** `/api/notifications/:id`

**Headers:**
```
Authorization: Bearer <token>
```

#### Get Unread Count
**GET** `/api/notifications/unread-count`

**Headers:**
```
Authorization: Bearer <token>
```

---

## Admin Endpoints (Admin Role Required)

### Hotels

#### Create Hotel
**POST** `/api/hotels`

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Body:**
```json
{
  "hotel_name": "Grand Hotel",
  "address": "123 Main St",
  "city": "Cape Town",
  "country": "South Africa",
  "price_range": "R1,500-R3,000",
  "star_rating": 5,
  "amenities": ["WiFi", "Pool", "Spa"]
}
```

#### Update Hotel
**PUT** `/api/hotels/:id`

**Headers:**
```
Authorization: Bearer <admin-token>
```

#### Delete Hotel
**DELETE** `/api/hotels/:id`

**Headers:**
```
Authorization: Bearer <admin-token>
```

#### Add Hotel Photo
**POST** `/api/hotels/:id/photos`

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Body:**
```json
{
  "photo_url": "https://example.com/photo.jpg"
}
```

#### Delete Hotel Photo
**DELETE** `/api/hotels/:id/photos/:photoId`

**Headers:**
```
Authorization: Bearer <admin-token>
```

---

### Rooms

#### Create Room
**POST** `/api/rooms`

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Body:**
```json
{
  "hotel_id": 1,
  "room_type": "Deluxe Suite",
  "price_per_night": 2500.00,
  "availability_status": "available"
}
```

#### Update Room
**PUT** `/api/rooms/:id`

**Headers:**
```
Authorization: Bearer <admin-token>
```

#### Delete Room
**DELETE** `/api/rooms/:id`

**Headers:**
```
Authorization: Bearer <admin-token>
```

#### Update Room Availability
**PATCH** `/api/rooms/:id/availability`

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Body:**
```json
{
  "availability_status": "maintenance"
}
```

#### Add Room Photo
**POST** `/api/rooms/:id/photos`

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Body:**
```json
{
  "photo_url": "https://example.com/photo.jpg"
}
```

#### Delete Room Photo
**DELETE** `/api/rooms/:id/photos/:photoId`

**Headers:**
```
Authorization: Bearer <admin-token>
```

---

### Bookings

#### Get All Bookings
**GET** `/api/bookings`

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Query Parameters:**
- `status` - Filter by status: `pending`, `confirmed`, `cancelled`, `completed`
- `hotel_id` - Filter by hotel
- `limit` - Results per page
- `offset` - Skip results

#### Get Bookings by Hotel
**GET** `/api/bookings/hotel/:hotelId`

**Headers:**
```
Authorization: Bearer <admin-token>
```

#### Update Booking Status
**PATCH** `/api/bookings/:id/status`

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Body:**
```json
{
  "status": "confirmed"
}
```

---

## Error Responses

### 401 Unauthorized
```json
{
  "message": "Unauthorized: No token provided"
}
```

### 403 Forbidden
```json
{
  "message": "Invalid or expired token"
}
```
or
```json
{
  "message": "Access Denied: Admins only"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found"
}
```

### 400 Bad Request
```json
{
  "error": "Validation error message",
  "details": "Additional details"
}
```

---

## Currency Information

All price responses include currency information:
```json
{
  "price_per_night": {
    "amount": 2500.00,
    "currency": "ZAR",
    "formatted": "R 2500.00"
  }
}
```

---

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "details": "Additional details"
}
```

---

## Frontend Implementation Tips

1. **Store Token**: Save the token from signup/signin in localStorage or your state management
2. **Token Expiry**: Tokens expire after 1 hour. Use `refresh-token` endpoint to get a new token
3. **Error Handling**: Check for `401` or `403` responses and redirect to login
4. **Role-Based UI**: Use the `role` field from user object to show/hide admin features
5. **Date Format**: Use ISO 8601 format (YYYY-MM-DD) for dates
6. **Pagination**: Use `limit` and `offset` for paginated lists

---

## Quick Reference

| Endpoint | Method | Auth | Role |
|----------|--------|------|------|
| `/api/auth/signup` | POST | No | - |
| `/api/auth/signin` | POST | No | - |
| `/api/hotels` | GET | No | - |
| `/api/hotels/:id` | GET | No | - |
| `/api/hotels` | POST | Yes | Admin |
| `/api/rooms` | GET | No | - |
| `/api/rooms/:id` | GET | No | - |
| `/api/rooms` | POST | Yes | Admin |
| `/api/bookings` | POST | Yes | Customer |
| `/api/bookings/my-bookings` | GET | Yes | Customer |
| `/api/reviews` | POST | Yes | Customer |
| `/api/favourites` | POST | Yes | Customer |
| `/api/notifications` | GET | Yes | Customer |
| `/api/users/profile` | GET | Yes | Customer |

---

## Support

For questions or issues, contact the backend team or refer to:
- `POSTMAN_TESTING_GUIDE.md` - Detailed testing guide
- `CREATE_ADMIN_USER.md` - Admin user setup
- `POSTMAN_AUTHORIZATION_SETUP.md` - Authorization setup

