
const mongoose = require("mongoose");
const MenuItem = require("../models/menuItem.model");
const Restaurant = require("../models/restaurant.model");

// Create a menu item
const createMenuItem = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      category,
      imageUrl,
      restaurantId,
    } = req.body;

    if (
      !name ||
      price === undefined ||
      !category ||
      !restaurantId
    ) {
      return res.status(400).json({
        success: false,
        message: "Name, price, category and restaurantId are required",
      });
    }

    if (!mongoose.isValidObjectId(restaurantId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid restaurant ID",
      });
    }

    if (!Number.isFinite(price) || Number(price) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Price must be a number greater than zero",
      });
    }

    const restaurant = await Restaurant.findById(restaurantId);

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    // Owners can manage only their own restaurant.
    // Admins can manage any restaurant.
    const isOwner =
      restaurant.owner.toString() === req.user.id;

    if (req.user.role !== "admin" && !isOwner) {
      return res.status(403).json({
        success: false,
        message: "You cannot manage this restaurant's menu",
      });
    }

    const menuItem = await MenuItem.create({
      name,
      description,
      price: Number(price),
      category,
      imageUrl,
      restaurant: restaurantId,
    });

    return res.status(201).json({
      success: true,
      message: "Menu item created successfully",
      menuItem,
    });
  } catch (error) {
    console.error("Create menu item error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to create menu item",
    });
  }
};

// Get all available items for one restaurant
const getRestaurantMenu = async (req, res) => {
  try {
    const { restaurantId } = req.params;

    if (!mongoose.isValidObjectId(restaurantId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid restaurant ID",
      });
    }

    const restaurant = await Restaurant.findOne({
      _id: restaurantId,
      isActive: true,
    });

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    const menuItems = await MenuItem.find({
      restaurant: restaurantId,
      isAvailable: true,
    })
      .select("-__v")
      .sort({ category: 1, name: 1 })
      .limit(200)
      .lean();

    return res.status(200).json({
      success: true,
      count: menuItems.length,
      menuItems,
    });
  } catch (error) {
    console.error("Get restaurant menu error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve menu",
    });
  }
};

// Get all items belonging to the logged-in owner's restaurants
const getMyMenuItems = async (req, res) => {
  try {
    const filter = {};

    if (req.user.role !== "admin") {
      const myRestaurants = await Restaurant.find({
        owner: req.user.id,
      }).select("_id");

      filter.restaurant = {
        $in: myRestaurants.map((restaurant) => restaurant._id),
      };
    }

    const menuItems = await MenuItem.find(filter)
      .select("-__v")
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    return res.status(200).json({
      success: true,
      count: menuItems.length,
      menuItems,
    });
  } catch (error) {
    console.error("Get my menu items error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve your menu items",
    });
  }
};

// Update a menu item
const updateMenuItem = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid menu item ID",
      });
    }

    const menuItem = await MenuItem.findById(id);

    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: "Menu item not found",
      });
    }

    const restaurant = await Restaurant.findById(
      menuItem.restaurant
    );

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    const isOwner =
      restaurant.owner.toString() === req.user.id;

    if (req.user.role !== "admin" && !isOwner) {
      return res.status(403).json({
        success: false,
        message: "You cannot update this menu item",
      });
    }

    const allowedFields = [
      "name",
      "description",
      "price",
      "category",
      "imageUrl",
      "isAvailable",
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        menuItem.set(field, req.body[field]);
      }
    }

    await menuItem.save();

    return res.status(200).json({
      success: true,
      message: "Menu item updated successfully",
      menuItem,
    });
  } catch (error) {
    console.error("Update menu item error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to update menu item",
    });
  }
};

// Delete a menu item
const deleteMenuItem = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid menu item ID",
      });
    }

    const menuItem = await MenuItem.findById(id);

    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: "Menu item not found",
      });
    }

    const restaurant = await Restaurant.findById(
      menuItem.restaurant
    );

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    const isOwner =
      restaurant.owner.toString() === req.user.id;

    if (req.user.role !== "admin" && !isOwner) {
      return res.status(403).json({
        success: false,
        message: "You cannot delete this menu item",
      });
    }

    await menuItem.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Menu item deleted successfully",
    });
  } catch (error) {
    console.error("Delete menu item error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to delete menu item",
    });
  }
};

module.exports = {
  createMenuItem,
  getRestaurantMenu,
  getMyMenuItems,
  updateMenuItem,
  deleteMenuItem,
};
