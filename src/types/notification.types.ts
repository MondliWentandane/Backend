export type notification_type = 
    | 'booking_confirmation'
    | 'booking_update'
    | 'booking_cancelled'
    | 'payment_received'
    | 'payment_failed'
    | 'promotion'
    | 'review_request'
    | 'system';

export interface Notifications {
    notification_id: number;
    user_id: number;
    type: notification_type;
    title: string;
    message: string;
    is_read: boolean;
    related_booking_id: number | null;
    created_at: Date;
}

export interface CreateNotificationInput {
    user_id: number;
    type: notification_type;
    title: string;
    message: string;
    related_booking_id?: number;
}



