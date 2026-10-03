
const express = require("express");

const authenticate = require("../middleware/auth.middleware");
const allowRoles = require("../middleware/role.middleware");

const {
  createMenuItem,
  getRestaurantMenu,
  getMyMenuItems,
  updateMenuItem,
  deleteMenuItem,
} = require("../controllers/menu.controller");

const router = express.Router();

// Public: view available items for a restaurant
router.get("/restaurant/:restaurantId", getRestaurantMenu);

// Protected: view menu items belonging to your restaurants
router.get(
  "/mine",
  authenticate,
  allowRoles("restaurant_owner", "admin"),
  getMyMenuItems
);

// Protected: create a menu item
router.post(
  "/",
  authenticate,
  allowRoles("restaurant_owner", "admin"),
  createMenuItem
);

// Protected: update a menu item
router.patch(
  "/:id",
  authenticate,
  allowRoles("restaurant_owner", "admin"),
  updateMenuItem
);

// Protected: delete a menu item
router.delete(
  "/:id",
  authenticate,
  allowRoles("restaurant_owner", "admin"),
  deleteMenuItem
);

module.exports = router;
