import {query} from '../config/database'
import bcrypt from 'bcryptjs'
import { user_role, Users } from '../types/users.types'

export const findUserByEmail = async (email:string): Promise<Users|null> =>{
    const {rows}=  await query('SELECT * FROM Users WHERE email = $1', [email]);
    return rows[0] || null;
}
interface CreateUserInput {
  name: string;
  email: string;
  phone_number: string;
  role: user_role;
  passsword_hash: string; 
}

export const createUsers = async ({name,email,phone_number,role, passsword_hash}:CreateUserInput): Promise<Users> =>{
const salt = await bcrypt.genSalt(10);
const passsword = await bcrypt.hash(passsword_hash, salt);

const {rows} = await query('INSERT INTO (name,email,phone_number,role, password) VALUES ($1, $2, $3,$4,$5, NOW(), NOW()) RETURNING name,email,phone_number,role, password', [name,email,phone_number,role, passsword]);
return rows[0] as Users;
}
