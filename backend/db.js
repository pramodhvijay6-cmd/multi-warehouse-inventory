// Mock In-Memory Database for Multi-Warehouse Inventory Allocation Engine

let products = {
  "SKU-1001": { sku: "SKU-1001", name: "Laser Printer", threshold: 10, reorderQty: 25, weight: 8.5 },
  "SKU-1002": { sku: "SKU-1002", name: "Office Chair", threshold: 5, reorderQty: 15, weight: 15.0 },
  "SKU-1003": { sku: "SKU-1003", name: "Wireless Mouse", threshold: 15, reorderQty: 40, weight: 0.2 },
  "SKU-1004": { sku: "SKU-1004", name: "Standing Desk", threshold: 4, reorderQty: 10, weight: 28.0 }
};

let warehouses = {
  "WH-SEA": {
    code: "WH-SEA",
    name: "Seattle Warehouse",
    x: 10,
    y: 90,
    maxCapacity: 5,
    currentAllocations: 0,
    inventory: {
      "SKU-1001": 20,
      "SKU-1002": 10,
      "SKU-1003": 35,
      "SKU-1004": 5
    }
  },
  "WH-MIA": {
    code: "WH-MIA",
    name: "Miami Fulfillment Center",
    x: 90,
    y: 10,
    maxCapacity: 5,
    currentAllocations: 0,
    inventory: {
      "SKU-1001": 15,
      "SKU-1002": 8,
      "SKU-1003": 25,
      "SKU-1004": 4
    }
  },
  "WH-CHI": {
    code: "WH-CHI",
    name: "Chicago Hub",
    x: 50,
    y: 50,
    maxCapacity: 8,
    currentAllocations: 0,
    inventory: {
      "SKU-1001": 30,
      "SKU-1002": 15,
      "SKU-1003": 50,
      "SKU-1004": 8
    }
  }
};

let orders = [];
let replenishmentLogs = [];

const initialWarehouses = JSON.stringify(warehouses);
const initialProducts = JSON.stringify(products);

function getProducts() {
  return products;
}

function getWarehouses() {
  return warehouses;
}

function getOrders() {
  return orders;
}

function getReplenishmentLogs() {
  return replenishmentLogs;
}

function addOrder(order) {
  orders.push(order);
}

function addReplenishmentLog(log) {
  replenishmentLogs.push({
    id: `REP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    ...log
  });
}

function resetDb() {
  warehouses = JSON.parse(initialWarehouses);
  products = JSON.parse(initialProducts);
  orders = [];
  replenishmentLogs = [];
}

module.exports = {
  getProducts,
  getWarehouses,
  getOrders,
  getReplenishmentLogs,
  addOrder,
  addReplenishmentLog,
  resetDb
};
