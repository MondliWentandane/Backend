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

// CORS configuration - supports multiple frontend origins
const allowedOrigins = [
  process.env.CUSTOMER_FRONTEND_URL,
  process.env.ADMIN_FRONTEND_URL,
  // Fallback to localhost for development
  'http://localhost:5173',
].filter(Boolean); // Remove any undefined values

app.use(cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // In development, allow all origins
      if (process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' })); // Limit JSON payload size
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Support URL-encoded bodies

// Serve static files from public directory
app.use(express.static("public"));

// Health check endpoint
app.get("/health", (req: express.Request, res: express.Response) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use("/api/auth", authRoutes)
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

// 404 handler
app.use((req: express.Request, res: express.Response) => {
  res.status(404).json({ message: 'Route not found' });
});

export default app;