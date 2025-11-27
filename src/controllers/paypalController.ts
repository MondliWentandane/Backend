import axios from "axios";
import { Request, Response } from "express";
import { generateAccessToken } from "../service/paypalService";
import {
  getBookingAmount,
  insertPayment,
  updateBookingStatus,
} from "../config/database";

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
    const currencyCode = "USD";

    console.log("PayPal Request Payload:", {
      currency: currencyCode,
      value: totalAmountString,
      bookingId: bookingId.toString(),
    });

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
    console.error("PayPal Create Order Error:", error.response?.data || error);
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

      res.json({
        paypal_capture_data: captureResponse.data,
        database_record: paymentRecord,
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
    console.error("PayPal Capture Error:", error.response?.data || error);
    res.status(500).json({ error: "Failed to capture PayPal order" });
  }
};
