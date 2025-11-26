export type booking_status = 'pending' | 'confirmed' | 'cancelled' | 'completed';
export type payment_status = 'pending' | 'paid' | 'failed';

export interface Bookings {
    booking_id: number;
    user_id: number;
    hotel_id: number;
    room_id: number;
    check_in_date: Date;
    check_out_date: Date;
    number_of_guests: number;
    number_of_rooms: number;
    status: booking_status;
    total_price: number;
    payment_status: payment_status;
    created_at: Date;
    updated_at: Date;
}

export interface CreateBookingInput {
    hotel_id: number;
    room_id: number;
    check_in_date: string; // YYYY-MM-DD
    check_out_date: string; // YYYY-MM-DD
    number_of_guests?: number; // Optional, defaults to 1
    number_of_rooms?: number; // Optional, defaults to 1
}

export interface UpdateBookingStatusInput {
    status?: booking_status;
    payment_status?: payment_status;
}