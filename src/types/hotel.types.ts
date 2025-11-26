export interface Hotels {
    hotel_id: number;
    hotel_name: string;
    address: string;
    city: string;
    country: string;
    price_range: string;
    star_rating: number | null;
    amenities: string[];
    created_at: Date;
    updated_at: Date;
}

export interface CreateHotelInput {
    hotel_name: string;
    address: string;
    city: string;
    country: string;
    price_range: string;
    star_rating?: number | null;
    amenities?: string[];
}

export interface UpdateHotelInput {
    hotel_name?: string;
    address?: string;
    city?: string;
    country?: string;
    price_range?: string;
    star_rating?: number | null;
    amenities?: string[];
}