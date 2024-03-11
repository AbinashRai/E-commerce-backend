import { TryCatch } from "../Middlewares/Error.js";
import { Order } from "../Models/Order.js";
import { Product } from "../Models/Products.js";
import { User } from "../Models/User.js";
import { calculatePercentage, getChartData, getInventories, } from "../Utils/Features.js";
export const getDashboardStats = TryCatch(async (req, res, next) => {
    let stats = {};
    const today = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const thisMonth = {
        start: new Date(today.getFullYear(), today.getMonth(), 1),
        end: today,
    };
    const lastMonth = {
        start: new Date(today.getFullYear(), today.getMonth() - 1, 1),
        end: new Date(today.getFullYear(), today.getMonth(), 0),
    };
    const thisMonthProducts = await Product.find({
        createdAt: {
            $gte: thisMonth.start,
            $lte: thisMonth.end,
        },
    });
    const lastMonthProducts = await Product.find({
        createdAt: {
            $gte: lastMonth.start,
            $lte: lastMonth.end,
        },
    });
    const thisMonthUsers = await User.find({
        createdAt: {
            $gte: thisMonth.start,
            $lte: thisMonth.end,
        },
    });
    const lastMonthUsers = await User.find({
        createdAt: {
            $gte: lastMonth.start,
            $lte: lastMonth.end,
        },
    });
    const thisMonthOrders = await Order.find({
        createdAt: {
            $gte: thisMonth.start,
            $lte: thisMonth.end,
        },
    });
    const lastMonthOrders = await Order.find({
        createdAt: {
            $gte: lastMonth.start,
            $lte: lastMonth.end,
        },
    });
    const lastSixMonthOrders = await Order.find({
        createdAt: {
            $gte: sixMonthsAgo,
            $lte: today,
        },
    });
    const latestTransactions = await Order.find({})
        .select(["orderItems", "discount", "total", "status"])
        .limit(4);
    const [productsCount, usersCount, allOrders, categories, femaleUsersCount] = await Promise.all([
        Product.countDocuments(),
        User.countDocuments(),
        Order.find({}).select("total"),
        Product.distinct("category"),
        User.countDocuments({ gender: "female" }),
    ]);
    const thisMonthRevenue = thisMonthOrders.reduce((total, order) => total + (order.total || 0), 0);
    const lastMonthRevenue = lastMonthOrders.reduce((total, order) => total + (order.total || 0), 0);
    const changePercent = {
        revenue: calculatePercentage(thisMonthRevenue, lastMonthRevenue),
        product: calculatePercentage(thisMonthProducts.length, lastMonthProducts.length),
        user: calculatePercentage(thisMonthUsers.length, lastMonthUsers.length),
        order: calculatePercentage(thisMonthOrders.length, lastMonthOrders.length),
    };
    const revenue = allOrders.reduce((total, order) => total + (order.total || 0), 0);
    const count = {
        revenue,
        product: productsCount,
        user: usersCount,
        order: allOrders.length,
    };
    const orderMonthCounts = new Array(6).fill(0);
    const orderMonthyRevenue = new Array(6).fill(0);
    const todayMonth = today.getMonth();
    lastSixMonthOrders.forEach((order) => {
        const creationDate = order.createdAt;
        const monthDiff = (todayMonth - creationDate.getMonth() + 12) % 12;
        if (monthDiff < 6) {
            orderMonthCounts[6 - monthDiff - 1] += 1;
            orderMonthyRevenue[6 - monthDiff - 1] += order.total;
        }
    });
    const categoryCount = await getInventories({
        categories,
        productsCount,
    });
    const userRatio = {
        male: usersCount - femaleUsersCount,
        female: femaleUsersCount,
    };
    const modifiedLatestTransaction = latestTransactions.map((i) => ({
        _id: i._id,
        discount: i.discount,
        amount: i.total,
        quantity: i.orderItems.length,
        status: i.status,
    }));
    stats = {
        categoryCount,
        changePercent,
        count,
        chart: {
            order: orderMonthCounts,
            revenue: orderMonthyRevenue,
        },
        userRatio,
        latestTransaction: modifiedLatestTransaction,
    };
    return res.status(200).json({
        success: true,
        stats,
    });
});
export const getPieCharts = TryCatch(async (req, res, next) => {
    let charts;
    const allOrderPromise = Order.find({}).select([
        "total",
        "discount",
        "subtotal",
        "tax",
        "shippingCharges",
    ]);
    const [processingOrder, shippedOrder, deliveredOrder, categories, productsCount, outOfStock, allOrders, allUsers, adminUsers, customerUsers,] = await Promise.all([
        Order.countDocuments({ status: "Processing" }),
        Order.countDocuments({ status: "Shipped" }),
        Order.countDocuments({ status: "Delivered" }),
        Product.distinct("category"),
        Product.countDocuments(),
        Product.countDocuments({ stock: 0 }),
        allOrderPromise,
        User.find({}).select(["dob"]),
        User.countDocuments({ role: "admin" }),
        User.countDocuments({ role: "user" }),
    ]);
    const orderFullfillment = {
        processing: processingOrder,
        shipped: shippedOrder,
        delivered: deliveredOrder,
    };
    const productCategories = await getInventories({
        categories,
        productsCount,
    });
    const stockAvailablity = {
        inStock: productsCount - outOfStock,
        outOfStock,
    };
    const grossIncome = allOrders.reduce((prev, order) => prev + (order.total || 0), 0);
    const discount = allOrders.reduce((prev, order) => prev + (order.discount || 0), 0);
    const productionCost = allOrders.reduce((prev, order) => prev + (order.shippingCharges || 0), 0);
    const burnt = allOrders.reduce((prev, order) => prev + (order.tax || 0), 0);
    const marketingCost = Math.round(grossIncome * (30 / 100));
    const netMargin = grossIncome - discount - productionCost - burnt - marketingCost;
    const revenueDistribution = {
        netMargin,
        discount,
        productionCost,
        burnt,
        marketingCost,
    };
    const usersAgeGroup = {
        teen: allUsers.filter((i) => i.age < 20).length,
        adult: allUsers.filter((i) => i.age >= 20 && i.age < 40).length,
        old: allUsers.filter((i) => i.age >= 40).length,
    };
    const adminCustomer = {
        admin: adminUsers,
        customer: customerUsers,
    };
    charts = {
        orderFullfillment,
        productCategories,
        stockAvailablity,
        revenueDistribution,
        usersAgeGroup,
        adminCustomer,
    };
    return res.status(200).json({
        success: true,
        charts,
    });
});
export const getBarCharts = TryCatch(async (req, res, next) => {
    let charts;
    const today = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const sixMonthProductPromise = Product.find({
        createdAt: {
            $gte: sixMonthsAgo,
            $lte: today,
        },
    }).select("createdAt");
    const sixMonthUsersPromise = User.find({
        createdAt: {
            $gte: sixMonthsAgo,
            $lte: today,
        },
    }).select("createdAt");
    const twelveMonthOrdersPromise = Order.find({
        createdAt: {
            $gte: twelveMonthsAgo,
            $lte: today,
        },
    }).select("createdAt");
    const [products, users, orders] = await Promise.all([
        sixMonthProductPromise,
        sixMonthUsersPromise,
        twelveMonthOrdersPromise,
    ]);
    const productCounts = getChartData({ length: 6, today, docArr: products });
    const usersCounts = getChartData({ length: 6, today, docArr: users });
    const ordersCounts = getChartData({ length: 12, today, docArr: orders });
    charts = {
        users: usersCounts,
        products: productCounts,
        orders: ordersCounts,
    };
    return res.status(200).json({
        success: true,
        charts,
    });
});
export const getLineCharts = TryCatch(async (req, res, next) => {
    let charts;
    const today = new Date();
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const baseQuery = {
        createdAt: {
            $gte: twelveMonthsAgo,
            $lte: today,
        },
    };
    const [products, users, orders] = await Promise.all([
        Product.find(baseQuery).select("createdAt"),
        User.find(baseQuery).select("createdAt"),
        Order.find(baseQuery).select(["createdAt", "discount", "total"]),
    ]);
    const productCounts = getChartData({ length: 12, today, docArr: products });
    const usersCounts = getChartData({ length: 12, today, docArr: users });
    const discount = getChartData({
        length: 12,
        today,
        docArr: orders,
        property: "discount",
    });
    const revenue = getChartData({
        length: 12,
        today,
        docArr: orders,
        property: "total",
    });
    charts = {
        users: usersCounts,
        products: productCounts,
        discount,
        revenue,
    };
    return res.status(200).json({
        success: true,
        charts,
    });
});
