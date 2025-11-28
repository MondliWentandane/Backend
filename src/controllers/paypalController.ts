import axios from "axios";
import { Request, Response } from "express";
import { generateAccessToken } from "../service/paypalService";
import {
  getBookingAmount,
  insertPayment,
  updateBookingStatus,
} from "../config/database";
import pool from "../config/database";
import { validatePositiveInteger } from "../utils/validation";
import { notifyRefundReceived } from "../utils/notifications";
import { getReceiptData, generateReceiptPDF } from "../utils/receiptGenerator";
import { sendEmail, emailTemplates } from "../config/email";

const PAYPAL_API = "https://api-m.sandbox.paypal.com";

export const createOrder = async (req: Request, res: Response) => {
  try {
    const accessToken = await generateAccessToken();
    const { bookingId } = req.body;

    if (!bookingId) {
      return res
        .status(400)
        .json({ message: "Booking ID is required to create a payment order." });
    }

    const totalAmount = await getBookingAmount(bookingId);

    if (!totalAmount) {
      return res
        .status(400)
        .json({ message: "Booking not found or total amount is invalid." });
    }

    const totalAmountString = totalAmount.toFixed(2);
    const currencyCode = "USD"; // PayPal requires USD

    const response = await axios({
      url: `${PAYPAL_API}/v2/checkout/orders`,
      method: "post",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      data: {
        intent: "CAPTURE",
        purchase_units: [
          {
            custom_id: bookingId.toString(),
            amount: {
              currency_code: currencyCode,
              value: totalAmountString,
            },
          },
        ],
      },
    });

    res.json(response.data);
  } catch (error: any) {
    console.error("PayPal Create Order Error:", error.message || "Unknown error");
    res.status(500).json({ error: "Failed to create PayPal order" });
  }
};

export const captureOrder = async (req: Request, res: Response) => {
  try {
    const accessToken = await generateAccessToken();
    const orderId = req.params.orderId;

    const captureResponse = await axios.post(
      `${PAYPAL_API}/v2/checkout/orders/${orderId}/capture`,
      null, 
      {
        headers: {
       
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (captureResponse.data.status === "COMPLETED") {
      const purchaseUnit = captureResponse.data.purchase_units[0];
      const capture = purchaseUnit.payments.captures[0];
      const transactionId = capture.id;
      const amount = parseFloat(capture.amount.value);
      const bookingId = parseInt(purchaseUnit.custom_id);

      const paymentRecord = await insertPayment(
        bookingId,
        amount,
        transactionId,
        "paid"
      );

      await updateBookingStatus(bookingId, "confirmed");

      // Automatically send receipt email after successful payment
      if (paymentRecord) {
        try {
          const receiptData = await getReceiptData(bookingId);
          if (receiptData) {
            // Generate PDF
            const pdfBuffer = await generateReceiptPDF(receiptData);

            // Prepare email content
            const emailHtml = emailTemplates.receipt(receiptData, {
              transaction_reference: transactionId,
              amount: amount,
              created_at: new Date().toISOString(),
              payment_gateway: "PayPal",
            });

            // Send email with PDF attachment (non-blocking)
            sendEmail(
              receiptData.user_email,
              `Payment Receipt - Booking #${bookingId}`,
              emailHtml,
              [
                {
                  filename: `receipt-${bookingId}-${paymentRecord.payment_id}.pdf`,
                  content: pdfBuffer,
                  contentType: "application/pdf",
                },
              ]
            ).catch((emailError: any) => {
              console.warn("Failed to send receipt email:", emailError?.message || "Unknown error");
              // Don't fail the payment if email fails
            });
          }
        } catch (receiptError: any) {
          console.warn("Failed to generate/send receipt:", receiptError?.message || "Unknown error");
          // Don't fail the payment if receipt generation fails
        }
      }

      res.json({
        paypal_capture_data: captureResponse.data,
        database_record: paymentRecord,
        message: "Payment successful. Receipt has been sent to your email.",
      });
    } else {
      const bookingId = parseInt(
        captureResponse.data.purchase_units[0].custom_id
      );
      await insertPayment(
        bookingId,
        0,
        `Capture failed for order ${orderId}`,
        "failed"
      );
      res.status(400).json({ message: "Payment was not completed by PayPal" });
    }
  } catch (error: any) {
    console.error("PayPal Capture Error:", error.message || "Unknown error");
    res.status(500).json({ error: "Failed to capture PayPal order" });
  }
};

// GET PAYMENT BY BOOKING ID
export const getPaymentByBookingId = async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;
    const user = (req as any).user;

    // Validate bookingId
    const bookingIdValidation = validatePositiveInteger(bookingId, "Booking ID");
    if (!bookingIdValidation.valid) {
      return res.status(400).json({
        success: false,
        error: bookingIdValidation.error
      });
    }

    const parsedBookingId = bookingIdValidation.parsed!;

    // Get booking to check permissions
    const bookingQuery = "SELECT * FROM Bookings WHERE booking_id = $1";
    const bookingResult = await pool.query(bookingQuery, [parsedBookingId]);

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Booking not found"
      });
    }

    const booking = bookingResult.rows[0];

    // Check permissions (user can only view their own payments, admin can view any)
    if (user.role !== "admin" && booking.user_id !== user.user_id) {
      return res.status(403).json({
        success: false,
        error: "Access denied. You can only view payments for your own bookings."
      });
    }

    // Get payment
    const paymentQuery = `
      SELECT 
        p.payment_id,
        p.booking_id,
        p.amount,
        p.payment_gateway,
        p.transaction_reference,
        p.status,
        p.created_at,
        b.total_price,
        b.status as booking_status
      FROM Payments p
      INNER JOIN Bookings b ON p.booking_id = b.booking_id
      WHERE p.booking_id = $1
      ORDER BY p.created_at DESC
    `;

    const paymentResult = await pool.query(paymentQuery, [parsedBookingId]);

    res.json({
      success: true,
      data: paymentResult.rows,
      booking: {
        booking_id: booking.booking_id,
        status: booking.status,
        total_price: booking.total_price
      }
    });
  } catch (err: any) {
    console.error("Error fetching payment:", err?.message || "Unknown error");
    res.status(500).json({
      success: false,
      error: "Failed to fetch payment",
      details: err?.message || "Unknown error"
    });
  }
};

