import { Router } from "express";
import {
  addToFavourites,
  removeFromFavourites,
  removeFromFavouritesByHotel,
  getMyFavourites,
  checkFavourite,
  getFavouritesByUser,
} from "../controllers/favouriteController";
import { verifyAuth } from "../middleware/userMiddleware";

const router = Router();

// All routes require authentication
router.post("/", verifyAuth, addToFavourites); // POST /api/favourites - Add hotel to favourites
router.get("/my-favourites", verifyAuth, getMyFavourites); // GET /api/favourites/my-favourites - Get user's favourites
router.get("/check/:hotelId", verifyAuth, checkFavourite); // GET /api/favourites/check/:hotelId - Check if hotel is in favourites
router.get("/user/:userId", verifyAuth, getFavouritesByUser); // GET /api/favourites/user/:userId - Get favourites by user (admin or own)
router.delete("/:id", verifyAuth, removeFromFavourites); // DELETE /api/favourites/:id - Remove by favourite_id
router.delete("/hotel/:hotelId", verifyAuth, removeFromFavouritesByHotel); // DELETE /api/favourites/hotel/:hotelId - Remove by hotel_id

export default router;


