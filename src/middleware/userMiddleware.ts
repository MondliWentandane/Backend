import { Request,Response, NextFunction } from "express";
import jwt from 'jsonwebtoken'
import { findUserByEmail } from "../service/userService";
import { Users } from "../types/users.types";

interface JwtPayload{
    userId: number,
    email:string
}

export const protect = async( req:Request, res:Response, next:NextFunction) =>{
    let token;
    if(req.headers.authorization && req.headers.authorization.startsWith('Bearer')){
        try {
            console.log(req.headers, 'rquest headers')
            console.log(req.headers.authorization, 'token')
            token = req.headers.authorization.split(' ')[1]
            const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload
            console.log(decoded, 'decoded token')

            const user: Users | null = await findUserByEmail(decoded.email)
            req.user = user || undefined

            if(!req.user){
                return res.status(401).json({message: 'Not authorized, User is not found'});
                
            }return next()

        }  catch (error) {
            res.status(401).json({message:'Not authorized, token failed'});

        }
    }else{
        return res.status(401).json({message:'Not authorized, no token'})
    }
  return res.status(401).json({message: 'Not authorized'});
}