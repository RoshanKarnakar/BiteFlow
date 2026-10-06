const crypto = require("crypto");
const mongoose = require("mongoose");
const MenuItem = require("../models/menuItem.model");
const Order = require("../models/order.model");
const PaymentIntent = require("../models/paymentIntent.model");
const Restaurant = require("../models/restaurant.model");

function getCredentials() {
  return {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
  };
}

async function razorpayRequest(path, options = {}) {
  const { keyId, keySecret } = getCredentials();

  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(
      data.error?.description || "Razorpay could not process this request."
    );
    error.statusCode = response.status === 401 ? 503 : 502;
    throw error;
  }

  return data;
}

function keysAreConfigured(res) {
  const { keyId, keySecret } = getCredentials();

  if (!keyId || !keySecret) {
    res.status(503).json({
      success: false,
      message: "Razorpay keys are missing from server/.env.",
    });
    return false;
  }

  return true;
}

async function createRazorpayOrder(req, res) {
  try {
    if (!keysAreConfigured(res)) return;

    const { restaurantId, items, deliveryAddress } = req.body;

    if (
      !mongoose.isValidObjectId(restaurantId) ||
      !Array.isArray(items) ||
      items.length < 1 ||
      items.length > 50 ||
      typeof deliveryAddress !== "string" ||
      !deliveryAddress.trim() ||
      deliveryAddress.trim().length > 300
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid restaurant, cart, and delivery address are required.",
      });
    }

    const restaurant = await Restaurant.findOne({
      _id: restaurantId,
      isActive: true,
    });

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Active restaurant not found.",
      });
    }

    const quantities = new Map();

    for (const item of items) {
      if (
        !item ||
        !mongoose.isValidObjectId(item.menuItemId) ||
        !Number.isInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > 50
      ) {
        return res.status(400).json({
          success: false,
          message: "Each item needs a valid menu item and quantity from 1 to 50.",
        });
      }

      const id = String(item.menuItemId);
      quantities.set(id, (quantities.get(id) || 0) + item.quantity);

      if (quantities.get(id) > 50) {
        return res.status(400).json({
          success: false,
          message: "Maximum quantity per menu item is 50.",
        });
      }
    }

    const menuItems = await MenuItem.find({
      _id: { $in: [...quantities.keys()] },
      restaurant: restaurantId,
      isAvailable: true,
    });

    if (menuItems.length !== quantities.size) {
      return res.status(400).json({
        success: false,
        message: "One or more items are unavailable or from another restaurant.",
      });
    }

    const orderItems = menuItems.map((menuItem) => ({
      menuItem: menuItem._id,
      name: menuItem.name,
      price: menuItem.price,
      quantity: quantities.get(String(menuItem._id)),
    }));

    const totalAmount = Number(
      orderItems
        .reduce((sum, item) => sum + item.price * item.quantity, 0)
        .toFixed(2)
    );

    const razorpayOrder = await razorpayRequest("/orders", {
      method: "POST",
      body: JSON.stringify({
        amount: Math.round(totalAmount * 100),
        currency: "INR",
        receipt: `biteflow_${Date.now()}`,
        notes: { biteflow_customer_id: String(req.user.id) },
      }),
    });

    await PaymentIntent.create({
      customer: req.user.id,
      restaurant: restaurantId,
      items: orderItems,
      deliveryAddress: deliveryAddress.trim(),
      totalAmount,
      razorpayOrderId: razorpayOrder.id,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    return res.status(201).json({
      success: true,
      keyId: getCredentials().keyId,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
    });
  } catch (error) {
    console.error("Create Razorpay order error:", error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Unable to start payment. Please try again.",
    });
  }
}

async function verifyRazorpayPayment(req, res) {
  try {
    if (!keysAreConfigured(res)) return;

    const {
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: signature,
    } = req.body;

    if (
      typeof razorpayOrderId !== "string" ||
      typeof razorpayPaymentId !== "string" ||
      typeof signature !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment verification details are incomplete.",
      });
    }

    const intent = await PaymentIntent.findOne({
      razorpayOrderId,
      customer: req.user.id,
    });

    if (!intent) {
      return res.status(404).json({
        success: false,
        message: "Payment session not found. Please start checkout again.",
      });
    }

    if (intent.placedOrder) {
      const existingOrder = await Order.findById(intent.placedOrder);
      if (existingOrder) {
        return res.json({ success: true, order: existingOrder });
      }
    }

    const expectedSignature = crypto
      .createHmac("sha256", getCredentials().keySecret)
      .update(`${intent.razorpayOrderId}|${razorpayPaymentId}`)
      .digest();

    const providedSignature = Buffer.from(signature, "hex");

    if (
      providedSignature.length !== expectedSignature.length ||
      !crypto.timingSafeEqual(expectedSignature, providedSignature)
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment verification failed. No order was placed.",
      });
    }

    let payment = await razorpayRequest(
      `/payments/${encodeURIComponent(razorpayPaymentId)}`
    );

    if (
      payment.order_id !== intent.razorpayOrderId ||
      payment.amount !== Math.round(intent.totalAmount * 100) ||
      payment.currency !== "INR"
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment details do not match this order.",
      });
    }

    if (payment.status === "authorized") {
      payment = await razorpayRequest(
        `/payments/${encodeURIComponent(razorpayPaymentId)}/capture`,
        {
          method: "POST",
          body: JSON.stringify({
            amount: payment.amount,
            currency: payment.currency,
          }),
        }
      );
    }

    if (payment.status !== "captured") {
      return res.status(409).json({
        success: false,
        message: "Payment has not been captured. Check Razorpay before retrying.",
      });
    }

    const allowedMethods = ["upi", "card", "netbanking"];

    const order = await Order.create({
      customer: intent.customer,
      restaurant: intent.restaurant,
      items: intent.items,
      totalAmount: intent.totalAmount,
      deliveryAddress: intent.deliveryAddress,
      paymentMethod: allowedMethods.includes(payment.method)
        ? payment.method
        : "razorpay",
      paymentStatus: "paid",
      razorpayOrderId: intent.razorpayOrderId,
      razorpayPaymentId,
    });

    intent.placedOrder = order._id;
    await intent.save();

    return res.json({
      success: true,
      message: "Payment verified and order placed.",
      order,
    });
  } catch (error) {
    console.error("Verify Razorpay payment error:", error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Unable to verify payment. Check My Orders before trying again.",
    });
  }
}

module.exports = {
  createRazorpayOrder,
  verifyRazorpayPayment,
};