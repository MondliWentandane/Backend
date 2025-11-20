import express from "express"
import pool from "../config/database"
;

const router = express.Router();

router.get("/test-db", async (req,res)=>{

    try {
        const result = await pool.query("SELECT NOW()");
        return res.json({
            message:"Database has successfully connected",
            time:result.rows[0],
        });
        
    } catch (error:any) {

        return res.status(500).json({
            message:"Database connection failed",
            error: error.message,
        });
        
    }
});

export default router;