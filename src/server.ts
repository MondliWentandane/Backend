import app from "./app";
import { verifyEmailConfig } from "./config/email";

// ALWAYS load dotenv (Railway injects env vars, but dotenv won't override them)
const dotenv = require("dotenv");
dotenv.config();

const PORT = process.env.PORT || 3000;

// Verify email configuration on startup
verifyEmailConfig().catch((error) => {
  console.error('Email configuration error:', error.message);
  // Email sending will be disabled but server will still run
});

// Log environment info
console.log('🔍 Environment Check:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', PORT);
console.log('CORS_ORIGINS:', process.env.CORS_ORIGINS || 'Not set');
console.log('SUPABASE_URL exists?', !!process.env.SUPABASE_URL);

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`Health endpoint: http://localhost:${PORT}/health`);
});