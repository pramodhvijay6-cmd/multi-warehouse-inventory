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

## Quick Start

```bash
# Install dependencies
npm install
npm install --prefix backend
npm install --prefix frontend

# Run both servers
npm run dev
```

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000

## Run Tests

```bash
npm run test:backend
```

## Project Structure

```
backend/
  ├── server.js              # Express API server
  ├── allocationEngine.js    # Core routing logic
  ├── db.js                  # In-memory database
  └── tests/                 # Jest unit & API tests
frontend/
  └── src/
      ├── App.jsx            # Dashboard UI
      └── App.css            # Styling
scripts/
  ├── simulate_failure.js    # Inject bug for red run demo
  ├── restore_app.js         # Revert injected bug
  └── ai_orchestrator.js     # AI self-healing change loop
docs/
  ├── architecture.md        # System architecture
  ├── design.md              # Data models & API specs
  ├── user_guide.md          # How to use the dashboard
  └── presentation.html      # Interactive slide deck
```

## AI Tools Used

- **Google Antigravity** — Used as the primary AI coding assistant for development
