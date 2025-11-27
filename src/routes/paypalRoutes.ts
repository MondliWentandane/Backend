import { Router } from "express";
import { createOrder, captureOrder } from "../controllers/paypalController";

const router = Router();

// Create PayPal order
router.post("/create-order", createOrder);

// Capture PayPal order and record payment in the database
router.post("/capture-order/:orderId", captureOrder);

export default router;
