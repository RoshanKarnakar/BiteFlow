
const mongoose = require("mongoose");
const Order = require("../models/order.model");
const MenuItem = require("../models/menuItem.model");
const Restaurant = require("../models/restaurant.model");

// Place a new order
const createOrder = async (req, res) => {
  try {
    const { restaurantId, items, deliveryAddress } = req.body;

    if (
      !restaurantId ||
      !mongoose.isValidObjectId(restaurantId) ||
      !Array.isArray(items) ||
      items.length === 0 ||
      items.length > 50 ||
      typeof deliveryAddress !== "string" ||
      !deliveryAddress.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid restaurantId, items and deliveryAddress are required",
      });
    }

    const restaurant = await Restaurant.findOne({
      _id: restaurantId,
      isActive: true,
    });

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Active restaurant not found",
      });
    }

    // Validate item IDs and quantities.
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
          message: "Each item needs a valid menuItemId and quantity from 1 to 50",
        });
      }

      const id = item.menuItemId.toString();
      quantities.set(id, (quantities.get(id) || 0) + item.quantity);

      if (quantities.get(id) > 50) {
        return res.status(400).json({
          success: false,
          message: "Maximum quantity per menu item is 50",
        });
      }
    }

    const menuItemIds = [...quantities.keys()];

    const menuItems = await MenuItem.find({
      _id: { $in: menuItemIds },
      restaurant: restaurantId,
      isAvailable: true,
    });

    if (menuItems.length !== menuItemIds.length) {
      return res.status(400).json({
        success: false,
        message: "One or more menu items are unavailable or do not belong to this restaurant",
      });
    }

    // Use prices from the database, never prices sent by the client.
    const orderItems = menuItems.map((menuItem) => ({
      menuItem: menuItem._id,
      name: menuItem.name,
      price: menuItem.price,
      quantity: quantities.get(menuItem._id.toString()),
    }));

    const totalAmount = Number(
      orderItems
        .reduce((sum, item) => sum + item.price * item.quantity, 0)
        .toFixed(2)
    );

    const order = await Order.create({
      customer: req.user.id,
      restaurant: restaurantId,
      items: orderItems,
      totalAmount,
      deliveryAddress: deliveryAddress.trim().slice(0, 300),
    });

    return res.status(201).json({
      success: true,
      message: "Order placed successfully",
      order,
    });
  } catch (error) {
    console.error("Create order error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to place order",
    });
  }
};

// Customer sees their orders.
// Restaurant owners see orders for their own restaurants.
// Admins can see all orders.
const getOrders = async (req, res) => {
  try {
    const filter = {};

    if (req.user.role === "customer") {
      filter.customer = req.user.id;
    } else if (req.user.role === "restaurant_owner") {
      const restaurants = await Restaurant.find({
        owner: req.user.id,
      }).select("_id");

      filter.restaurant = {
        $in: restaurants.map((restaurant) => restaurant._id),
      };
    } else if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to view orders",
      });
    }

    const orders = await Order.find(filter)
      .populate("restaurant", "name city")
      .populate("customer", "name email")
      .select("-__v")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error("Get orders error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve orders",
    });
  }
};

// Update order status
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = [
      "confirmed",
      "preparing",
      "ready",
      "out_for_delivery",
      "delivered",
      "cancelled",
    ];

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order status",
      });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const isAdmin = req.user.role === "admin";
    const isOwner = await Restaurant.exists({
      _id: order.restaurant,
      owner: req.user.id,
    });

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message: "Only the restaurant owner or admin can update order status",
      });
    }

    const transitions = {
      pending: ["confirmed", "cancelled"],
      confirmed: ["preparing", "cancelled"],
      preparing: ["ready", "cancelled"],
      ready: ["out_for_delivery", "cancelled"],
      out_for_delivery: ["delivered"],
      delivered: [],
      cancelled: [],
    };

    if (!transitions[order.status]?.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change order status from ${order.status} to ${status}`,
      });
    }

    order.status = status;
    await order.save();

    return res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      order,
    });
  } catch (error) {
    console.error("Update order status error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to update order status",
    });
  }
};

module.exports = {
  createOrder,
  getOrders,
  updateOrderStatus,
};
