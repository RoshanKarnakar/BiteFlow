
const mongoose = require("mongoose");
const Restaurant = require("../models/restaurant.model");
const User = require("../models/user.model");

// Create a restaurant
const createRestaurant = async (req, res) => {
  try {
    const { name, description, cuisine, imageUrl, address, city, phone } =
      req.body;

    if (
      typeof name !== "string" ||
      typeof cuisine !== "string" ||
      typeof address !== "string" ||
      typeof city !== "string" ||
      !name.trim() ||
      !cuisine.trim() ||
      !address.trim() ||
      !city.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Name, cuisine, address, and city are required",
      });
    }

    let ownerId = req.user.id;

    // Admins may assign a restaurant to an existing restaurant owner.
    if (req.user.role === "admin") {
      if (!mongoose.isValidObjectId(req.body.ownerId)) {
        return res.status(400).json({
          success: false,
          message: "A valid restaurant owner ID is required for admins",
        });
      }

      const assignedOwner = await User.findById(req.body.ownerId);

      if (!assignedOwner || assignedOwner.role !== "restaurant_owner") {
        return res.status(400).json({
          success: false,
          message: "The assigned user must be a restaurant owner",
        });
      }

      ownerId = assignedOwner._id;
    }

    const restaurant = await Restaurant.create({
      name: name.trim(),
      description,
      cuisine: cuisine.trim(),
      imageUrl,
      address: address.trim(),
      city: city.trim(),
      phone,
      owner: ownerId,
    });

    return res.status(201).json({
      success: true,
      message: "Restaurant created successfully",
      restaurant,
    });
  } catch (error) {
    console.error("Create restaurant error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// List active restaurants for customers
const getRestaurants = async (req, res) => {
  try {
    const restaurants = await Restaurant.find({ isActive: true })
      .select("-__v")
      .sort({ createdAt: -1 })
      .limit(100);

    return res.status(200).json({
      success: true,
      count: restaurants.length,
      restaurants,
    });
  } catch (error) {
    console.error("Get restaurants error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// List restaurants owned by the current user.
// Admins can see every restaurant through this endpoint.
const getMyRestaurants = async (req, res) => {
  try {
    const filter =
      req.user.role === "admin" ? {} : { owner: req.user.id };

    const restaurants = await Restaurant.find(filter)
      .sort({ createdAt: -1 })
      .limit(100);

    return res.status(200).json({
      success: true,
      count: restaurants.length,
      restaurants,
    });
  } catch (error) {
    console.error("Get my restaurants error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Update a restaurant
const updateRestaurant = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid restaurant ID",
      });
    }

    const restaurant = await Restaurant.findById(id);

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    if (
      req.user.role !== "admin" &&
      restaurant.owner.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own restaurants",
      });
    }

    const allowedFields = [
      "name",
      "description",
      "cuisine",
      "imageUrl",
      "address",
      "city",
      "phone",
    ];

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        restaurant.set(field, req.body[field]);
      }
    }

    // Only admins can change a restaurant's active status.
    if (
      req.user.role === "admin" &&
      Object.prototype.hasOwnProperty.call(req.body, "isActive")
    ) {
      if (typeof req.body.isActive !== "boolean") {
        return res.status(400).json({
          success: false,
          message: "isActive must be true or false",
        });
      }

      restaurant.isActive = req.body.isActive;
    }

    // Prevent owners from changing owner or role-related fields.
    // The owner field is intentionally never updated here.
    await restaurant.save();

    return res.status(200).json({
      success: true,
      message: "Restaurant updated successfully",
      restaurant,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Invalid restaurant data",
      });
    }

    console.error("Update restaurant error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Delete a restaurant
const deleteRestaurant = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid restaurant ID",
      });
    }

    const restaurant = await Restaurant.findById(id);

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    if (
      req.user.role !== "admin" &&
      restaurant.owner.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own restaurants",
      });
    }

    await restaurant.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Restaurant deleted successfully",
    });
  } catch (error) {
    console.error("Delete restaurant error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  createRestaurant,
  getRestaurants,
  getMyRestaurants,
  updateRestaurant,
  deleteRestaurant,
};
