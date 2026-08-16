// Business Logic for Multi-Warehouse Inventory Allocation Engine

// Calculate Euclidean distance between two coordinates
function calculateDistance(coord1, coord2) {
  const dx = coord1.x - coord2.x;
  const dy = coord1.y - coord2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// Core allocation logic
function allocateOrder(order, db) {
  const products = db.getProducts();
  const warehouses = db.getWarehouses();

  // 1. Input Validation
  if (!order.customerName || typeof order.customerName !== "string" || order.customerName.trim() === "") {
    throw new Error("Invalid customer name");
  }
  if (!order.coordinates || typeof order.coordinates.x !== "number" || typeof order.coordinates.y !== "number") {
    throw new Error("Invalid customer coordinates");
  }
  if (order.coordinates.x < 0 || order.coordinates.x > 100 || order.coordinates.y < 0 || order.coordinates.y > 100) {
    throw new Error("Coordinates must be between 0 and 100");
  }
  if (!Array.isArray(order.items) || order.items.length === 0) {
    throw new Error("Order must contain at least one item");
  }

  for (const item of order.items) {
    if (!products[item.sku]) {
      throw new Error(`Product SKU ${item.sku} does not exist`);
    }
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new Error(`Quantity for SKU ${item.sku} must be a positive integer`);
    }
  }

  // 2. Identify available warehouses (those with daily allocation capacity remaining)
  const availableWarehouses = Object.values(warehouses).filter(wh => {
    // If order is VIP, it might skip capacity check (this is reserved for Stage 3 AI Loop!)
    // For now, we apply capacity constraints strictly to everyone.
    const hasCapacity = order.shippingTier === "VIP" || wh.currentAllocations < wh.maxCapacity;
    return hasCapacity;
  });

  // Calculate distance to each warehouse
  const warehousesWithDistance = availableWarehouses.map(wh => ({
    wh,
    distance: calculateDistance(order.coordinates, { x: wh.x, y: wh.y })
  }));

  // Sort by distance (closest first)
  warehousesWithDistance.sort((a, b) => a.distance - b.distance);

  const orderFulfillment = {
    orderId: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    customerName: order.customerName,
    coordinates: order.coordinates,
    shippingTier: order.shippingTier || "Standard",
    timestamp: new Date().toISOString(),
    items: order.items.map(item => ({ sku: item.sku, quantity: item.quantity })),
    shipments: [], // list of allocations { warehouseCode, items: { sku, quantity } }
    status: "Pending"
  };

  // We check if we can fulfill the ENTIRE order from the single closest warehouse
  let singleWarehouseFulfilled = false;

  for (const whWithDist of warehousesWithDistance) {
    const wh = whWithDist.wh;
    let canFulfillAll = true;

    for (const item of order.items) {
      const stock = wh.inventory[item.sku] || 0;
      if (stock < item.quantity) {
        canFulfillAll = false;
        break;
      }
    }

    if (canFulfillAll) {
      // Allocate all items to this warehouse
      const shipmentItems = [];
      for (const item of order.items) {
        wh.inventory[item.sku] -= item.quantity;
        shipmentItems.push({ sku: item.sku, quantity: item.quantity });
        // Check replenishment trigger
        checkReplenishment(wh, item.sku, db);
      }

      wh.currentAllocations += 1;
      orderFulfillment.shipments.push({
        warehouseCode: wh.code,
        distance: parseFloat(whWithDist.distance.toFixed(2)),
        items: shipmentItems
      });
      orderFulfillment.status = "Fulfilled";
      singleWarehouseFulfilled = true;
      break;
    }
  }

  // If not fulfilled by a single warehouse, try splitting across at most 2 warehouses
  if (!singleWarehouseFulfilled && warehousesWithDistance.length >= 2) {
    // We try to split across the closest two warehouses that have stock combined
    // Let's iterate through all pairs of warehouses to find one that can fulfill the order
    let foundSplitPair = false;

    for (let i = 0; i < warehousesWithDistance.length; i++) {
      for (let j = i + 1; j < warehousesWithDistance.length; j++) {
        const w1 = warehousesWithDistance[i].wh;
        const w2 = warehousesWithDistance[j].wh;
        let canFulfillCombined = true;

        for (const item of order.items) {
          const stock1 = w1.inventory[item.sku] || 0;
          const stock2 = w2.inventory[item.sku] || 0;
          if (stock1 + stock2 < item.quantity) {
            canFulfillCombined = false;
            break;
          }
        }

        if (canFulfillCombined) {
          // Perform the split allocation between w1 and w2
          const w1Shipment = { warehouseCode: w1.code, distance: parseFloat(warehousesWithDistance[i].distance.toFixed(2)), items: [] };
          const w2Shipment = { warehouseCode: w2.code, distance: parseFloat(warehousesWithDistance[j].distance.toFixed(2)), items: [] };

          for (const item of order.items) {
            const stock1 = w1.inventory[item.sku] || 0;
            if (stock1 >= item.quantity) {
              w1.inventory[item.sku] -= item.quantity;
              w1Shipment.items.push({ sku: item.sku, quantity: item.quantity });
              checkReplenishment(w1, item.sku, db);
            } else {
              // Allocate remaining from w2
              if (stock1 > 0) {
                w1.inventory[item.sku] = 0;
                w1Shipment.items.push({ sku: item.sku, quantity: stock1 });
                checkReplenishment(w1, item.sku, db);
              }
              const remaining = item.quantity - stock1;
              w2.inventory[item.sku] -= remaining;
              w2Shipment.items.push({ sku: item.sku, quantity: remaining });
              checkReplenishment(w2, item.sku, db);
            }
          }

          w1.currentAllocations += 1;
          w2.currentAllocations += 1;

          if (w1Shipment.items.length > 0) orderFulfillment.shipments.push(w1Shipment);
          if (w2Shipment.items.length > 0) orderFulfillment.shipments.push(w2Shipment);

          orderFulfillment.status = "Fulfilled";
          foundSplitPair = true;
          break;
        }
      }
      if (foundSplitPair) break;
    }
  }

  // If still not fulfilled (or if there are not enough warehouses with combined stock),
  // we do a best-effort split across the top 2 warehouses and mark unfulfilled items as Backordered.
  if (orderFulfillment.status === "Pending") {
    const unfulfilledItems = [];
    const shipmentsMap = {};

    // Allocate best effort from the closest 2 warehouses
    const limitWarehouses = warehousesWithDistance.slice(0, 2);

    for (const item of order.items) {
      let remainingQty = item.quantity;

      for (const whWithDist of limitWarehouses) {
        const wh = whWithDist.wh;
        const stock = wh.inventory[item.sku] || 0;

        if (stock > 0 && remainingQty > 0) {
          const allocated = Math.min(stock, remainingQty);
          wh.inventory[item.sku] -= allocated;
          remainingQty -= allocated;

          if (!shipmentsMap[wh.code]) {
            shipmentsMap[wh.code] = {
              warehouseCode: wh.code,
              distance: parseFloat(whWithDist.distance.toFixed(2)),
              items: []
            };
            wh.currentAllocations += 1;
          }

          shipmentsMap[wh.code].items.push({ sku: item.sku, quantity: allocated });
          checkReplenishment(wh, item.sku, db);
        }
      }

      if (remainingQty > 0) {
        unfulfilledItems.push({ sku: item.sku, quantity: remainingQty });
      }
    }

    orderFulfillment.shipments = Object.values(shipmentsMap);

    if (unfulfilledItems.length > 0) {
      orderFulfillment.backorderedItems = unfulfilledItems;
      // If we fulfilled part of it, status is Partially Fulfilled, otherwise Backordered
      const totalFulfilled = orderFulfillment.shipments.reduce(
        (sum, s) => sum + s.items.reduce((itemSum, i) => itemSum + i.quantity, 0),
        0
      );
      orderFulfillment.status = totalFulfilled > 0 ? "Partially Fulfilled" : "Backordered";
    } else {
      orderFulfillment.status = "Fulfilled";
    }
  }

  db.addOrder(orderFulfillment);
  return orderFulfillment;
}

// Function to handle auto-replenishment checking
function checkReplenishment(warehouse, sku, db) {
  const products = db.getProducts();
  const product = products[sku];
  const currentStock = warehouse.inventory[sku] || 0;

  if (currentStock <= product.threshold) {
    const reorderQty = product.reorderQty;
    warehouse.inventory[sku] += reorderQty;
    db.addReplenishmentLog({
      warehouseCode: warehouse.code,
      sku: sku,
      triggerStock: currentStock,
      replenishedQuantity: reorderQty,
      newStock: warehouse.inventory[sku]
    });
  }
}

module.exports = {
  calculateDistance,
  allocateOrder,
  checkReplenishment
};
