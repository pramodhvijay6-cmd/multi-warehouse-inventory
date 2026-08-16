const request = require("supertest");
const app = require("../server");
const db = require("../db");

describe("Inventory API Integration Tests", () => {
  beforeEach(() => {
    db.resetDb();
  });

  test("GET /api/inventory fetches current stock and state", async () => {
    const res = await request(app)
      .get("/api/inventory")
      .expect(200);

    expect(res.body.warehouses).toBeDefined();
    expect(res.body.products).toBeDefined();
    expect(res.body.replenishmentLogs).toBeDefined();
    expect(res.body.orders).toBeDefined();
  });

  test("POST /api/orders successfully places valid order", async () => {
    const payload = {
      customerName: "API Tester",
      coordinates: { x: 10, y: 90 },
      items: [{ sku: "SKU-1001", quantity: 1 }]
    };

    const res = await request(app)
      .post("/api/orders")
      .send(payload)
      .expect(201);

    expect(res.body.message).toBe("Order processed successfully");
    expect(res.body.fulfillment.status).toBe("Fulfilled");
    expect(res.body.fulfillment.shipments[0].warehouseCode).toBe("WH-SEA");
  });

  test("POST /api/orders rejects invalid coordinate inputs", async () => {
    const payload = {
      customerName: "API Tester",
      coordinates: { x: -10, y: 90 },
      items: [{ sku: "SKU-1001", quantity: 1 }]
    };

    const res = await request(app)
      .post("/api/orders")
      .send(payload)
      .expect(400);

    expect(res.body.error).toBeDefined();
  });

  test("POST /api/reset blocks requests without admin headers", async () => {
    await request(app)
      .post("/api/reset")
      .expect(403);
  });

  test("POST /api/reset permits requests with admin headers and clears database", async () => {
    // Modify database first
    const warehouses = db.getWarehouses();
    warehouses["WH-SEA"].inventory["SKU-1001"] = 0;

    await request(app)
      .post("/api/reset")
      .set("x-auth-role", "admin")
      .expect(200);

    // Verify database reset
    const refreshedRes = await request(app).get("/api/inventory");
    expect(refreshedRes.body.warehouses["WH-SEA"].inventory["SKU-1001"]).toBe(20);
  });
});
