# Vanguard Logistics — Multi-Warehouse Inventory Allocation Engine

A smart inventory allocation system that routes orders to the nearest warehouse based on distance, stock levels, and daily capacity limits — with automatic replenishment and split-shipment support.

## Features

- **Proximity-Based Routing** — Orders are fulfilled from the closest warehouse using Euclidean distance
- **Split Shipments** — If one warehouse can't fulfill the order, it splits across up to 2 warehouses
- **Capacity Management** — Each warehouse has a daily order limit; full warehouses are skipped
- **VIP Tier** — VIP orders bypass capacity constraints and always get the nearest warehouse
- **Auto-Replenishment** — Stock that drops below safety thresholds is automatically restocked
- **Backorder Handling** — Unfulfillable items are flagged as backordered
- **Interactive Dashboard** — React UI with live stock gauges, clickable coordinate map, and real-time logs

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite |
| Backend | Node.js + Express |
| Testing | Jest + Supertest |
| Styling | Vanilla CSS (Glassmorphic dark theme) |

