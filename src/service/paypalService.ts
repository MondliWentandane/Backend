import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const CLIENT_ID = process.env.PAYPAL_CLIENT_ID as string;
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET as string;
const PAYPAL_API = "https://api-m.sandbox.paypal.com";


export const generateAccessToken = async (): Promise<string> => {
  const base64Token = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");

  const response = await axios({
    url: `${PAYPAL_API}/v1/oauth2/token`,
    method: "post",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${base64Token}`,
    },
    data: "grant_type=client_credentials",
  });

  return response.data.access_token;
};
