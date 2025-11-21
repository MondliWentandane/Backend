import express from "express"
import testRoute from "./routes/testRoutes"
import authRoutes from "./routes/authRoutes"

const app = express();
app.use(express.json());


app.use("/api/auth",authRoutes)
app.use("/api",testRoute);

export default app;