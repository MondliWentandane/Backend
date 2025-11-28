import app from "./app";
import dotenv from "dotenv";
import { verifyEmailConfig } from "./config/email";

dotenv.config(); 

const PORT = process.env.PORT || 3000; // fallback to 3000

// Verify email configuration on startup
verifyEmailConfig().catch(() => {
  // Email verification failed, but continue server startup
  // Email sending will be disabled but server will still run
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
