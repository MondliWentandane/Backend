export type booking_status = 'pending' | 'confirmed' | 'cancelled' | 'completed';
export type payment_status = 'pending' | 'paid' | 'failed';

export interface Bookings{
     booking_id: number
     user_id: number
     hotel_id: number
     check_in_date: Date
     check_out_date: Date
     status: booking_status
     total_price: number
     payment_status: payment_status
     created_at: Date
     updated_at: Date
}