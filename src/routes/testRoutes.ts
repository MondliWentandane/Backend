import { Router } from "express";
import { testConnection } from "../config/database";

const router = Router();

router.get("/test-db", async (req, res) => {
  try {
    const result = await testConnection();
    if (result.success) {
      return res.json({
        message: "Database has successfully connected",
        time: result.data,
      });
    } else {
      return res.status(500).json({
        message: "Database connection failed",
        error: result.error,
        errorCode: result.code,
      });
    }
  } catch (error: any) {
    return res.status(500).json({
      message: "Database connection failed",
      error: error.message,
    });
  }
});

export default router;