// GET ALL PAYMENTS FOR USER (Authenticated)
export const getMyPayments = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { limit, offset, status } = req.query;

    let query = `
      SELECT 
        p.payment_id,
        p.booking_id,
        p.amount,
        p.payment_gateway,
        p.transaction_reference,
        p.status,
        p.created_at,
        b.total_price,
        b.status as booking_status,
        h.hotel_name
      FROM Payments p
      INNER JOIN Bookings b ON p.booking_id = b.booking_id
      INNER JOIN Hotels h ON b.hotel_id = h.hotel_id
      WHERE b.user_id = $1
    `;

    const params: any[] = [user.user_id];
    let paramCount = 2;

    // Filter by status
    if (status) {
      query += ` AND p.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    query += ` ORDER BY p.created_at DESC`;

    // Add pagination
    const limitValue = limit ? parseInt(limit as string) : 20;
    const offsetValue = offset ? parseInt(offset as string) : 0;

    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limitValue, offsetValue);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) 
      FROM Payments p
      INNER JOIN Bookings b ON p.booking_id = b.booking_id
      WHERE b.user_id = $1
    `;
    const countParams: any[] = [user.user_id];
    if (status) {
      countQuery += ` AND p.status = $2`;
      countParams.push(status);
    }
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total,
        limit: limitValue,
        offset: offsetValue,
        hasMore: offsetValue + limitValue < total
      }
    });
  } catch (err: any) {
    console.error("Error fetching payments:", err?.message || "Unknown error");
    res.status(500).json({
      success: false,
      error: "Failed to fetch payments",
      details: err?.message || "Unknown error"
    });
  }
};

// GET PAYMENT BY TRANSACTION ID
export const getPaymentByTransactionId = async (req: Request, res: Response) => {
  try {
    const { transactionId } = req.params;
    const user = (req as any).user;

    if (!transactionId || typeof transactionId !== 'string') {
      return res.status(400).json({
        success: false,
        error: "Transaction ID is required"
      });
    }

    const query = `
      SELECT 
        p.payment_id,
        p.booking_id,
        p.amount,
        p.payment_gateway,
        p.transaction_reference,
        p.status,
        p.created_at,
        b.user_id,
        b.total_price,
        b.status as booking_status,
        h.hotel_name
      FROM Payments p
      INNER JOIN Bookings b ON p.booking_id = b.booking_id
      INNER JOIN Hotels h ON b.hotel_id = h.hotel_id
      WHERE p.transaction_reference = $1
    `;

    const result = await pool.query(query, [transactionId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Payment not found"
      });
    }

    const payment = result.rows[0];

    // Check permissions (user can only view their own payments, admin can view any)
    if (user.role !== "admin" && payment.user_id !== user.user_id) {
      return res.status(403).json({
        success: false,
        error: "Access denied. You can only view your own payments."
      });
    }

    res.json({
      success: true,
      data: payment
    });
  } catch (err: any) {
    console.error("Error fetching payment:", err?.message || "Unknown error");
    res.status(500).json({
      success: false,
      error: "Failed to fetch payment",
      details: err?.message || "Unknown error"
    });
  }
};

