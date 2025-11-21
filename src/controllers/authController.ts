
import {supabase } from "../config/supabase"
import { Response,Request } from "express"

//Email and password sign up 
export const signUp = async (req:Request,res:Response)=>{
  const {email,password,name, phone_number} = req.body;

  const{data,error} = await supabase.auth.signUp({
    email,password,
    options:{
      data:{name,phone_number},
    },
  });


  if (error) return res.status(400).json({error:error.message})
    res.json({message:"User signed up succesfully", user:data.user});
};


//email and password sign in
export const signIn = async (req:Request, res:Response)=>{

  const { email,password } = req.body;

  const {data,error} = await supabase.auth.signInWithPassword({
    email,password,
  });

  if(error) return res.status(400).json({error:error.message});

  res.json({
    message:"Sign in successful",
    access_token:data.session?.access_token,
    refresh_token:data.session?.refresh_token,
    user:data.user,
  });
}

// Google Oauth sign in/signup
export const signInWithGoogle = async(req:Request,res:Response)=>{

  const {redirectTo } = req.body; // optional redirect after login

  const {data,error} = await supabase.auth.signInWithOAuth({
    provider:"google",
    options:{redirectTo},
  });

  if(error) return res.status(400).json({error:error.message});

  res.json({
    message:"Google OAuth initiated",
    url:data.url
  });

};

//Forgotten password(send reset email)
export const forgottenPassword = async(req:Request,res:Response)=>{

  const{email, redirectTo} = req.body;

  const{data,error} =await supabase.auth.resetPasswordForEmail(email,{
    redirectTo,//  Frontend reset page
  });

  if(error) res.status(400).json({error:error.message})
    res.json({message:"Password reset email was sent",data});
};

// Reset password from email link 
export const resetPassword = async(req:Request, res:Response)=>{

  const { access_token, new_password } = req.body;

  const { data, error } = await supabase.auth.updateUser(
    { password: new_password },
    { accessToken: access_token } as any
  );

  if (error) return res.status(400).json({ error: error.message });

  res.json({ message: "Password updated successfully", user: data.user });
}