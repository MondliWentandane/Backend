import { Request,Response } from "express";
import * as UserService from '../service/userService'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

export const register = async(req:Request, res:Response) =>{
    const {email,password_hash} = req.body
    if(!email || !password_hash){
       return res.status(400).json({message: 'Email and password are required'})
    }
    try{
        const existingUser = await UserService.findUserByEmail(email)
        if(existingUser){
            return res.status(409).json({message: 'Email is already in use'})
        }
        const user = await UserService.createUsers(email, password_hash)
        res.status(201).json({message: 'User registered successfully', userId:user.user_id})
    }catch(error){
        res.status(500).json({message: 'Error registering the user'})
    }
};

export const login = async (req:Request, res:Response) =>{
    const {email, password_hash} = req.body;
    if(!email || !password_hash){
        return res.status(400).json({message:'Email and password are required'})
        
    }
    try {
        const Users = await UserService.findUserByEmail(email);
        if(!Users){
            return res.status(409).json({message: 'Invalid credetintials'});
        }
        const isMatch = await bcrypt.compare(password_hash, Users.passsword_hash);
        if(!isMatch){
            return res.status(401).json({message:'Invalid password'});
        }
        const payload = {userId: Users.user_id, email: Users.email};
        const token = jwt.sign(payload, process.env.JWT_SECRET!,{
            expiresIn:'1h',
        });
        res.status(200).json({message:'Login successfully', token});
    } catch (error) {
        res.status(500).json({message: 'Error logging in'});
    }
}