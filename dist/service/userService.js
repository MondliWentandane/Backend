"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUsers = exports.findUserByEmail = void 0;
const database_1 = require("../config/database");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const findUserByEmail = async (email) => {
    const { rows } = await (0, database_1.query)('SELECT * FROM Users WHERE email = $1', [email]);
    return rows[0] || null;
};
exports.findUserByEmail = findUserByEmail;
const createUsers = async ({ name, email, phone_number, role, passsword_hash }) => {
    const salt = await bcryptjs_1.default.genSalt(10);
    const passsword = await bcryptjs_1.default.hash(passsword_hash, salt);
    const { rows } = await (0, database_1.query)('INSERT INTO (name,email,phone_number,role, password) VALUES ($1, $2, $3,$4,$5, NOW(), NOW()) RETURNING name,email,phone_number,role, password', [name, email, phone_number, role, passsword]);
    return rows[0];
};
exports.createUsers = createUsers;
