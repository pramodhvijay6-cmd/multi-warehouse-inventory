const express = require("express");
const cors = require("cors");
const db = require("./db");
const { allocateOrder } = require("./allocationEngine");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Mock Auth Middleware
// Checks for basic authentication for administrative controls (like reset or manual replenishment)
function requireAdmin(req, res, next) {
  const authRole = req.headers["x-auth-role"];
  if (authRole !== "admin") {
    return res.status(403).json({ error: "Access Denied: Admin authorization required" });
  }
  next();
}

// 1. Get current system state
app.get("/api/inventory", (req, res) => {
  try {
    res.json({
      warehouses: db.getWarehouses(),
      products: db.getProducts(),
      replenishmentLogs: db.getReplenishmentLogs(),
      orders: db.getOrders()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Submit an order
app.post("/api/orders", (req, res) => {
  try {
    const orderData = req.body;
    const fulfillment = allocateOrder(orderData, db);
    res.status(201).json({
      message: "Order processed successfully",
      fulfillment
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 3. Get order history
app.get("/api/orders", (req, res) => {
  try {
    res.json(db.getOrders());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Get replenishment log history
app.get("/api/replenishment-logs", (req, res) => {
  try {
    res.json(db.getReplenishmentLogs());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Admin reset database endpoint
app.post("/api/reset", requireAdmin, (req, res) => {
  try {
    db.resetDb();
    res.json({ message: "Database reset to seed data successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start Express Server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Inventory Engine server running on port ${PORT}`);
  });
}

module.exports = app; // Export for testing
