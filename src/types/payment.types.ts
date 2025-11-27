export type payment_status = 'pending' | 'paid' | 'failed';
export interface Payments{
    payment_id:number
    booking_id:number
    amount:number
    payment_gateway:string
    transaction_reference:string
    status:payment_status
    created_at:Date
}