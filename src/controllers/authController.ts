import { Request, Response } from "express";
import * as UserService from "../service/userService";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";


export const register = async (req: Request, res: Response) => {
  const { name, email, phone_number, role, password_hash } = req.body;

  if (!email || !password_hash || !name || !phone_number || !role) {
    return res.status(400).json({
      message: "Name, email, phone number, role, and password are required",
    });
  }

  if (!["admin", "customer"].includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }

  try {
    const existingUser = await UserService.findUserByEmail(email);

    if (existingUser) {
      return res.status(409).json({ message: "Email is already in use" });
    }


    const hashedPassword = await bcrypt.hash(password_hash, 10);

  
    const user = await UserService.createUsers({
      name,
      email,
      phone_number,
      role,
      passsword_hash: hashedPassword,
    });

    return res.status(201).json({
      message: "User registered successfully",
      userId: user.user_id,
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({ message: "Error registering the user" });
  }
};


export const login = async (req: Request, res: Response) => {
  const { email, password_hash } = req.body;

  if (!email || !password_hash) {
    return res
      .status(400)
      .json({ message: "Email and password are required" });
  }

  try {
    const user = await UserService.findUserByEmail(email);

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password_hash, user.passsword_hash);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid password" });
    }

    const payload = {
      userId: user.user_id,
      email: user.email,
      role: user.role,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: "1h",
    });

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        phone_number: user.phone_number,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Error logging in" });
  }
};


export const logout = async (req: Request, res: Response) => {
  try {
    return res.status(200).json({
      message: "Logged out successfully. Please remove the token on the client.",
    });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({ message: "Error logging out" });
  }
};
