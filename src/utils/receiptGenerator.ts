import PDFDocument from "pdfkit";
import pool from "../config/database";

interface ReceiptData {
  booking_id: number;
  user_name: string;
  user_email: string;
  hotel_name: string;
  hotel_address: string;
  hotel_city: string;
  hotel_country: string;
  check_in_date: string;
  check_out_date: string;
  number_of_guests: number;
  number_of_rooms: number;
  room_type: string;
  total_price: number;
  payment_id: number;
  transaction_reference: string;
  payment_date: string;
  payment_gateway: string;
}

/**
 * Fetch complete booking and payment data for receipt
 */
export const getReceiptData = async (
  bookingId: number,
  paymentId?: number
): Promise<ReceiptData | null> => {
  try {
    let query = `
      SELECT 
        b.booking_id,
        b.check_in_date,
        b.check_out_date,
        b.number_of_guests,
        b.number_of_rooms,
        b.total_price,
        u.name as user_name,
        u.email as user_email,
        h.hotel_name,
        h.address as hotel_address,
        h.city as hotel_city,
        h.country as hotel_country,
        r.room_type,
        p.payment_id,
        p.transaction_reference,
        p.created_at as payment_date,
        p.payment_gateway
      FROM Bookings b
      INNER JOIN users u ON b.user_id = u.user_id
      INNER JOIN Hotels h ON b.hotel_id = h.hotel_id
      INNER JOIN Rooms r ON b.room_id = r.room_id
      INNER JOIN Payments p ON b.booking_id = p.booking_id
      WHERE b.booking_id = $1
    `;

    const params: any[] = [bookingId];

    if (paymentId) {
      query += ` AND p.payment_id = $2`;
      params.push(paymentId);
    } else {
      // Get the most recent successful payment
      query += ` AND p.status = 'paid' ORDER BY p.created_at DESC LIMIT 1`;
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    return {
      booking_id: row.booking_id,
      user_name: row.user_name,
      user_email: row.user_email,
      hotel_name: row.hotel_name,
      hotel_address: row.hotel_address,
      hotel_city: row.hotel_city,
      hotel_country: row.hotel_country,
      check_in_date: row.check_in_date,
      check_out_date: row.check_out_date,
      number_of_guests: row.number_of_guests,
      number_of_rooms: row.number_of_rooms,
      room_type: row.room_type,
      total_price: parseFloat(row.total_price),
      payment_id: row.payment_id,
      transaction_reference: row.transaction_reference,
      payment_date: row.payment_date,
      payment_gateway: row.payment_gateway || "PayPal",
    };
  } catch (error: any) {
    console.error("Error fetching receipt data:", error?.message || "Unknown error");
    return null;
  }
};

/**
 * Generate PDF receipt
 */
export const generateReceiptPDF = (data: ReceiptData): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: "A4" });
      const buffers: Buffer[] = [];

      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on("error", reject);

      // Header
      doc
        .fontSize(20)
        .fillColor("#4CAF50")
        .text("PAYMENT RECEIPT", { align: "center" })
        .moveDown();

      doc
        .fontSize(10)
        .fillColor("#666666")
        .text(`Receipt #${data.payment_id}`, { align: "center" })
        .moveDown(2);

      // Company/Hotel Info
      doc
        .fontSize(12)
        .fillColor("#000000")
        .text(data.hotel_name, { align: "left" })
        .fontSize(10)
        .fillColor("#666666")
        .text(data.hotel_address)
        .text(`${data.hotel_city}, ${data.hotel_country}`)
        .moveDown();

      // Receipt Date
      doc
        .fontSize(10)
        .fillColor("#000000")
        .text(`Date: ${new Date(data.payment_date).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}`, { align: "right" })
        .moveDown();

      // Customer Info
      doc
        .fontSize(12)
        .fillColor("#000000")
        .text("Bill To:", { underline: true })
        .fontSize(10)
        .fillColor("#666666")
        .text(data.user_name)
        .text(data.user_email)
        .moveDown();

      // Booking Details Section
      doc
        .fontSize(12)
        .fillColor("#000000")
        .text("Booking Details", { underline: true })
        .moveDown(0.5);

      doc
        .fontSize(10)
        .fillColor("#666666")
        .text(`Booking ID: ${data.booking_id}`)
        .text(`Check-in: ${new Date(data.check_in_date).toLocaleDateString()}`)
        .text(`Check-out: ${new Date(data.check_out_date).toLocaleDateString()}`)
        .text(`Room Type: ${data.room_type}`)
        .text(`Number of Rooms: ${data.number_of_rooms}`)
        .text(`Number of Guests: ${data.number_of_guests}`)
        .moveDown();

      // Payment Details Section
      doc
        .fontSize(12)
        .fillColor("#000000")
        .text("Payment Details", { underline: true })
        .moveDown(0.5);

      doc
        .fontSize(10)
        .fillColor("#666666")
        .text(`Transaction ID: ${data.transaction_reference}`)
        .text(`Payment Method: ${data.payment_gateway}`)
        .moveDown();

      // Total Amount
      doc
        .fontSize(16)
        .fillColor("#4CAF50")
        .text(`Total Amount: $${data.total_price.toFixed(2)}`, { align: "right" })
        .moveDown(2);

      // Footer
      doc
        .fontSize(8)
        .fillColor("#999999")
        .text("Thank you for your business!", { align: "center" })
        .text("This is an official receipt. Please keep it for your records.", { align: "center" })
        .moveDown()
        .text(`Generated on ${new Date().toLocaleString()}`, { align: "center" });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

