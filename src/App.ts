import express, { Request, Response, NextFunction } from "express";
import { config } from "dotenv";
import mongoose from "mongoose";
import Stripe from "stripe";
import cors from "cors";
import morgan from "morgan";

// importing routes
import userRoute from "./Routes/User.js";
import productRoute from "./Routes/Product.js";
import orderRoute from "./Routes/Order.js";
// import paymentRoute from "./Routes/Payment.js";
import dashboardRoute from "./Routes/Stats.js";
import ErrorHandler from "./Utils/Utility-class.js";

config({
  path: "./.env",
});

const port = 4000;

const stripeKey =
  "sk_test_51OnvUKSADt4BmFLUxn9LRZPNqz6G3r1pMjo79RdGtkgvH0u0Gimn5pbvlWSnDyviHx2ENJspQI24FCWuMdxlburj00bkaBVCo8" ||
  "";

mongoose
  .connect("mongodb://localhost:27017/ecommerce")
  .then((c) => console.log(`DB connected to ${c.connection.host}`))
  .catch((e) => console.log(e));

export const stripe = new Stripe(stripeKey);

const app = express();

app.use(express.json());
app.use(morgan("dev"));
app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

app.get("/", (req, res) => {
  res.send("API working with /api/v1");
});

// using routes
app.use("/api/v1/user", userRoute);
app.use("/api/v1/product", productRoute);
app.use("/api/v1/order", orderRoute);
// app.use("/api/v1/payment", paymentRoute);
app.use("/api/v1/dashboard", dashboardRoute);

interface PaymentIntentRequestBody {
  amount: number;
  description: string;
}

const createPaymentIntent = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Ensure req.body is not null
    if (!req.body) {
      throw new Error("Request body is missing");
    }

    // Check if req.body has the expected structure
    const { amount, description }: PaymentIntentRequestBody = req.body;
    if (!amount) {
      throw new Error("Please enter amount");
    }

    if (!description) {
      throw new Error("Description is required for the transaction");
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Number(amount) * 100,
      currency: "inr",
    });

    // console.log("Payment Intent Created:", paymentIntent);
    res.status(201).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    next(error);
  }
};

app.post("/api/v1/payment/create", createPaymentIntent);

app.use("/uploads", express.static("Uploads"));

app.listen(port, () => {
  console.log(`Express is running on Http://localhost:${port}`);
});
