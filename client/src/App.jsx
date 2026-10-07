
import { useEffect, useState } from "react";
import "./App.css";

const API = "http://localhost:3000/api";

function loadRazorpayCheckout() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}


function App() {
  const [authMode, setAuthMode] = useState(null);

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem("biteflowUser")) || null;
    } catch {
      return null;
    }
  });

  const [editingAddress, setEditingAddress] = useState(false);
  const [userLocation, setUserLocation] = useState("");


  const [authToken, setAuthToken] = useState(
    () => sessionStorage.getItem("biteflowToken") || ""
  );

  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authMessage, setAuthMessage] = useState("");

  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuError, setMenuError] = useState("");
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderMessage, setOrderMessage] = useState("");
  const [placedOrder, setPlacedOrder] = useState(null);
  const [showOrders, setShowOrders] = useState(false);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminOrders, setAdminOrders] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [adminUpdatingId, setAdminUpdatingId] = useState("");



  useEffect(() => {
    async function loadRestaurants() {
      try {
        const response = await fetch(`${API}/restaurants`);

        if (!response.ok) {
          throw new Error("Could not load restaurants");
        }

        const data = await response.json();
        setRestaurants(data.restaurants || data.data || []);
      } catch (err) {
        setError("Unable to connect to BiteFlow. Please check that the backend is running.");
      } finally {
        setLoading(false);
      }
    }

    loadRestaurants();
  }, []);

  const filteredRestaurants = restaurants.filter((restaurant) =>
    `${restaurant.name} ${restaurant.cuisine || ""} ${restaurant.city || ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );
  async function openRestaurant(restaurant) {
    setSelectedRestaurant(restaurant);
    setMenuItems([]);
    setMenuError("");
    setMenuLoading(true);

    try {
      const response = await fetch(
        `${API}/menu/restaurant/${restaurant._id}`
      );

      if (!response.ok) {
        throw new Error("Unable to load menu");
      }

      const data = await response.json();
      setMenuItems(data.menuItems || []);
    } catch (error) {
      setMenuError("Unable to load the menu. Please try again.");
    } finally {
      setMenuLoading(false);
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }


  function addToCart(item) {
    const restaurantId =
      item.restaurant?._id ||
      item.restaurant ||
      item.restaurantId ||
      selectedRestaurant?._id;

    if (!restaurantId) {
      console.error("Restaurant ID is missing from the menu item.");
      return;
    }

    setCart((currentCart) => {
      // Don't mix items from different restaurants.
      if (
        currentCart.length > 0 &&
        String(
          currentCart[0].restaurantId ||
          currentCart[0].restaurant?._id ||
          currentCart[0].restaurant
        ) !== String(restaurantId)
      ) {
        alert(
          "Your cart contains items from another restaurant. Please clear your cart before ordering here."
        );
        return currentCart;
      }

      const existing = currentCart.find(
        (cartItem) => cartItem._id === item._id
      );

      if (existing) {
        return currentCart.map((cartItem) =>
          cartItem._id === item._id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      }

      return [
        ...currentCart,
        {
          ...item,
          restaurantId: String(restaurantId),
          quantity: 1,
        },
      ];
    });
  }


  function changeQuantity(itemId, change) {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item._id === itemId
            ? { ...item, quantity: item.quantity + change }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  async function handleAuthSubmit(event) {
    event.preventDefault();
    setAuthError("");
    setAuthMessage("");
    setAuthLoading(true);

    try {
      const isRegister = authMode === "register";

      const payload = isRegister
        ? {
          name: authForm.name.trim(),
          email: authForm.email.trim(),
          password: authForm.password,
        }
        : {
          email: authForm.email.trim(),
          password: authForm.password,
        };

      const response = await fetch(
        `${API}/auth/${isRegister ? "register" : "login"}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Authentication failed");
      }

      // Registration creates the account. Ask the customer to log in.
      if (isRegister) {
        setAuthMode("login");
        setAuthForm({
          name: "",
          email: authForm.email.trim(),
          password: "",
        });
        setAuthMessage("Account created! Please log in.");
        return;
      }

      if (!data.token || !data.user) {
        throw new Error("Login response did not contain a token and user.");
      }

      sessionStorage.setItem("biteflowToken", data.token);
      sessionStorage.setItem("biteflowUser", JSON.stringify(data.user));

      setAuthToken(data.token);
      setCurrentUser(data.user);
      setAuthMode(null);
      setAuthForm({ name: "", email: "", password: "" });
      setAuthMessage("Welcome to BiteFlow!");
    } catch (error) {
      setAuthError(error.message || "Something went wrong. Please try again.");
    } finally {
      setAuthLoading(false);
    }
  }

  function handleLogout() {
    sessionStorage.removeItem("biteflowToken");
    sessionStorage.removeItem("biteflowUser");
    setAuthToken("");
    setCurrentUser(null);
    setAuthMessage("You have logged out.");
    setAuthError("");
  }

  async function startRazorpayPayment(orderPayload) {
    setOrderMessage("");
    setPlacingOrder(true);
    let checkoutOpened = false;

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    };

    try {
      const response = await fetch(`${API}/orders/razorpay/create`, {
        method: "POST",
        headers,
        body: JSON.stringify(orderPayload),
      });

      const paymentData = await response.json();

      if (!response.ok || !paymentData.success) {
        throw new Error(paymentData.message || "Unable to start payment.");
      }

      const scriptLoaded = await loadRazorpayCheckout();

      if (!scriptLoaded) {
        throw new Error("Could not load Razorpay. Check your internet connection.");
      }

      const methodName = {
        upi: "UPI",
        card: "Card",
        netbanking: "Net Banking",
      }[paymentMethod];

      const checkout = new window.Razorpay({
        key: paymentData.keyId,
        amount: paymentData.amount,
        currency: paymentData.currency,
        name: "BiteFlow",
        description: `Food order payment · ${methodName}`,
        order_id: paymentData.razorpayOrderId,
        prefill: {
          name: currentUser?.name || "",
          email: currentUser?.email || "",
        },
        config: {
          display: {
            blocks: {
              selected_method: {
                name: `Pay using ${methodName}`,
                instruments: [{ method: paymentMethod }],
              },
            },
            sequence: ["block.selected_method"],
            preferences: { show_default_blocks: false },
          },
        },
        handler: async (paymentResult) => {
          try {
            const verifyResponse = await fetch(
              `${API}/orders/razorpay/verify`,
              {
                method: "POST",
                headers,
                body: JSON.stringify(paymentResult),
              }
            );

            const verified = await verifyResponse.json();

            if (!verifyResponse.ok || !verified.success) {
              throw new Error(verified.message || "Payment verification failed.");
            }

            setPlacedOrder(verified.order);
            setCart([]);
            setDeliveryAddress("");
            setShowCheckout(false);
            setShowCart(true);
          } catch (error) {
            setOrderMessage(error.message || "Could not verify payment.");
          } finally {
            setPlacingOrder(false);
          }
        },
        modal: {
          ondismiss: () => setPlacingOrder(false),
        },
        theme: { color: "#234d3a" },
      });

      checkout.open();
      checkoutOpened = true;
    } catch (error) {
      setOrderMessage(error.message || "Unable to start online payment.");
    } finally {
      if (!checkoutOpened) setPlacingOrder(false);
    }
  }

  const placeOrder = async () => {
    setOrderMessage("");

    if (!deliveryAddress.trim()) {
      setOrderMessage("Please enter your delivery address.");
      return;
    }

    if (!cart.length) {
      setOrderMessage("Your cart is empty.");
      return;
    }

    if (!authToken || !currentUser) {
      setAuthMessage("Please log in to place your order.");
      setAuthMode("login");
      return;
    }

    const restaurantIds = [
      ...new Set(
        cart.map((item) =>
          String(item.restaurant?._id || item.restaurantId || "")
        )
      ),
    ];

    if (restaurantIds.length !== 1 || !restaurantIds[0]) {
      setOrderMessage("Please make sure all cart items belong to one restaurant.");
      return;
    }

    const orderPayload = {
      restaurantId: restaurantIds[0],
      items: cart.map((item) => ({
        menuItemId: item._id,
        quantity: item.quantity,
      })),
      deliveryAddress: deliveryAddress.trim(),
    };

    if (paymentMethod !== "cod") {
      await startRazorpayPayment(orderPayload);
      return;
    }

    setPlacingOrder(true);

    try {
      const response = await fetch(`${API}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(orderPayload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to place order.");
      }

      setPlacedOrder(data.order);
      setCart([]);
      setDeliveryAddress("");
      setShowCheckout(false);
      setShowCart(true);
    } catch (error) {
      setOrderMessage(error.message || "Unable to place order. Please try again.");
    } finally {
      setPlacingOrder(false);
    }
  };

  const isStaffUser = Boolean(
    currentUser &&
    (currentUser.role === "admin" || currentUser.role === "restaurant_owner")
  );

  const adminStatusOptions = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["preparing", "cancelled"],
    preparing: ["ready", "cancelled"],
    ready: ["out_for_delivery", "cancelled"],
    out_for_delivery: ["delivered"],
    delivered: [],
    cancelled: [],
  };

  const statusLabel = (status) =>
  ({
    pending: "Pending",
    confirmed: "Confirmed",
    preparing: "Preparing",
    ready: "Ready",
    out_for_delivery: "Out for Delivery",
    delivered: "Delivered",
    cancelled: "Cancelled",
  }[status] || status || "Pending");

  async function loadAdminOrders() {
    if (!authToken || !isStaffUser) {
      setAuthMessage("Admin access is available only to restaurant owners and admins.");
      return;
    }

    setShowAdmin(true);
    setShowOrders(false);
    setShowCart(false);
    setSelectedRestaurant(null);
    setAdminLoading(true);
    setAdminError("");

    try {
      const response = await fetch(`${API}/orders`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to load admin orders.");
      }

      setAdminOrders(Array.isArray(data.orders) ? data.orders : []);
    } catch (err) {
      setAdminError(err.message || "Unable to load admin orders.");
    } finally {
      setAdminLoading(false);
    }
  }

  async function updateAdminOrderStatus(orderId, status) {
    if (!authToken || !isStaffUser) return;

    setAdminUpdatingId(orderId);
    setAdminError("");

    try {
      const response = await fetch(`${API}/orders/${orderId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to update order status.");
      }

      setAdminOrders((current) =>
        current.map((order) =>
          order._id === orderId ? { ...order, status: data.order.status } : order
        )
      );
    } catch (err) {
      setAdminError(err.message || "Unable to update order status.");
    } finally {
      setAdminUpdatingId("");
    }
  }

  async function loadOrders() {
    if (!authToken) {
      setAuthMode("login");
      setAuthMessage("Please log in to view your orders.");
      return;
    }

    setShowOrders(true);
    setShowCart(false);
    setOrdersLoading(true);
    setOrdersError("");

    try {
      const response = await fetch(`${API}/orders`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to load your orders.");
      }

      setOrders(Array.isArray(data.orders) ? data.orders : []);
      setSelectedRestaurant(null);
    } catch (err) {
      setOrdersError(err.message || "Unable to load your orders.");
    } finally {
      setOrdersLoading(false);
    }
  }


  function getCurrentLocation() {
    if (!navigator.geolocation) {
      alert("Location is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            {
              headers: {
                Accept: "application/json",
              },
            }
          );

          const data = await response.json();

          if (data.display_name) {
            setUserLocation(data.display_name);
            setDeliveryAddress(data.display_name);
          } else {
            setUserLocation("Current location");
          }
        } catch (error) {
          console.error("Location lookup failed:", error);
          setUserLocation("Current location");
        }
      },
      () => {
        alert("Unable to get your location. Please allow location access.");
      }
    );
  }

  return (
    <div className="app">
      <header className="navbar">
        <a className="brand" href="/">
          <span className="brand-icon">B</span>
          BiteFlow<span className="brand-dot">.</span>
        </a>

        <button
          className="nav-location"
          type="button"
          onClick={getCurrentLocation}
        >
          <span>Delivering to</span>
          <strong title={userLocation}>
            📍 {userLocation || "Your location"}
          </strong>
        </button>


        <div className="nav-actions">
          {currentUser ? (
            <>
              <button className="login-button" onClick={loadOrders}>
                My Orders
              </button>
              {isStaffUser && (
                <button className="login-button admin-nav-button" onClick={loadAdminOrders}>
                  Manage Orders
                </button>
              )}
              <span className="welcome-user">
                Hi, {currentUser.name || "Customer"}
              </span>
              <button className="login-button" onClick={handleLogout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <button
                className="login-button"
                onClick={() => {
                  setAuthMode("login");
                  setAuthError("");
                  setAuthMessage("");
                }}
              >
                Log in
              </button>

              <button
                className="signup-button"
                onClick={() => {
                  setAuthMode("register");
                  setAuthError("");
                  setAuthMessage("");
                }}
              >
                Sign up
              </button>
            </>
          )}
        </div>

      </header>

      <main>
        {showAdmin && (
          <section className="restaurants-section admin-section">
            <div className="section-heading">
              <div>
                <span className="eyebrow">BITEFLOW MANAGEMENT</span>
                <h2>Manage Orders<span>.</span></h2>
              </div>
              <div className="admin-heading-actions">
                <button className="back-button" onClick={loadAdminOrders}>Refresh</button>
                <button
                  className="back-button"
                  onClick={() => {
                    setShowAdmin(false);
                    setAdminError("");
                  }}
                >
                  Back to browsing
                </button>
              </div>
            </div>

            {adminLoading && <p className="status-message">Loading orders...</p>}
            {adminError && <p className="status-message error">{adminError}</p>}

            {!adminLoading && !adminError && (
              <>
                <div className="admin-stats">
                  {Object.entries(
                    adminOrders.reduce((counts, order) => {
                      counts[order.status || "pending"] = (counts[order.status || "pending"] || 0) + 1;
                      return counts;
                    }, {})
                  ).map(([status, count]) => (
                    <div className="admin-stat" key={status}>
                      <span>{statusLabel(status)}</span>
                      <strong>{count}</strong>
                    </div>
                  ))}
                </div>

                {adminOrders.length === 0 ? (
                  <div className="empty-state">
                    <span>📦</span>
                    <h3>No orders yet</h3>
                    <p>New customer orders will appear here.</p>
                  </div>
                ) : (
                  <div className="admin-orders-list">
                    {adminOrders.map((order) => {
                      const nextStatuses = adminStatusOptions[order.status] || [];
                      return (
                        <article className="admin-order-card" key={order._id}>
                          <div className="admin-order-top">
                            <div>
                              <span className="eyebrow">ORDER #{String(order._id).slice(-8)}</span>
                              <h3>{order.restaurant?.name || "BiteFlow restaurant"}</h3>
                            </div>
                            <span className={`order-status-badge status-${order.status || "pending"}`}>
                              {statusLabel(order.status)}
                            </span>
                          </div>

                          <div className="admin-order-grid">
                            <div>
                              <strong>Customer</strong>
                              <p>{order.customer?.name || "Customer"}</p>
                              <p>{order.customer?.email || "Email unavailable"}</p>
                            </div>
                            <div>
                              <strong>Items</strong>
                              {(order.items || []).map((item, index) => (
                                <p key={item._id || item.menuItem || index}>
                                  {item.name} × {item.quantity} · ₹{item.price * item.quantity}
                                </p>
                              ))}
                            </div>
                            <div>
                              <strong>Delivery</strong>
                              <p>{order.deliveryAddress || "Not provided"}</p>
                            </div>
                            <div>
                              <strong>Payment</strong>
                              <p>{order.paymentMethod === "razorpay" ? "Razorpay" : (order.paymentMethod || "COD").toUpperCase()}</p>
                              <p>{order.paymentStatus === "paid" ? "Paid" : "Payment pending"}</p>
                              <strong className="admin-total">₹{order.totalAmount ?? 0}</strong>
                            </div>
                          </div>

                          {nextStatuses.length > 0 && (
                            <div className="admin-status-actions">
                              <span>Update status:</span>
                              {nextStatuses.map((nextStatus) => (
                                <button
                                  key={nextStatus}
                                  className={nextStatus === "cancelled" ? "danger-button" : "status-action-button"}
                                  disabled={adminUpdatingId === order._id}
                                  onClick={() => updateAdminOrderStatus(order._id, nextStatus)}
                                >
                                  {adminUpdatingId === order._id ? "Updating..." : statusLabel(nextStatus)}
                                </button>
                              ))}
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {showOrders && (
          <section className="restaurants-section my-orders-section">
            <div className="section-heading">
              <div>
                <span className="eyebrow">YOUR BITEFLOW ACTIVITY</span>
                <h2>My Orders<span>.</span></h2>
              </div>
              <button
                className="back-button"
                onClick={() => {
                  setShowOrders(false);
                  setOrdersError("");
                }}
              >
                Back to browsing
              </button>
            </div>

            {ordersLoading && <p className="status-message">Loading your orders...</p>}
            {ordersError && <p className="status-message error">{ordersError}</p>}
            {!ordersLoading && !ordersError && orders.length === 0 && (
              <div className="empty-state">
                <span>🧾</span>
                <h3>No orders yet</h3>
                <p>Your completed checkouts will appear here.</p>
              </div>
            )}

            {!ordersLoading && !ordersError && orders.length > 0 && (
              <div className="my-orders-list">
                {orders.map((order) => (
                  <article className="restaurant-card my-order-card" key={order._id}>
                    <div className="restaurant-info">
                      <div className="cart-title">
                        <h3>Order #{String(order._id).slice(-8)}</h3>
                        <span className="image-tag">{order.status || "Pending"}</span>
                      </div>
                      <p>
                        {order.createdAt
                          ? new Date(order.createdAt).toLocaleString()
                          : "Date unavailable"}
                      </p>
                      <p><strong>Restaurant:</strong> {order.restaurant?.name || order.restaurantName || "BiteFlow restaurant"}</p>
                      <div className="my-order-items">
                        {(order.items || []).map((item, index) => (
                          <p key={item._id || item.menuItem?._id || index}>
                            {item.menuItem?.name || item.name || "Menu item"} × {item.quantity}
                          </p>
                        ))}
                      </div>
                      <p><strong>Delivery address:</strong> {order.deliveryAddress || "Not provided"}</p>
                      <div className="cart-total">
                        <span>Total</span>
                        <strong>₹{order.totalAmount ?? order.total ?? 0}</strong>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {!showAdmin && !showOrders && showCheckout && (
          <section className="checkout-page">
            <button className="back-button" type="button" onClick={() => { setShowCheckout(false); setShowCart(true); setOrderMessage(""); }}>
              ← Back to cart
            </button>
            <div className="checkout-heading">
              <span className="eyebrow">ONE LAST STEP</span>
              <h1>Checkout<span>.</span></h1>
              <p>Confirm your delivery details and choose how you’d like to pay.</p>
            </div>
            <div className="checkout-layout">
              <div className="checkout-main">
                <section className="checkout-card">
                  <h2>Delivery address</h2>
                  <div className="location-checkout-box">
                    <div className="location-checkout-header">
                      <div>
                        <strong>📍 Delivery location</strong>

                        {deliveryAddress && !editingAddress ? (
                          <p>{deliveryAddress}</p>
                        ) : (
                          <textarea
                            id="checkoutDeliveryAddress"
                            value={deliveryAddress}
                            onChange={(event) => setDeliveryAddress(event.target.value)}
                            placeholder="Enter your flat, building, street, landmark..."
                            rows={3}
                            maxLength={300}
                          />
                        )}
                      </div>

                      <button
                        type="button"
                        className="location-button"
                        onClick={() => {
                          if (editingAddress) {
                            setEditingAddress(false);
                          } else {
                            setEditingAddress(true);
                          }
                        }}
                      >
                        {editingAddress ? "Save" : "Edit"}
                      </button>
                    </div>

                    {!deliveryAddress && !editingAddress && (
                      <button
                        type="button"
                        className="location-button"
                        onClick={getCurrentLocation}
                      >
                        📍 Use current location
                      </button>
                    )}
                  </div>
                </section>
                <section className="checkout-card">
                  <h2>Payment method</h2>
                  <div className="payment-options">
                    <label
                      className={`payment-option ${paymentMethod === "cod" ? "selected" : ""
                        }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="cod"
                        checked={paymentMethod === "cod"}
                        onChange={() => setPaymentMethod("cod")}
                      />
                      <span>
                        <strong>Cash on Delivery</strong>
                        <small>Pay when your order arrives</small>
                      </span>
                      <span className="payment-availability">Available</span>
                    </label>

                    {[
                      { id: "upi", title: "UPI" },
                      { id: "card", title: "Card" },
                      { id: "netbanking", title: "Net Banking" },
                    ].map((method) => (
                      <label
                        className={`payment-option ${paymentMethod === method.id ? "selected" : ""
                          }`}
                        key={method.id}
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={method.id}
                          checked={paymentMethod === method.id}
                          onChange={() => setPaymentMethod(method.id)}
                        />
                        <span>
                          <strong>{method.title}</strong>
                          <small>Pay securely with Razorpay</small>
                        </span>
                        <span className="payment-availability">Test mode</span>
                      </label>
                    ))}
                  </div>

                  <p className="payment-note">
                    Online payments open Razorpay Checkout. Choose a payment method above to continue.
                  </p>
                </section>
              </div>
              <aside className="checkout-card checkout-summary">
                <h2>Order summary</h2>
                {cart.map((item) => (
                  <div className="summary-row" key={item._id}>
                    <span>{item.name} <small>× {item.quantity}</small></span>
                    <strong>₹{item.price * item.quantity}</strong>
                  </div>
                ))}
                <div className="cart-total"><span>Total</span><strong>₹{cartTotal}</strong></div>
                <p className="cart-note">Delivery fees and taxes, if applicable, are not included.</p>
                {orderMessage && <p className="checkout-error" role="alert">{orderMessage}</p>}
                <button className="signup-button place-order-button" type="button" disabled={placingOrder || !cart.length} onClick={placeOrder}>
                  {placingOrder
                    ? "Processing..."
                    : paymentMethod === "cod"
                      ? "Place Order · Cash on Delivery"
                      : `Pay ₹${cartTotal} · ${{ upi: "UPI", card: "Card", netbanking: "Net Banking" }[
                      paymentMethod
                      ]
                      }`}
                </button>
                {!currentUser && <p className="checkout-login-note">You’ll be asked to log in before placing your order.</p>}
              </aside>
            </div>
          </section>
        )}

        {!showAdmin && !showOrders && !showCheckout && selectedRestaurant && (
          <section className="menu-page">
            <button
              className="back-button"
              onClick={() => setSelectedRestaurant(null)}
            >
              ← Back to restaurants
            </button>

            <div className="menu-heading">
              <div>
                <span className="eyebrow">EXPLORE THE MENU</span>
                <h1>{selectedRestaurant.name}</h1>
                <p>
                  {selectedRestaurant.cuisine} · {selectedRestaurant.city}
                </p>
              </div>

              <button
                className="signup-button"
                onClick={() => setShowCart(!showCart)}
              >
                Cart ({cartCount})
              </button>
            </div>

            {menuLoading && <p className="status-message">Loading menu...</p>}
            {menuError && <p className="status-message error">{menuError}</p>}

            {!menuLoading && !menuError && menuItems.length === 0 && (
              <p className="status-message">No menu items available yet.</p>
            )}

            <div className="restaurant-grid">
              {menuItems.filter((item) => item.isAvailable).map((item) => (
                <article className="restaurant-card" key={item._id}>
                  <div className="restaurant-image">
                    <img
                      src={
                        item.imageUrl ||
                        "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=800&q=80"
                      }
                      alt={item.name}
                    />
                    <span className="image-tag">{item.category}</span>
                  </div>

                  <div className="restaurant-info">
                    <h3>{item.name}</h3>
                    <p>{item.description}</p>

                    <div className="menu-item-footer">
                      <strong>₹{item.price}</strong>
                      <button
                        className="signup-button"
                        onClick={() => addToCart(item)}
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>


            {showCart && (
              <div className="cart-panel">
                <div className="cart-title">
                  <h2>Your cart</h2>
                  <button
                    className="back-button"
                    onClick={() => setShowCart(false)}
                  >
                    Close
                  </button>
                </div>

                {placedOrder ? (
                  <div className="order-confirmation">
                    <h3>Order placed successfully!</h3>
                    <p>Order ID: {placedOrder._id}</p>
                    <p>Total: ₹{placedOrder.totalAmount}</p>
                    <p>Status: {placedOrder.status}</p>
                    <button
                      className="signup-button"
                      onClick={() => {
                        setPlacedOrder(null);
                        setShowCart(false);
                      }}
                    >
                      Continue browsing
                    </button>
                  </div>
                ) : cart.length === 0 ? (
                  <p>Your cart is empty. Add something delicious!</p>
                ) : (
                  <>
                    {cart.map((item) => (
                      <div className="cart-row" key={item._id}>
                        <div>
                          <strong>{item.name}</strong>
                          <p>₹{item.price} each</p>
                        </div>

                        <div className="quantity-controls">
                          <button onClick={() => changeQuantity(item._id, -1)}>
                            −
                          </button>
                          <span>{item.quantity}</span>
                          <button onClick={() => changeQuantity(item._id, 1)}>
                            +
                          </button>
                        </div>

                        <strong>₹{item.price * item.quantity}</strong>
                      </div>
                    ))}

                    <div className="cart-total">
                      <span>Total</span>
                      <strong>₹{cartTotal}</strong>
                    </div>

                    <p className="cart-note">
                      Delivery fees and taxes, if applicable, are not included.
                    </p>

                    <div className="checkout-form">
                      <button
                        type="button"
                        className="signup-button proceed-checkout-button"
                        onClick={() => {
                          setOrderMessage("");
                          setPaymentMethod("cod");
                          setShowCart(false);
                          setShowCheckout(true);
                        }}
                      >
                        Proceed to Checkout
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}


          </section>
        )}

        {!showAdmin && !showOrders && !selectedRestaurant && (
          <section className="hero">
            <div className="hero-content">
              <span className="eyebrow">GOOD FOOD. GOOD MOOD.</span>
              <h1>
                Your cravings,
                <br />
                <span>our priority.</span>
              </h1>
              <p>
                Discover local favourites and delicious meals,
                delivered straight to your door.
              </p>

              <div className="search-box">
                <span>⌕</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search restaurants or cuisines..."
                  aria-label="Search restaurants"
                />
                <button onClick={() => document.getElementById("restaurants")?.scrollIntoView({ behavior: "smooth" })}>
                  Explore
                </button>
              </div>

              <div className="hero-note">
                <span>✦</span> Discover your next favourite meal
              </div>
            </div>

            <div className="hero-visual">
              <div className="hero-image">
                <img
                  src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1000&q=85"
                  alt="Fresh and colourful restaurant meal"
                />
              </div>
              <div className="floating-card">
                <span className="floating-icon">✦</span>
                <div>
                  <strong>Made for food lovers</strong>
                  <small>Find something delicious today</small>
                </div>
              </div>
              <span className="decor decor-one">✳</span>
              <span className="decor decor-two">✦</span>
            </div>
          </section>
        )}

        {!showAdmin && !showOrders && <section className="features">
          <div><span>01</span><strong>Local favourites</strong><small>Explore nearby restaurants</small></div>
          <div><span>02</span><strong>Easy ordering</strong><small>Your next meal, just a few clicks</small></div>
          <div><span>03</span><strong>Made for you</strong><small>Find food that fits your mood</small></div>
        </section>}

        {!showAdmin && !showOrders && <section className="restaurants-section" id="restaurants">
          <div className="section-heading">
            <div>
              <span className="eyebrow">YOUR NEXT DELICIOUS DISCOVERY</span>
              <h2>Restaurants to explore<span>.</span></h2>
            </div>
            <span className="restaurant-count">
              {loading ? "Loading..." : `${filteredRestaurants.length} places`}
            </span>
          </div>

          {loading && <p className="status-message">Finding delicious places for you...</p>}
          {error && <p className="status-message error">{error}</p>}

          {!loading && !error && filteredRestaurants.length === 0 && (
            <div className="empty-state">
              <span>🍽️</span>
              <h3>{search ? "No matches found" : "Your food journey starts here"}</h3>
              <p>
                {search
                  ? "Try a different restaurant name or cuisine."
                  : "Restaurants will appear here as they become available."}
              </p>
            </div>
          )}

          <div className="restaurant-grid">
            {filteredRestaurants.map((restaurant) => (
              <article
                className="restaurant-card"
                key={restaurant._id}
                onClick={() => openRestaurant(restaurant)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter") openRestaurant(restaurant);
                }}
              >
                <div className="restaurant-image">
                  <img
                    src={
                      restaurant.imageUrl ||
                      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80"
                    }
                    alt={restaurant.name}
                  />
                  <span className="image-tag">{restaurant.cuisine || "Restaurant"}</span>
                </div>
                <div className="restaurant-info">
                  <h3>{restaurant.name}</h3>
                  <p>{[restaurant.city, restaurant.address].filter(Boolean).join(" · ")}</p>
                  <span className="view-menu">Restaurant details <span>↗</span></span>
                </div>
              </article>
            ))}
          </div>
        </section>}


        {authMode && (
          <div
            className="auth-overlay"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !authLoading) {
                setAuthMode(null);
                setAuthError("");
              }
            }}
          >
            <section
              className="auth-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="auth-title"
            >
              <button
                className="auth-close"
                type="button"
                aria-label="Close"
                disabled={authLoading}
                onClick={() => setAuthMode(null)}
              >
                ×
              </button>

              <span className="eyebrow">WELCOME TO BITEFLOW</span>

              <h2 id="auth-title">
                {authMode === "register" ? "Create your account." : "Welcome back."}
              </h2>

              <p className="auth-description">
                {authMode === "register"
                  ? "Sign up to discover your next favourite meal."
                  : "Log in to continue your food journey."}
              </p>

              <form onSubmit={handleAuthSubmit}>
                {authMode === "register" && (
                  <label className="auth-field">
                    Full name
                    <input
                      type="text"
                      autoComplete="name"
                      minLength={2}
                      maxLength={60}
                      required
                      value={authForm.name}
                      onChange={(event) =>
                        setAuthForm({ ...authForm, name: event.target.value })
                      }
                      placeholder="Your name"
                    />
                  </label>
                )}

                <label className="auth-field">
                  Email address
                  <input
                    type="email"
                    autoComplete="email"
                    required
                    value={authForm.email}
                    onChange={(event) =>
                      setAuthForm({ ...authForm, email: event.target.value })
                    }
                    placeholder="you@example.com"
                  />
                </label>

                <label className="auth-field">
                  Password
                  <input
                    type="password"
                    autoComplete={
                      authMode === "register" ? "new-password" : "current-password"
                    }
                    minLength={authMode === "register" ? 8 : undefined}
                    maxLength={72}
                    required
                    value={authForm.password}
                    onChange={(event) =>
                      setAuthForm({ ...authForm, password: event.target.value })
                    }
                    placeholder={
                      authMode === "register"
                        ? "At least 8 characters"
                        : "Enter your password"
                    }
                  />
                </label>

                {authError && (
                  <p className="auth-feedback auth-error" role="alert">
                    {authError}
                  </p>
                )}

                {authMessage && (
                  <p className="auth-feedback auth-success" role="status">
                    {authMessage}
                  </p>
                )}

                <button
                  className="signup-button auth-submit"
                  type="submit"
                  disabled={authLoading}
                >
                  {authLoading
                    ? "Please wait..."
                    : authMode === "register"
                      ? "Create account"
                      : "Log in"}
                </button>
              </form>

              <p className="auth-switch">
                {authMode === "register"
                  ? "Already have an account?"
                  : "New to BiteFlow?"}
                {" "}
                <button
                  type="button"
                  disabled={authLoading}
                  onClick={() => {
                    setAuthMode(authMode === "register" ? "login" : "register");
                    setAuthError("");
                    setAuthMessage("");
                  }}
                >
                  {authMode === "register" ? "Log in" : "Create account"}
                </button>
              </p>
            </section>
          </div>
        )}

      </main>

      <footer>
        <a className="brand" href="/"><span className="brand-icon">B</span>BiteFlow<span className="brand-dot">.</span></a>
        <p>Good food brings people together.</p>
        <span>© {new Date().getFullYear()} BiteFlow</span>
      </footer>
    </div>
  );
}

export default App;
