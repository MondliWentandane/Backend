import express from "express"
import testRoute from "./routes/testRoutes"

const app = express();
app.use(express.json());
app.use("/api",testRoute);

export default app;