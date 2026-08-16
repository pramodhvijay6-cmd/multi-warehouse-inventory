import React, { useState, useEffect, useRef } from "react";
import "./App.css";

const BACKEND_URL = "http://localhost:5000";

function App() {
  // State from backend
  const [warehouses, setWarehouses] = useState({});
  const [products, setProducts] = useState({});
  const [replenishmentLogs, setReplenishmentLogs] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [customerName, setCustomerName] = useState("");
  const [coordX, setCoordX] = useState(50);
  const [coordY, setCoordY] = useState(50);
  const [shippingTier, setShippingTier] = useState("Standard");
  const [itemQuantities, setItemQuantities] = useState({});

  // System notification logs for UI display
  const [systemLogs, setSystemLogs] = useState([]);

  const canvasRef = useRef(null);

  // Load database state
  const fetchState = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/inventory`);
      if (!res.ok) throw new Error("Server not responding");
      const data = await res.json();
      setWarehouses(data.warehouses);
      setProducts(data.products);
      setReplenishmentLogs(data.replenishmentLogs);
      setOrders(data.orders);
    } catch (err) {
      console.error("Error fetching state:", err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Poll server state every 2 seconds for responsiveness
  useEffect(() => {
    fetchState(true);
    const interval = setInterval(() => {
      fetchState(false);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Update logs local representation whenever backend replenishment logs or orders change
  useEffect(() => {
    const logs = [];

    // Add orders to logs
    orders.forEach(order => {
      let detail = `Order ${order.orderId} placed by ${order.customerName} (Status: ${order.status}). `;
      if (order.shipments && order.shipments.length > 0) {
        detail += "Routed via: " + order.shipments.map(s => `${s.warehouseCode} (${s.distance} units away)`).join(", ");
      }
      if (order.backorderedItems && order.backorderedItems.length > 0) {
        detail += `. Backordered SKUs: ${order.backorderedItems.map(i => `${i.sku} (Qty: ${i.quantity})`).join(", ")}`;
      }

      logs.push({
        id: order.orderId,
        type: order.shippingTier === "VIP" ? "vip" : "fulfillment",
        timestamp: order.timestamp,
        title: order.shippingTier === "VIP" ? "★ VIP ORDER ROUTED" : "ORDER FULLFILLED",
        message: detail
      });
    });

    // Add Replenishments to logs
    replenishmentLogs.forEach(rep => {
      logs.push({
        id: rep.id,
        type: "replenishment",
        timestamp: rep.timestamp,
        title: "⚡ AUTO-REPLENISHMENT TRIGGERED",
        message: `${rep.warehouseCode} inventory for SKU ${rep.sku} fell below threshold (Current: ${rep.triggerStock}). Restocking +${rep.replenishedQuantity} (New stock: ${rep.newStock})`
      });
    });

    // Sort by timestamp desc
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    setSystemLogs(logs);
  }, [orders, replenishmentLogs]);

  // Initialized itemQuantities when products load
  useEffect(() => {
    if (Object.keys(products).length > 0) {
      const initial = {};
      Object.keys(products).forEach(sku => {
        initial[sku] = 0;
      });
      setItemQuantities(initial);
    }
  }, [products]);

  // Handle drawing the 2D Coordinate Grid
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const size = canvas.width; // 250px

    // Clear Canvas
    ctx.clearRect(0, 0, size, size);

    // Draw Grid Lines (10x10 divisions)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    const divisions = 10;
    for (let i = 0; i <= divisions; i++) {
      const pos = (i / divisions) * size;
      // Verticals
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, size);
      ctx.stroke();
      // Horizontals
      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(size, pos);
      ctx.stroke();
    }

    // Draw Warehouses
    Object.values(warehouses).forEach(wh => {
      // Coordinate y on grid goes 0-100 from top to bottom, let's plot
      const wx = (wh.x / 100) * size;
      const wy = (1 - wh.y / 100) * size; // flip y so 100 is top

      // Draw pulse glow
      ctx.fillStyle = "rgba(56, 189, 248, 0.15)";
      ctx.beginPath();
      ctx.arc(wx, wy, 15, 0, Math.PI * 2);
      ctx.fill();

      // Draw warehouse dot
      ctx.fillStyle = wh.currentAllocations >= wh.maxCapacity ? "#ef4444" : "#38bdf8";
      ctx.beginPath();
      ctx.arc(wx, wy, 6, 0, Math.PI * 2);
      ctx.fill();

      // Label
      ctx.fillStyle = "#94a3b8";
      ctx.font = "bold 9px Outfit, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${wh.code}`, wx, wy - 10);
      ctx.font = "8px Outfit, sans-serif";
      ctx.fillText(`(${wh.currentAllocations}/${wh.maxCapacity})`, wx, wy + 15);
    });

    // Draw Current Selected Customer Coordinates
    const cx = (coordX / 100) * size;
    const cy = (1 - coordY / 100) * size;

    // Pulse target ring
    ctx.strokeStyle = shippingTier === "VIP" ? "#fbbf24" : "#a78bfa";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.stroke();

    // Crosshair target center
    ctx.fillStyle = shippingTier === "VIP" ? "#fbbf24" : "#a78bfa";
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();
  }, [warehouses, coordX, coordY, shippingTier]);

  // Handle Canvas click coordinates mapping
  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const xClick = e.clientX - rect.left;
    const yClick = e.clientY - rect.top;
    const size = canvas.width;

    // Convert pixel to grid (0-100)
    const gx = Math.round((xClick / size) * 100);
    const gy = Math.round((1 - yClick / size) * 100);

    // Keep within bounds
    setCoordX(Math.max(0, Math.min(100, gx)));
    setCoordY(Math.max(0, Math.min(100, gy)));
  };

  const handleQtyChange = (sku, val) => {
    const qty = parseInt(val) || 0;
    setItemQuantities(prev => ({
      ...prev,
      [sku]: Math.max(0, qty)
    }));
  };

  // Submit Order logic
  const handlePlaceOrder = async (e) => {
    e.preventDefault();

    // Build items payload
    const items = Object.entries(itemQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([sku, qty]) => ({ sku, quantity: qty }));

    if (items.length === 0) {
      alert("Please select at least one product with a quantity greater than zero.");
      return;
    }

    const payload = {
      customerName: customerName || "Anonymous Customer",
      coordinates: { x: Number(coordX), y: Number(coordY) },
      shippingTier,
      items
    };

    try {
      const res = await fetch(`${BACKEND_URL}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to route order");
      }

      // Reset form
      setCustomerName("");
      const cleared = {};
      Object.keys(products).forEach(sku => { cleared[sku] = 0; });
      setItemQuantities(cleared);

      // Refresh DB state immediately
      fetchState();
    } catch (err) {
      alert(`Fulfillment Error: ${err.message}`);
    }
  };

  // Admin Database Reset
  const handleResetDb = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/reset`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-auth-role": "admin" // Mock Auth Header
        }
      });
      if (res.ok) {
        fetchState();
        alert("System successfully reset to default seed data.");
      } else {
        const data = await res.json();
        alert(`Reset failed: ${data.error}`);
      }
    } catch (err) {
      alert(`Error connecting to server reset: ${err.message}`);
    }
  };

  return (
    <div className="app-container">
      {/* Header Panel */}
      <header className="app-header">
        <div className="header-title-section">
          <h1>
            <span style={{ color: "var(--primary)" }}>Vanguard</span> Logistics Engine
          </h1>
          <div className="header-subtitle">
            Geographical proximity-based multi-warehouse allocation optimizer
          </div>
        </div>
        <div className="header-actions">
          <div className="status-badge">
            <div className="status-dot"></div>
            System Active
          </div>
          <button className="btn-reset" onClick={handleResetDb}>
            Reset Database
          </button>
        </div>
      </header>

      {loading ? (
        <div style={{ textAlign: "center", color: "#64748b", padding: "4rem" }}>
          <h2>Connecting to Stock Allocation Server...</h2>
        </div>
      ) : (
        <>
          {/* Warehouse State Grid */}
          <section className="warehouse-grid">
            {Object.values(warehouses).map(wh => {
              const capPercentage = (wh.currentAllocations / wh.maxCapacity) * 100;
              const isFull = wh.currentAllocations >= wh.maxCapacity;

              return (
                <div key={wh.code} className="warehouse-card" style={isFull ? { borderColor: "rgba(239, 68, 68, 0.4)" } : {}}>
                  <div className="warehouse-header">
                    <div className="wh-info">
                      <h2>{wh.name}</h2>
                      <span className="wh-code-badge">{wh.code}</span>
                    </div>
                    <div className="wh-coords">
                      📍 ({wh.x}, {wh.y})
                    </div>
                  </div>

                  <div className="capacity-container">
                    <div className="capacity-text">
                      <span>Daily Processing Capacity</span>
                      <span style={{ color: isFull ? "var(--danger)" : "var(--success)" }}>
                        {wh.currentAllocations} / {wh.maxCapacity} allocations
                      </span>
                    </div>
                    <div className="capacity-bar-bg">
                      <div
                        className="capacity-bar-fill"
                        style={{
                          width: `${capPercentage}%`,
                          backgroundColor: isFull ? "var(--danger)" : capPercentage > 75 ? "var(--warning)" : "var(--success)"
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className="inventory-section">
                    <h3>Available Inventory</h3>
                    <div className="inventory-list">
                      {Object.entries(wh.inventory).map(([sku, stock]) => {
                        const product = products[sku] || { threshold: 5 };
                        const isUnderThreshold = stock <= product.threshold;
                        const isRecentlyReplenished = stock > 20 && replenishmentLogs.some(log => log.warehouseCode === wh.code && log.sku === sku);

                        let pillClass = "healthy";
                        let pillText = "HEALTHY";
                        if (isUnderThreshold) {
                          pillClass = "warning";
                          pillText = "LOW STOCK";
                        } else if (isRecentlyReplenished) {
                          pillClass = "replenished";
                          pillText = "AUTO-RESTOCKED";
                        }

                        return (
                          <div key={sku} className="inventory-row">
                            <div>
                              <span className="item-name">{product.name || sku}</span>
                              <span className="item-sku" style={{ marginLeft: "0.5rem" }}>{sku}</span>
                            </div>
                            <div className="stock-status">
                              <span className="stock-qty" style={{ color: isUnderThreshold ? "var(--warning)" : "white" }}>
                                {stock} units
                              </span>
                              <span className={`stock-pill ${pillClass}`}>{pillText}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </section>

          {/* Interactive Area */}
          <section className="interaction-area">
            {/* Order Placement Form */}
            <div className="panel">
              <div className="panel-title">
                <span>Configure & Dispatch Order</span>
              </div>
              <form className="order-setup-layout" onSubmit={handlePlaceOrder}>
                <div className="order-inputs">
                  <div className="form-group">
                    <label>Customer Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Acme Corp"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Fulfillment Coordinates (X, Y)</label>
                    <div className="coord-inputs">
                      <input
                        type="number"
                        className="form-input"
                        value={coordX}
                        min="0"
                        max="100"
                        onChange={(e) => setCoordX(Math.max(0, Math.min(100, Number(e.target.value))))}
                        placeholder="X"
                        required
                      />
                      <input
                        type="number"
                        className="form-input"
                        value={coordY}
                        min="0"
                        max="100"
                        onChange={(e) => setCoordY(Math.max(0, Math.min(100, Number(e.target.value))))}
                        placeholder="Y"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Shipping Tier</label>
                    <select
                      className="form-select"
                      value={shippingTier}
                      onChange={(e) => setShippingTier(e.target.value)}
                    >
                      <option value="Standard">Standard Tier (Enforces Capacity)</option>
                      <option value="VIP">VIP Tier (Bypasses Capacity Constraints)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Select Items</label>
                    <table className="items-table">
                      <thead>
                        <tr>
                          <th>SKU / Product</th>
                          <th style={{ textAlign: "center" }}>Qty</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.values(products).map(prod => (
                          <tr key={prod.sku}>
                            <td style={{ color: "#cbd5e1", fontSize: "0.85rem" }}>
                              <strong>{prod.sku}</strong> - {prod.name}
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <input
                                type="number"
                                className="qty-input"
                                min="0"
                                value={itemQuantities[prod.sku] || 0}
                                onChange={(e) => handleQtyChange(prod.sku, e.target.value)}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <button type="submit" className={`btn-submit ${shippingTier === "VIP" ? "vip-selected" : ""}`}>
                    {shippingTier === "VIP" ? "★ Dispatch VIP Order" : "Dispatch Order"}
                  </button>
                </div>

                <div className="map-canvas-container">
                  <span className="canvas-label">
                    Click Grid Map below to set Customer Coordinates:
                  </span>
                  <canvas
                    ref={canvasRef}
                    width={220}
                    height={220}
                    className="grid-canvas"
                    onClick={handleCanvasClick}
                  />
                  <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                    Selected Customer Location: <strong style={{ color: shippingTier === "VIP" ? "#fbbf24" : "var(--primary)" }}>({coordX}, {coordY})</strong>
                  </div>
                </div>
              </form>
            </div>

            {/* System Log History Panel */}
            <div className="panel">
              <div className="panel-title">
                <span>System Operations Logs</span>
              </div>
              <div className="logs-container">
                {systemLogs.length === 0 ? (
                  <div className="empty-logs">No operations recorded yet. Submit an order above to start.</div>
                ) : (
                  systemLogs.map(log => (
                    <div key={log.id} className={`log-item ${log.type} ${log.type === "vip" ? "vip" : ""}`}>
                      <div className="log-header">
                        <span style={{ fontWeight: 600 }}>{log.title}</span>
                        <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <div className="log-body">{log.message}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          {/* Orders History Table */}
          <section className="panel orders-panel">
            <div className="panel-title">
              Order Allocation History
            </div>
            <div className="orders-table-wrapper">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer Name</th>
                    <th>Destination</th>
                    <th>Tier</th>
                    <th>Status</th>
                    <th>Shipment Allocations</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", color: "#64748b", padding: "1.5rem" }}>
                        No orders dispatched yet.
                      </td>
                    </tr>
                  ) : (
                    [...orders].reverse().map(order => (
                      <tr key={order.orderId}>
                        <td style={{ fontFamily: "monospace", color: "#38bdf8", fontWeight: 600 }}>{order.orderId}</td>
                        <td>{order.customerName}</td>
                        <td>📍 ({order.coordinates.x}, {order.coordinates.y})</td>
                        <td>
                          <span className={`tier-badge ${order.shippingTier.toLowerCase()}`}>
                            {order.shippingTier}
                          </span>
                        </td>
                        <td>
                          <span className={`badge-status ${order.status.toLowerCase().replace(" ", "-")}`}>
                            {order.status}
                          </span>
                        </td>
                        <td>
                          <div className="order-splits">
                            {order.shipments.map((s, idx) => (
                              <div key={idx} className="split-tag">
                                <span className="wh-code">{s.warehouseCode}</span>
                                <span>({s.distance} units away)</span>
                                <span className="split-items">
                                  fulfilled [{s.items.map(i => `${i.sku} x${i.quantity}`).join(", ")}]
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default App;
