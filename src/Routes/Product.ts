import express from "express";
import { adminOnly } from "../Middlewares/Auth.js";

import { singleUpload } from "../Middlewares/Multer.js";
import {
  deleteProduct,
  getAdminProducts,
  getAllCategories,
  getAllProducts,
  getLatestProduct,
  getSingleProduct,
  newProduct,
  updateProduct,
} from "../Controllers/Product.js";

const app = express.Router();

//To Create New Product  - /api/v1/product/new
app.post("/new", singleUpload, newProduct);

//To get all Products with filters  - /api/v1/product/all
app.get("/all", getAllProducts);

//To get last 10 Products  - /api/v1/product/latest
app.get("/latest", getLatestProduct);

//To get all unique Categories  - /api/v1/product/categories
app.get("/categories", getAllCategories);

//To get all Products   - /api/v1/product/admin-products
app.get("/admin-products", getAdminProducts);

// To get, update, delete Product
app
  .route("/:id")
  .get(getSingleProduct)
  .put(singleUpload, updateProduct)
  .delete(deleteProduct);

export default app;
