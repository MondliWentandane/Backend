import {query} from '../config/database'
import bcrypt from 'bcryptjs'
import { Users } from '../types/users.types'

export const findUserByEmail = async (email:string): Promise<Users|null> =>{
    const {rows}=  await query('SELECT * FROM Users WHERE email = $1', [email]);
    return rows[0] || null;
}

export const createUsers = async (email:string, passsword_hash:string): Promise<Users> =>{
const salt = await bcrypt.genSalt(10);
const passsword = await bcrypt.hash(passsword_hash, salt);

const {rows} = await query('INSERT INTO (id, password) VALUES ($1, $2) RETURNING isd, password_hash', [email, passsword]);
return rows[0];
}
