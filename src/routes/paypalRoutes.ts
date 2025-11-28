import { Router } from "express";
import { 
  createOrder, 
  captureOrder, 
  getPaymentByBookingId,
  getMyPayments,
  getPaymentByTransactionId,
  refundPayment
} from "../controllers/paypalController";
import { verifyAuth, requireAdmin } from "../middleware/userMiddleware";

const router = Router();

// Payment creation and capture (public endpoints for PayPal webhooks)
router.post("/create-order", createOrder);
router.post("/capture-order/:orderId", captureOrder);

// Payment history and retrieval (authenticated)
router.get("/booking/:bookingId", verifyAuth, getPaymentByBookingId); // GET /api/payments/booking/:bookingId
router.get("/my-payments", verifyAuth, getMyPayments); // GET /api/payments/my-payments
router.get("/transaction/:transactionId", verifyAuth, getPaymentByTransactionId); // GET /api/payments/transaction/:transactionId

// Refund (authenticated - user can refund own, admin can refund any)
router.post("/:paymentId/refund", verifyAuth, refundPayment); // POST /api/payments/:paymentId/refund

export default router;
