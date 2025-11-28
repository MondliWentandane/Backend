import { Request, Response } from "express";
import { getReceiptData, generateReceiptPDF } from "../utils/receiptGenerator";
import { sendEmail, emailTemplates } from "../config/email";
import { validatePositiveInteger } from "../utils/validation";
import pool from "../config/database";

/**
 * Download receipt as PDF
 * GET /api/receipts/booking/:bookingId
 * GET /api/receipts/payment/:paymentId
 */
export const downloadReceipt = async (req: Request, res: Response) => {
  try {
    const { bookingId, paymentId } = req.params;
    const user = (req as any).user;

    let receiptData: any = null;

    if (bookingId) {
      // Validate booking ID
      const bookingIdValidation = validatePositiveInteger(bookingId, "Booking ID");
      if (!bookingIdValidation.valid) {
        return res.status(400).json({
          success: false,
          error: bookingIdValidation.error,
        });
      }

      // Get booking to check permissions
      const bookingQuery = "SELECT user_id FROM Bookings WHERE booking_id = $1";
      const bookingResult = await pool.query(bookingQuery, [bookingIdValidation.parsed!]);

      if (bookingResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Booking not found",
        });
      }

      // Check permissions (user can only view their own receipts, admin can view any)
      if (user.role !== "admin" && bookingResult.rows[0].user_id !== user.user_id) {
        return res.status(403).json({
          success: false,
          error: "Access denied. You can only view receipts for your own bookings.",
        });
      }

      receiptData = await getReceiptData(bookingIdValidation.parsed!);
    } else if (paymentId) {
      // Validate payment ID
      const paymentIdValidation = validatePositiveInteger(paymentId, "Payment ID");
      if (!paymentIdValidation.valid) {
        return res.status(400).json({
          success: false,
          error: paymentIdValidation.error,
        });
      }

      // Get payment with booking info to check permissions
      const paymentQuery = `
        SELECT b.user_id, b.booking_id
        FROM Payments p
        INNER JOIN Bookings b ON p.booking_id = b.booking_id
        WHERE p.payment_id = $1
      `;
      const paymentResult = await pool.query(paymentQuery, [paymentIdValidation.parsed!]);

      if (paymentResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Payment not found",
        });
      }

      // Check permissions
      if (user.role !== "admin" && paymentResult.rows[0].user_id !== user.user_id) {
        return res.status(403).json({
          success: false,
          error: "Access denied. You can only view receipts for your own payments.",
        });
      }

      receiptData = await getReceiptData(
        paymentResult.rows[0].booking_id,
        paymentIdValidation.parsed!
      );
    } else {
      return res.status(400).json({
        success: false,
        error: "Either bookingId or paymentId is required",
      });
    }

    if (!receiptData) {
      return res.status(404).json({
        success: false,
        error: "Receipt data not found. Payment may not be completed.",
      });
    }

    // Generate PDF
    const pdfBuffer = await generateReceiptPDF(receiptData);

    // Set response headers for PDF download
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="receipt-${receiptData.booking_id}-${receiptData.payment_id}.pdf"`
    );
    res.setHeader("Content-Length", pdfBuffer.length);

    res.send(pdfBuffer);
  } catch (err: any) {
    console.error("Error generating receipt:", err?.message || "Unknown error");
    res.status(500).json({
      success: false,
      error: "Failed to generate receipt",
      details: err.message,
    });
  }
};

/**
 * Send receipt via email
 * POST /api/receipts/booking/:bookingId/send
 * POST /api/receipts/payment/:paymentId/send
 */
export const sendReceiptEmail = async (req: Request, res: Response) => {
  try {
    const { bookingId, paymentId } = req.params;
    const user = (req as any).user;

    let receiptData: any = null;
    let bookingIdForCheck: number;

    if (bookingId) {
      const bookingIdValidation = validatePositiveInteger(bookingId, "Booking ID");
      if (!bookingIdValidation.valid) {
        return res.status(400).json({
          success: false,
          error: bookingIdValidation.error,
        });
      }

      const bookingQuery = "SELECT user_id FROM Bookings WHERE booking_id = $1";
      const bookingResult = await pool.query(bookingQuery, [bookingIdValidation.parsed!]);

      if (bookingResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Booking not found",
        });
      }

      if (user.role !== "admin" && bookingResult.rows[0].user_id !== user.user_id) {
        return res.status(403).json({
          success: false,
          error: "Access denied. You can only send receipts for your own bookings.",
        });
      }

      bookingIdForCheck = bookingIdValidation.parsed!;
      receiptData = await getReceiptData(bookingIdForCheck);
    } else if (paymentId) {
      const paymentIdValidation = validatePositiveInteger(paymentId, "Payment ID");
      if (!paymentIdValidation.valid) {
        return res.status(400).json({
          success: false,
          error: paymentIdValidation.error,
        });
      }

      const paymentQuery = `
        SELECT b.user_id, b.booking_id
        FROM Payments p
        INNER JOIN Bookings b ON p.booking_id = b.booking_id
        WHERE p.payment_id = $1
      `;
      const paymentResult = await pool.query(paymentQuery, [paymentIdValidation.parsed!]);

      if (paymentResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Payment not found",
        });
      }

      if (user.role !== "admin" && paymentResult.rows[0].user_id !== user.user_id) {
        return res.status(403).json({
          success: false,
          error: "Access denied. You can only send receipts for your own payments.",
        });
      }

      bookingIdForCheck = paymentResult.rows[0].booking_id;
      receiptData = await getReceiptData(bookingIdForCheck, paymentIdValidation.parsed!);
    } else {
      return res.status(400).json({
        success: false,
        error: "Either bookingId or paymentId is required",
      });
    }

    if (!receiptData) {
      return res.status(404).json({
        success: false,
        error: "Receipt data not found. Payment may not be completed.",
      });
    }

    // Generate PDF
    const pdfBuffer = await generateReceiptPDF(receiptData);

    // Prepare email content
    const emailHtml = emailTemplates.receipt(receiptData, {
      transaction_reference: receiptData.transaction_reference,
      amount: receiptData.total_price,
      created_at: receiptData.payment_date,
      payment_gateway: receiptData.payment_gateway,
    });

    // Send email with PDF attachment
    const emailSent = await sendEmail(
      receiptData.user_email,
      `Payment Receipt - Booking #${receiptData.booking_id}`,
      emailHtml,
      [
        {
          filename: `receipt-${receiptData.booking_id}-${receiptData.payment_id}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ]
    );

    if (!emailSent) {
      return res.status(500).json({
        success: false,
        error: "Failed to send email. Please check email configuration.",
      });
    }

    res.json({
      success: true,
      message: "Receipt sent successfully to your email",
      email: receiptData.user_email,
    });
  } catch (err: any) {
    console.error("Error sending receipt email:", err?.message || "Unknown error");
    res.status(500).json({
      success: false,
      error: "Failed to send receipt email",
      details: err.message,
    });
  }
};

