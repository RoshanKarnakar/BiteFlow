
require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db");

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await connectDB();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`BiteFlow API listening on ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start BiteFlow:", error.message);
    process.exit(1);
  }
}

startServer();
