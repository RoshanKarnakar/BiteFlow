# BiteFlow 🍔

A full-stack food-ordering web application built with the MERN stack. BiteFlow lets users browse restaurants, add menu items to a cart, place orders, and view their order history.

> **Project status:** The core customer ordering flow is implemented. Live order tracking, a restaurant admin dashboard, and online UPI/card payments are planned features, not completed features.

## Features

### Implemented
- User registration and login.
- Session persistence through the app's existing authentication flow.
- Restaurant browsing through the backend API.
- Menu browsing and adding items to the cart.
- Checkout and order placement.
- Order storage in MongoDB.
- **My Orders** page to view order history, including available details such as status, items, delivery address, and total.

### Planned
- Live order tracking and a progress timeline.
- Restaurant/admin dashboard to accept, reject, and update orders.
- Online payments through a payment gateway (UPI and debit/credit cards).
- Payment-status and transaction handling.

## Tech Stack

- **Frontend:** React, Vite, JavaScript, CSS
- **Backend:** Node.js, Express
- **Database:** MongoDB, Mongoose
- **API:** REST

## Project Structure

Folder names may differ slightly in your repository. The app has a React/Vite frontend and an Express backend. A typical structure is:

```text
BiteFlow/
├── client/              # React + Vite frontend
│   ├── src/
│   │   └── App.jsx
│   └── package.json
├── server/              # Express backend
│   ├── package.json
│   ├── server.js        # Entry point may have a different name
│   ├── routes/
│   ├── controllers/
│   └── models/
└── README.md
```

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (LTS recommended)
- npm
- A MongoDB database, such as [MongoDB Atlas](https://www.mongodb.com/atlas)

### 1. Clone the repository

Replace `YOUR_GITHUB_USERNAME` and the repository name as needed:

```bash
git clone https://github.com/YOUR_GITHUB_USERNAME/BiteFlow.git
cd BiteFlow
```

### 2. Set up the backend

```bash
cd server
npm install
```

Create a `.env` file in the backend folder. The following names are examples only—use the exact variable names read by your backend code:

```env
PORT=3000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=replace_with_a_long_random_secret
```

Start the backend using the script in `server/package.json`. For example, if a `dev` script exists:

```bash
npm run dev
```

If that script is unavailable, check `package.json` for the correct start command. The backend has previously been tested on port `3000`.

### 3. Set up the frontend

Open a second terminal:

```bash
cd client
npm install
```

If your frontend uses an environment variable for its backend URL, configure the variable expected by your code. For example:

```env
VITE_API_URL=http://localhost:3000/api
```

`VITE_API_URL` is an example name; verify the actual configuration in your source code.

Start the frontend using the script in `client/package.json`. A typical Vite command is:

```bash
npm run dev
```

Open the local URL printed by Vite, often `http://localhost:5173`.

## API Endpoints

These endpoints have been used or verified during development:

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/health` | Check whether the backend is responding. |
| `GET` | `/api/restaurants` | Retrieve restaurant data. |
| `GET` | `/api/orders` | Retrieve the signed-in user's orders; authentication is required. |

Order creation is implemented in the app. Confirm the exact method and route in your backend route files before documenting or calling it directly.

### Quick checks

With the backend running, open:

- `http://localhost:3000/api/health`
- `http://localhost:3000/api/restaurants`

The orders endpoint requires authentication, so opening it directly in a browser may not return the user's order history.

## Security Notes

- Do not commit `.env` files or publish MongoDB credentials, JWT secrets, or payment gateway secrets.
- Use a strong, unique JWT secret.
- Validate input and enforce permissions on the backend.
- Before public deployment, configure HTTPS, production CORS rules, secure environment variables, and appropriate error handling.

A basic `.gitignore` should include:

```gitignore
node_modules/
.env
.env.*
!.env.example
dist/
build/
```

Review this list against your project before committing.

## Roadmap

- [ ] Live order tracking with a status timeline
- [ ] Restaurant/admin order management dashboard
- [ ] Secure order acceptance, rejection, and status updates
- [ ] Cash on Delivery flow
- [ ] Test-mode UPI/card gateway integration
- [ ] Production payment verification and webhook handling
- [ ] Automated tests and deployment

## Contributing

This is a learning project. Create a branch for your changes and open a pull request with a short description of the work.

## License

No license has been selected yet. Add a `LICENSE` file and update this section before allowing others to reuse or distribute the project.
