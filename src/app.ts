import express from "express"
import cors from "cors"
import helmet from "helmet"
import authRoutes from "./routes/authRoutes"
import hotelRoutes from "./routes/hotelRoutes"
import roomRoutes from "./routes/roomRoutes"
import bookingRoutes from "./routes/bookingRoutes"
import reviewRoutes from "./routes/reviewRoutes"
import favouriteRoutes from "./routes/favouriteRoutes"
import userRoutes from "./routes/userRoutes"
import notificationRoutes from "./routes/notificationRoutes"
import paypalRoutes from "./routes/paypalRoutes"
import receiptRoutes from "./routes/receiptRoutes"
import adminRoutes from "./routes/adminRoutes"
import testRoutes from "./routes/testRoutes"

const app = express();

// Security middleware
app.use(helmet()); // Set various HTTP headers for security

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || "*", // Allow requests from frontend URL or all origins in development
  credentials: true, // Allow cookies/credentials
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' })); // Limit JSON payload size
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Support URL-encoded bodies

// Serve static files from public directory
app.use(express.static("public"));


app.use("/api/auth",authRoutes)
app.use("/api/hotels", hotelRoutes)
app.use("/api/rooms", roomRoutes)
app.use("/api/bookings", bookingRoutes)
app.use("/api/reviews", reviewRoutes)
app.use("/api/favourites", favouriteRoutes)
app.use("/api/users", userRoutes)
app.use("/api/notifications", notificationRoutes)
app.use("/api/payments", paypalRoutes)
app.use("/api/receipts", receiptRoutes)
app.use("/api/admin", adminRoutes)
app.use("/api", testRoutes)


export default app;