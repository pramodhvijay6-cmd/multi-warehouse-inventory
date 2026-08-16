const db = require("../db");
const { allocateOrder, calculateDistance } = require("../allocationEngine");

describe("Allocation Engine Unit Tests", () => {
  beforeEach(() => {
    db.resetDb();
  });

  test("Distance calculation helper works as expected", () => {
    const p1 = { x: 0, y: 0 };
    const p2 = { x: 3, y: 4 };
    expect(calculateDistance(p1, p2)).toBe(5);
  });

  test("Fulfills order from the closest warehouse when stock is available", () => {
    // Customer at (15, 85) is closest to WH-SEA (10, 90)
    const order = {
      customerName: "Alice Smith",
      coordinates: { x: 15, y: 85 },
      items: [{ sku: "SKU-1001", quantity: 2 }]
    };

    const res = allocateOrder(order, db);

    expect(res.status).toBe("Fulfilled");
    expect(res.shipments.length).toBe(1);
    expect(res.shipments[0].warehouseCode).toBe("WH-SEA");
    expect(res.shipments[0].items[0].quantity).toBe(2);

    // Check inventory update
    const warehouses = db.getWarehouses();
    expect(warehouses["WH-SEA"].inventory["SKU-1001"]).toBe(18); // 20 - 2 = 18
  });

  test("Splits order across 2 warehouses when single warehouse lacks stock", () => {
    // Customer at (45, 55) is closest to WH-CHI (50, 50), then WH-SEA (10, 90)
    // WH-CHI has 30 of SKU-1001. Let's order 35.
    const order = {
      customerName: "Bob Johnson",
      coordinates: { x: 45, y: 55 },
      items: [{ sku: "SKU-1001", quantity: 35 }]
    };

    const res = allocateOrder(order, db);

    expect(res.status).toBe("Fulfilled");
    expect(res.shipments.length).toBe(2);
    
    // WH-CHI (closest) should fulfill 30, WH-SEA (second closest) should fulfill remaining 5
    const chiShipment = res.shipments.find(s => s.warehouseCode === "WH-CHI");
    const seaShipment = res.shipments.find(s => s.warehouseCode === "WH-SEA");

    expect(chiShipment).toBeDefined();
    expect(seaShipment).toBeDefined();
    expect(chiShipment.items[0].quantity).toBe(30);
    expect(seaShipment.items[0].quantity).toBe(5);
  });

  test("Enforces daily capacity constraint and skips full warehouse", () => {
    const warehouses = db.getWarehouses();
    // Fill WH-SEA allocations to max
    warehouses["WH-SEA"].currentAllocations = warehouses["WH-SEA"].maxCapacity;

    // Customer is at (15, 85) - closest to WH-SEA, but it's full. Next is WH-CHI.
    const order = {
      customerName: "Charlie Brown",
      coordinates: { x: 15, y: 85 },
      items: [{ sku: "SKU-1001", quantity: 5 }]
    };

    const res = allocateOrder(order, db);

    expect(res.status).toBe("Fulfilled");
    expect(res.shipments.length).toBe(1);
    expect(res.shipments[0].warehouseCode).toBe("WH-CHI"); // Routes to Chicago instead
    expect(warehouses["WH-SEA"].inventory["SKU-1001"]).toBe(20); // SEA inventory remains unchanged
  });

  test("Triggers auto-replenishment when stock drops below threshold", () => {
    const warehouses = db.getWarehouses();
    // WH-SEA stock for SKU-1001 starts at 20. Reorder threshold is 10. Reorder Qty is 25.
    // Ordering 11 units will drop stock to 9, triggering replenishment to 9 + 25 = 34.
    const order = {
      customerName: "Diana Prince",
      coordinates: { x: 12, y: 88 },
      items: [{ sku: "SKU-1001", quantity: 11 }]
    };

    const res = allocateOrder(order, db);

    expect(res.status).toBe("Fulfilled");
    expect(warehouses["WH-SEA"].inventory["SKU-1001"]).toBe(34); // 20 - 11 + 25 = 34
    
    const logs = db.getReplenishmentLogs();
    expect(logs.length).toBe(1);
    expect(logs[0].warehouseCode).toBe("WH-SEA");
    expect(logs[0].sku).toBe("SKU-1001");
    expect(logs[0].replenishedQuantity).toBe(25);
  });

  test("Puts order in partially fulfilled/backordered status when stock is unavailable everywhere", () => {
    // Total stock of SKU-1004 (Standing Desk) in all warehouses:
    // WH-SEA (5) + WH-MIA (4) + WH-CHI (8) = 17
    // Order 20 standing desks.
    const order = {
      customerName: "Edward Nygma",
      coordinates: { x: 50, y: 50 },
      items: [{ sku: "SKU-1004", quantity: 20 }]
    };

    const res = allocateOrder(order, db);

    expect(res.status).toBe("Partially Fulfilled");
    expect(res.backorderedItems).toBeDefined();
    expect(res.backorderedItems[0].quantity).toBe(7); // 20 - 13 (allocated from CHI (8) and SEA (5)) = 7 backordered
  });

  test("Fails validation on invalid inputs", () => {
    // Negative quantity
    expect(() => {
      allocateOrder({
        customerName: "X",
        coordinates: { x: 50, y: 50 },
        items: [{ sku: "SKU-1001", quantity: -5 }]
      }, db);
    }).toThrow();

    // Coordinates out of bounds
    expect(() => {
      allocateOrder({
        customerName: "X",
        coordinates: { x: 150, y: 50 },
        items: [{ sku: "SKU-1001", quantity: 5 }]
      }, db);
    }).toThrow();
  });

  test("VIP tier order bypasses daily capacity check and utilizes closest warehouse", () => {
    const warehouses = db.getWarehouses();
    // WH-SEA is closest to (15, 85) but is already at maximum daily capacity
    warehouses["WH-SEA"].currentAllocations = warehouses["WH-SEA"].maxCapacity;

    const vipOrder = {
      customerName: "VIP Corporate Client",
      coordinates: { x: 15, y: 85 },
      shippingTier: "VIP",
      items: [{ sku: "SKU-1001", quantity: 2 }]
    };

    const res = allocateOrder(vipOrder, db);

    expect(res.status).toBe("Fulfilled");
    expect(res.shipments[0].warehouseCode).toBe("WH-SEA"); // Bypassed capacity and got SEA!
    expect(warehouses["WH-SEA"].inventory["SKU-1001"]).toBe(18); // Stock updated correctly
  });

});
