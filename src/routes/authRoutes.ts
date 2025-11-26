import { Router } from "express";
import { signUp,signIn,signInWithGoogle,forgotPassword,resetPassword,refreshToken } from "../controllers/authController";

const router = Router();

router.post("/signup",signUp);
router.post("/signin",signIn);
router.post("/signin/google",signInWithGoogle);
router.post("/forgot-password",forgotPassword);
router.post("/reset-password",resetPassword);
router.post("/refresh-token",refreshToken);


export default router;