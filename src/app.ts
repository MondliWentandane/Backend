import express from "express"
import authRoutes from "./routes/authRoutes"
import hotelRoutes from "./routes/hotelRoutes"
import roomRoutes from "./routes/roomRoutes"
import bookingRoutes from "./routes/bookingRoutes"
import reviewRoutes from "./routes/reviewRoutes"
import favouriteRoutes from "./routes/favouriteRoutes"
import userRoutes from "./routes/userRoutes"
import notificationRoutes from "./routes/notificationRoutes"
import testRoutes from "./routes/testRoutes"

const app = express();
app.use(express.json());


app.use("/api/auth",authRoutes)
app.use("/api/hotels", hotelRoutes)
app.use("/api/rooms", roomRoutes)
app.use("/api/bookings", bookingRoutes)
app.use("/api/reviews", reviewRoutes)
app.use("/api/favourites", favouriteRoutes)
app.use("/api/users", userRoutes)
app.use("/api/notifications", notificationRoutes)
app.use("/api", testRoutes)


export default app;