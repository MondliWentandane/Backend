CREATE TYPE user_role AS ENUM ('admin', 'customer');

CREATE TABLE Users (
    user_id SERIAL PRIMARY KEY,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    role user_role NOT NULL DEFAULT 'customer',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE Hotels (
    hotel_id SERIAL PRIMARY KEY,
    hotel_name VARCHAR(255) NOT NULL,
    address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL,
    price_range VARCHAR(100) NOT NULL,
    star_rating SMALLINT  CHECK(star_rating IS NULL OR star_rating BETWEEN 1 AND 5),
    amenities TEXT[] DEFAULT '{}'::text[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TYPE room_status AS ENUM ('available', 'unavailable', 'maintenance');

CREATE TABLE Rooms (
    room_id SERIAL PRIMARY KEY,
    hotel_id INT REFERENCES Hotels(hotel_id) ON DELETE CASCADE ON UPDATE CASCADE,
    room_type VARCHAR(100) NOT NULL,
    price_per_night NUMERIC(10,2) NOT NULL,
    availability_status room_status NOT NULL DEFAULT 'available',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed');

CREATE TABLE Bookings (
    booking_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES Users(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
    hotel_id INT REFERENCES Hotels(hotel_id) ON DELETE CASCADE ON UPDATE CASCADE,
    room_id INT REFERENCES Rooms(room_id) ON DELETE CASCADE ON UPDATE CASCADE,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    status booking_status NOT NULL DEFAULT 'pending',
    total_price NUMERIC(10,2) NOT NULL,
    payment_status payment_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE Reviews (
    review_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES Users(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
    hotel_id INT REFERENCES Hotels(hotel_id) ON DELETE CASCADE ON UPDATE CASCADE,
    rating SMALLINT CHECK(rating IS NULL OR rating BETWEEN 1 AND 5),
    comment VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE Payments (
    payment_id SERIAL PRIMARY KEY,
    booking_id INT REFERENCES Bookings(booking_id) ON DELETE CASCADE ON UPDATE CASCADE,
    amount NUMERIC(10,2) NOT NULL,
    payment_gateway VARCHAR(100),
    transaction_reference VARCHAR(255),
    status payment_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE HotelPhotos (
    photo_id SERIAL PRIMARY KEY,
    hotel_id INT REFERENCES Hotels(hotel_id) ON DELETE CASCADE ON UPDATE CASCADE,
    photo_url TEXT NOT NULL
);


CREATE TABLE RoomPhotos (
    photo_id SERIAL PRIMARY KEY,
    room_id INT REFERENCES Rooms(room_id) ON DELETE CASCADE ON UPDATE CASCADE,
    photo_url TEXT NOT NULL
);

CREATE TABLE Favourites (
    favourite_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES Users(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
    hotel_id INT REFERENCES Hotels(hotel_id) ON DELETE CASCADE ON UPDATE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, hotel_id)
);

