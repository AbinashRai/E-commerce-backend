import { User } from "../Models/User.js";
import ErrorHandler from "../Utils/Utility-class.js";
import { TryCatch } from "./Error.js";

// Middleware to make sure only admin is allowed
export const adminOnly = TryCatch(async (req, res, next) => {
  const { id } = req.query;

  if (!id) return next(new ErrorHandler("You need to login first", 401));

  const user = await User.findById(id);
  if (!user) return next(new ErrorHandler("The user ID doesn't match", 401));
  if (user.role !== "admin")
    return next(new ErrorHandler("You don't have an admin role", 403));

  next();
});
