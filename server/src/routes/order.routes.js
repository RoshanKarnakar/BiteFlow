
const express = require("express");

const authenticate = require("../middleware/auth.middleware");
const {
  createRazorpayOrder,
  verifyRazorpayPayment,
} = require("../controllers/payment.controller");
const {
  createOrder,
  getOrders,
  updateOrderStatus,
} = require("../controllers/order.controller");

const router = express.Router();

// All order routes require login.
router.use(authenticate);


router.post("/razorpay/create", createRazorpayOrder);
router.post("/razorpay/verify", verifyRazorpayPayment);
// Place a new order
router.post("/", createOrder);

// View orders based on the logged-in user's role
router.get("/", getOrders);

// Update an order's status
router.patch("/:id/status", updateOrderStatus);

module.exports = router;
