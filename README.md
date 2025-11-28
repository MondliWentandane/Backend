# Hotel Booking Backend API

Node.js/Express backend for a multi-branch hotel booking system with role-based access control.

## Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL database (Supabase recommended)
- Supabase account for authentication

### Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Configure your .env file with:
# - Database connection (Supabase)
# - Supabase credentials
# - PayPal credentials (optional)
# - Email/SMTP settings (optional)
```

### Run Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start

# Server runs on http://localhost:3000
```

## Environment Variables

```env
# Database (Supabase)
PGHOST=your-supabase-host
PGPORT=5432
PGDATABASE=postgres
PGUSER=postgres.your-project
PGPASSWORD=your-password
PGSSLMODE=require

# Supabase Auth
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret

# App
PORT=3000

# PayPal (optional)
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-secret

# Email/SMTP (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

## Authentication

All protected endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <supabase-jwt-token>
```

Get token from Supabase auth after login/signup.

## User Roles

- **customer** - Regular users, can book hotels
- **branch_admin** - Manages assigned hotel(s) only
- **super_admin** - Full system access, manages all hotels and admins
- **admin** - Legacy role, full access (deprecated)

## API Endpoints

### Authentication
```
POST   /api/auth/signup          - Register new user
POST   /api/auth/signin          - Login user
GET    /api/auth/me              - Get current user info
```

### Hotels
```
GET    /api/hotels               - List all hotels (public)
GET    /api/hotels/:id           - Get hotel details (public)
POST   /api/hotels               - Create hotel (super_admin only)
PUT    /api/hotels/:id           - Update hotel (admin with access)
DELETE /api/hotels/:id           - Delete hotel (super_admin only)
POST   /api/hotels/:id/photos    - Add hotel photo (admin with access)
DELETE /api/hotels/:id/photos/:photoId - Delete photo (admin with access)
```

### Rooms
```
GET    /api/rooms                - List rooms (public, filtered by hotel)
GET    /api/rooms/:id            - Get room details (public)
POST   /api/rooms                - Create room (admin with access)
PUT    /api/rooms/:id            - Update room (admin with access)
DELETE /api/rooms/:id            - Delete room (admin with access)
PATCH  /api/rooms/:id/availability - Update availability (admin with access)
POST   /api/rooms/:id/photos     - Add room photo (admin with access)
DELETE /api/rooms/:id/photos/:photoId - Delete photo (admin with access)
```

### Bookings
```
GET    /api/bookings             - List all bookings (admin)
GET    /api/bookings/my-bookings - Get my bookings (customer)
GET    /api/bookings/hotel/:hotelId - Get bookings by hotel (admin with access)
GET    /api/bookings/:id         - Get booking details
POST   /api/bookings             - Create booking (customer)
PATCH  /api/bookings/:id/modify  - Modify booking (customer/admin)
DELETE /api/bookings/:id         - Cancel booking (customer/admin)
```

### Reviews
```
GET    /api/reviews              - List reviews (public)
GET    /api/reviews/hotel/:hotelId - Get hotel reviews (public)
GET    /api/reviews/:id          - Get review details (public)
POST   /api/reviews              - Create review (customer)
PUT    /api/reviews/:id          - Update review (customer - own only)
DELETE /api/reviews/:id          - Delete review (customer - own only)
```

### Favorites
```
GET    /api/favourites           - Get my favorites (customer)
POST   /api/favourites           - Add to favorites (customer)
DELETE /api/favourites/:hotelId - Remove from favorites (customer)
```

### User Profile
```
GET    /api/users/profile        - Get my profile (authenticated)
PUT    /api/users/profile        - Update my profile (authenticated)
```

### Notifications
```
GET    /api/notifications        - Get my notifications (authenticated)
GET    /api/notifications/:id    - Get notification details (authenticated)
PATCH  /api/notifications/:id/read - Mark as read (authenticated)
```

### Payments (PayPal)
```
POST   /api/payments/create      - Create PayPal order (customer)
POST   /api/payments/capture      - Capture payment (customer)
POST   /api/payments/refund      - Refund payment (admin)
GET    /api/payments/booking/:bookingId - Get payment by booking (authenticated)
```

### Receipts
```
GET    /api/receipts/booking/:bookingId - Download receipt PDF (authenticated)
GET    /api/receipts/payment/:paymentId - Download receipt PDF (authenticated)
POST   /api/receipts/booking/:bookingId/send - Email receipt (authenticated)
POST   /api/receipts/payment/:paymentId/send - Email receipt (authenticated)
```

### Admin Management (Super Admin Only)
```
GET    /api/admin/users          - List all admins
GET    /api/admin/users/:userId  - Get admin details
POST   /api/admin/users          - Create branch admin
POST   /api/admin/users/:userId/hotels/:hotelId - Assign hotel to admin
DELETE /api/admin/users/:userId/hotels/:hotelId - Remove hotel assignment
```

## Query Parameters

### Pagination
```
?limit=20&offset=0
```

### Filtering (Hotels)
```
?city=New York
?country=USA
?minRating=4
?maxRating=5
?search=hotel name
```

### Filtering (Rooms)
```
?hotel_id=1
?status=available
?minPrice=50
?maxPrice=200
?roomType=Deluxe
```

### Filtering (Bookings)
```
?user_id=1
?hotel_id=1
?status=confirmed
?payment_status=paid
```

## Response Format

### Success
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

### Error
```json
{
  "success": false,
  "error": "Error message",
  "details": "Additional details (development only)"
}
```

## Example Requests

### Create Booking
```bash
POST /api/bookings
Authorization: Bearer <token>
Content-Type: application/json

{
  "hotel_id": 1,
  "room_id": 1,
  "check_in_date": "2025-12-24",
  "check_out_date": "2025-12-30",
  "number_of_guests": 2,
  "number_of_rooms": 1
}
```

### Create Branch Admin (Super Admin)
```bash
POST /api/admin/users
Authorization: Bearer <super-admin-token>
Content-Type: application/json

{
  "email": "admin@hotel.com",
  "name": "John Doe",
  "phone_number": "+1234567890",
  "hotel_id": 1
}
```

## Database Migrations

Run migrations in Supabase SQL editor:

1. `src/migrations/add_refunded_to_payment_status.sql`
2. Any other migration files in `src/migrations/`

## Testing

```bash
# Test database connection
npm run test-db

# Test API endpoints
npm test
```

## Project Structure

```
src/
├── config/          # Database, Supabase, email config
├── controllers/     # Request handlers
├── middleware/      # Auth, validation middleware
├── routes/          # API route definitions
├── types/           # TypeScript type definitions
├── utils/           # Helper functions (validation, currency, etc.)
└── migrations/      # Database migration scripts
```

## Notes

- Branch admins only see/manage their assigned hotels
- Super admins have full access to all hotels
- All prices are in USD
- File uploads stored in `public/uploads/`
- Receipts generated as PDF and can be emailed

## Support

For detailed API documentation, see `FRONTEND_API_DOCUMENTATION.md`