// REFUND PAYMENT (Admin only or user for their own booking)
export const refundPayment = async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;
    const user = (req as any).user;
    const { reason, amount } = req.body;

    // Validate paymentId
    const paymentIdValidation = validatePositiveInteger(paymentId, "Payment ID");
    if (!paymentIdValidation.valid) {
      return res.status(400).json({
        success: false,
        error: paymentIdValidation.error
      });
    }

    const parsedPaymentId = paymentIdValidation.parsed!;

    // Get payment with booking info
    const paymentQuery = `
      SELECT 
        p.*,
        b.user_id,
        b.booking_id,
        b.status as booking_status,
        b.total_price
      FROM Payments p
      INNER JOIN Bookings b ON p.booking_id = b.booking_id
      WHERE p.payment_id = $1
    `;

    const paymentResult = await pool.query(paymentQuery, [parsedPaymentId]);

    if (paymentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Payment not found"
      });
    }

    const payment = paymentResult.rows[0];

    // Check permissions
    if (user.role !== "admin" && payment.user_id !== user.user_id) {
      return res.status(403).json({
        success: false,
        error: "Access denied. You can only refund payments for your own bookings."
      });
    }

    // Check if payment can be refunded
    if (payment.status !== 'paid') {
      return res.status(400).json({
        success: false,
        error: `Payment cannot be refunded. Current status: ${payment.status}`
      });
    }

    // Validate refund amount (if partial refund)
    let refundAmount = parseFloat(amount || payment.amount);
    if (isNaN(refundAmount) || refundAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid refund amount. Must be a positive number."
      });
    }

    if (refundAmount > parseFloat(payment.amount)) {
      return res.status(400).json({
        success: false,
        error: "Refund amount cannot exceed payment amount"
      });
    }

    // Process refund through PayPal (if transaction_reference exists)
    let refundStatus = 'pending';
    let refundTransactionId = null;

    if (payment.payment_gateway === 'PayPal' && payment.transaction_reference) {
      try {
        const accessToken = await generateAccessToken();
        
        // Create refund request
        const refundResponse = await axios.post(
          `${PAYPAL_API}/v2/payments/captures/${payment.transaction_reference}/refund`,
          {
            amount: {
              currency_code: "USD",
              value: refundAmount.toFixed(2)
            },
            note_to_payer: reason || "Refund for booking cancellation"
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json"
            }
          }
        );

        if (refundResponse.data.status === 'COMPLETED') {
          refundStatus = 'paid';
          refundTransactionId = refundResponse.data.id;
        } else {
          refundStatus = 'failed';
        }
      } catch (paypalError: any) {
        console.error("PayPal refund error:", paypalError.message || "Unknown error");
        refundStatus = 'failed';
        // Continue with database record even if PayPal refund fails
      }
    }

    // Create refund payment record
    const refundPaymentQuery = `
      INSERT INTO Payments (booking_id, amount, payment_gateway, transaction_reference, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const refundPaymentResult = await pool.query(refundPaymentQuery, [
      payment.booking_id,
      -refundAmount, // Negative amount for refund
      payment.payment_gateway || 'PayPal',
      refundTransactionId || `REFUND-${payment.transaction_reference}-${Date.now()}`,
      refundStatus
    ]);

    // Update original payment status if full refund
    if (refundAmount >= parseFloat(payment.amount)) {
      await pool.query(
        `UPDATE Payments SET status = 'refunded' WHERE payment_id = $1`,
        [parsedPaymentId]
      );
    }

    // Update booking payment status if full refund
    if (refundAmount >= parseFloat(payment.amount)) {
      await pool.query(
        `UPDATE Bookings SET payment_status = 'refunded' WHERE booking_id = $1`,
        [payment.booking_id]
      );
    }

    // Create notification for refund
    try {
      await notifyRefundReceived(
        payment.user_id,
        payment.booking_id,
        refundAmount
      );
    } catch (notifError: any) {
      console.warn("Failed to create refund notification:", notifError?.message || "Unknown error");
    }

    res.json({
      success: true,
      message: refundStatus === 'paid' 
        ? "Refund processed successfully" 
        : "Refund request created (processing)",
      data: {
        refund: refundPaymentResult.rows[0],
        original_payment: payment,
        refund_amount: refundAmount
      }
    });
  } catch (err: any) {
    console.error("Error processing refund:", err?.message || "Unknown error");
    res.status(500).json({
      success: false,
      error: "Failed to process refund",
      details: err?.message || "Unknown error"
    });
  }
};
