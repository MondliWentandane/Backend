export type room_status = 'available' | 'unavailable' | 'maintenance';

export interface Rooms{
    room_id: number
    hotel_id:number
    room_type:string
    price_per_night:number
    availability_status: room_status
    created_at:Date
    update_at:Date
}