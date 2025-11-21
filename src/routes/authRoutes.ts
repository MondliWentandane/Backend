import { Router } from "express";
import { signUp,signIn,signInWithGoogle,forgottenPassword,resetPassword } from "../controllers/authController";

const router = Router();

router.post("/signup",signUp);
router.post("/signin",signIn);
router.post("/signin/google",signInWithGoogle);
router.post("/forgot-password",forgottenPassword);
router.post("/reset-password",resetPassword);


export default router;