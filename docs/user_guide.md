# Vanguard Logistics Allocation Engine User Guide
**A Dispatcher's Guide to Multi-Warehouse Logistics Optimizer**

Welcome to the **Vanguard Logistics Allocation Engine** dashboard. This guide walks you through using the application to manage stock, dispatch orders, and monitor auto-replenishment.

---

## 1. Visual Interface Overview

The interface is structured into three zones:

1. **Warehouse Status Grid (Top)**: Cards representing our fulfillment centers (Seattle, Miami, Chicago). Each card contains:
   - Live location coordinates.
   - A **Daily Processing Capacity** gauge displaying order counts (e.g., `2/5 allocations`). A red card indicates the warehouse has reached capacity.
   - An **Available Inventory** list with colored badges:
     - `HEALTHY` (Green): Stock is above safety limits.
     - `LOW STOCK` (Amber): Stock is low and close to safety limits.
     - `AUTO-RESTOCKED` (Pink): Stock dropped low, triggered auto-replenishment, and has been restocked.
2. **Interactive Workspace (Middle)**:
   - **Configure & Dispatch Order (Left)**: Form for creating new fulfillment shipments. Contains a 2D grid canvas where you can click to set coordinates.
   - **System Operations Logs (Right)**: Real-time scrolling feed of order dispatches, split routings, and auto-replenishments.
3. **Order Allocation History (Bottom)**: A detailed log of all historical dispatches, displaying split shipments, distances, and status.

---

## 2. Placing an Order (Step-by-Step)

To route a new order:

1. **Set Name**: Enter a name in the **Customer Name** field (e.g., `Acme Corp`).
2. **Select Destination**:
   - Locate the **Fulfillment Grid Map** on the right side of the form.
   - Click anywhere inside the dark blue grid map to place your target coordinates. The crosshair will update and show the corresponding $(X, Y)$ coordinate values.
   - Alternatively, you can type values directly into the $X$ and $Y$ fields (coordinates must be between 0 and 100).
3. **Select Shipping Tier**:
   - **Standard**: The system enforces daily capacity limits. If the closest warehouse is at maximum allocations, it is bypassed, and the order is routed to the next closest center.
   - **VIP**: The order is flagged to bypass capacity checks. It will always receive stock from the nearest available warehouse, regardless of its daily allocation count.
4. **Choose Quantities**:
   - Scroll the product table and input the desired units for each product (e.g., `5` for Office Chairs).
5. **Submit**: Click the **Dispatch Order** button. The dashboard updates immediately to show warehouse allocations.

---

## 3. Monitoring Auto-Replenishment

The replenishment loop is fully automated:
- If an order reduces stock below a safety threshold (e.g., 10 units for Laser Printers), the system automatically schedules a replenishment order.
- The warehouse is immediately restocked by the reorder quantity (+25 units).
- A pink flashing `AUTO-RESTOCKED` badge will appear on that product, and a log entry is added to the Operations Log. No manual intervention is needed.

---

## 4. Resetting the System

If you wish to reset all stock levels, clear order histories, and return the system to default seed data for demonstration:
1. Locate the **Reset Database** button in the top-right corner of the header.
2. Click the button and confirm the alert. The system makes an authorized admin API call and resets the mock database.
