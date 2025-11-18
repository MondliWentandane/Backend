export type user_role = 'admin' | 'customer';

export interface Users{
    user_id: number
    passsword_hash: string
    name:string
    email:string
    phone_number:string
    role:user_role
    created_at:Date
    updated_at: Date
}