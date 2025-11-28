import { Router } from "express";
import { downloadReceipt, sendReceiptEmail } from "../controllers/receiptController";
import { verifyAuth } from "../middleware/userMiddleware";

const router = Router();

// Download receipt by booking ID
router.get("/booking/:bookingId", verifyAuth, downloadReceipt);

// Download receipt by payment ID
router.get("/payment/:paymentId", verifyAuth, downloadReceipt);

// Send receipt email by booking ID
router.post("/booking/:bookingId/send", verifyAuth, sendReceiptEmail);

// Send receipt email by payment ID
router.post("/payment/:paymentId/send", verifyAuth, sendReceiptEmail);

export default router;

