
const express = require("express");

const authenticate = require("../middleware/auth.middleware");
const allowRoles = require("../middleware/role.middleware");

const {
  createRestaurant,
  getRestaurants,
  getMyRestaurants,
  updateRestaurant,
  deleteRestaurant,
} = require("../controllers/restaurant.controller");

const router = express.Router();

// Public: customers can browse active restaurants.
router.get("/", getRestaurants);

// Private: owners see their own restaurants; admins see all.
router.get(
  "/mine",
  authenticate,
  allowRoles("restaurant_owner", "admin"),
  getMyRestaurants
);

// Only restaurant owners and admins can create restaurants.
router.post(
  "/",
  authenticate,
  allowRoles("restaurant_owner", "admin"),
  createRestaurant
);

// Only an owner of the restaurant or an admin can modify it.
router.patch(
  "/:id",
  authenticate,
  allowRoles("restaurant_owner", "admin"),
  updateRestaurant
);

router.delete(
  "/:id",
  authenticate,
  allowRoles("restaurant_owner", "admin"),
  deleteRestaurant
);

module.exports = router;
