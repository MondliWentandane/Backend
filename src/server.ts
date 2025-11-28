import app from "./app";
import { verifyEmailConfig } from "./config/email";

// Only load dotenv in development (Railway injects env vars automatically)
if (process.env.NODE_ENV !== "production") {
  const dotenv = require("dotenv");
  dotenv.config();
}

const PORT = process.env.PORT || 3000;

// Verify email configuration on startup
verifyEmailConfig().catch(() => {
  // Email verification failed, but continue server startup
  // Email sending will be disabled but server will still run
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});
