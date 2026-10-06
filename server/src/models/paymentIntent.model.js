const mongoose = require("mongoose");

const paymentIntentSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
    },
    items: [
      {
        menuItem: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "MenuItem",
          required: true,
        },
        name: { type: String, required: true },
        price: { type: Number, required: true, min: 0.01 },
        quantity: { type: Number, required: true, min: 1 },
      },
    ],
    deliveryAddress: { type: String, required: true, maxlength: 300 },
    totalAmount: { type: Number, required: true, min: 0.01 },
    razorpayOrderId: { type: String, required: true, unique: true },
    placedOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PaymentIntent", paymentIntentSchema);