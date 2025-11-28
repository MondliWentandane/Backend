"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = require("../config/database");
const router = express_1.default.Router();
router.get("/test-db", async (req, res) => {
    try {
        const result = await (0, database_1.testConnection)();
        if (result.success) {
            return res.json({
                message: "Database has successfully connected",
                time: result.data,
            });
        }
        else {
            return res.status(500).json({
                message: "Database connection failed",
                error: result.error,
                errorCode: result.code,
            });
        }
    }
    catch (error) {
        return res.status(500).json({
            message: "Database connection failed",
            error: error.message,
        });
    }
});
exports.default = router;
