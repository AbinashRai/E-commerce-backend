import { Request } from "express";
import { TryCatch } from "../Middlewares/Error.js";
import { NewOrderRequestBody } from "../Types/types.js";
import { Order } from "../Models/Order.js";
import { reduceStock } from "../Utils/Features.js";
import ErrorHandler from "../Utils/Utility-class.js";

export const myOrders = TryCatch(async (req, res, next) => {
  const { id: user } = req.query;

  const key = `my-orders-${user}`;

  let orders = [];

  orders = await Order.find({ user });

  return res.status(200).json({
    success: true,
    orders,
  });
});

export const allOrders = TryCatch(async (req, res, next) => {
  const key = `all-orders`;

  let orders = [];

  orders = await Order.find().populate("user", "name");

  return res.status(200).json({
    success: true,
    orders,
  });
});

export const getSingleOrder = TryCatch(async (req, res, next) => {
  const { id } = req.params;
  const key = `order-${id}`;

  let order;

  order = await Order.findById(id).populate("user", "name");

  if (!order) return next(new ErrorHandler("Order Not Found", 404));

  return res.status(200).json({
    success: true,
    order,
  });
});

export const newOrder = TryCatch(
  async (req: Request<{}, {}, NewOrderRequestBody>, res, next) => {
    const {
      shippingInfo,
      orderItems,
      user,
      subtotal,
      tax,
      shippingCharges,
      discount,
      total,
    } = req.body;

    console.log(req.body);

    if (
      !shippingInfo ||
      !orderItems ||
      !user ||
      !subtotal ||
      !tax ||
      !total ||
      !shippingInfo.deliveryMode
    )
      return next(new ErrorHandler("Please Enter All Fields", 400));

    const order = await Order.create({
      shippingInfo,
      orderItems,
      user,
      subtotal,
      tax,
      shippingCharges,
      discount,
      total,
    });

    await reduceStock(orderItems);

    return res.status(201).json({
      success: true,
      message: "Order Placed Successfully",
    });
  }
);

export const processOrder = TryCatch(async (req, res, next) => {
  const { id } = req.params;

  const order = await Order.findById(id);

  if (!order) return next(new ErrorHandler("Order Not Found", 404));

  switch (order.status) {
    case "Processing":
      order.status = "Shipped";
      break;
    case "Shipped":
      order.status = "Delivered";
      break;
    default:
      order.status = "Delivered";
      break;
  }

  await order.save();

  return res.status(200).json({
    success: true,
    message: "Order Processed Successfully",
  });
});

export const deleteOrder = TryCatch(async (req, res, next) => {
  const { id } = req.params;

  const order = await Order.findById(id);
  if (!order) return next(new ErrorHandler("Order Not Found", 404));

  await order.deleteOne();

  return res.status(200).json({
    success: true,
    message: "Order Deleted Successfully",
  });
});
