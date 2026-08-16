# Vanguard Logistics Multi-Warehouse Stock Allocation & Replenishment Optimizer
**Internship Hiring Assessment Submission | Stage 1 - 4 Deliverables**

Vanguard Logistics is a production-grade multi-warehouse stock routing and fulfillment engine. It dynamically optimizes logistics by routing order items based on customer-to-warehouse geographical proximity, stock availability, warehouse daily capacity limits, and handles auto-replenishment tracking with a custom interactive React UI dashboard.

---

## 1. Project Directory Structure

```
├── backend/
│   ├── package.json         # Node/Express dependencies
│   ├── server.js            # Express REST controller & Auth routing middleware
│   ├── db.js                # In-memory mock database layer
│   ├── allocationEngine.js  # Business Logic (Proximity, Split, Capacities, Restock)
│   └── tests/
│       ├── allocation.test.js  # Jest unit tests (proximity, capacity, replenishment)
│       └── api.test.js         # Jest API integration tests & authorization guards
├── frontend/
│   ├── package.json         # React & Vite build configurations
│   ├── index.html
│   ├── src/
│   │   ├── main.jsx         # App entry point
│   │   ├── App.jsx          # Interactive dashboard, map canvas & logs panel
│   │   └── App.css          # Glassmorphic responsive styling & transitions
│   └── vite.config.js
├── docs/
│   ├── architecture.md      # Stage 4: Architecture Document
│   ├── design.md            # Stage 4: Design Document
│   ├── user_guide.md        # Stage 4: User Guide
│   └── presentation.html    # Stage 4: Interactive Slide Presentation (HTML/CSS)
├── scripts/
│   ├── simulate_failure.js  # Stage 2: Bug injector (Proximity return 0 breaker)
│   ├── restore_app.js       # Bug reverser script
│   └── ai_orchestrator.js   # Stage 3: Self-healing AI change loop agent
├── package.json             # Root monorepo coordination
├── ai_change_loop_log.md    # Stage 3: AI Change Loop evidence output file
└── README.md                # This manual
```

---

## 2. Quick Start Guide

### Prerequisites
- Node.js (version 18+)
- npm (version 9+)

### Installation
From the root workspace directory, install all dependencies for workspaces:
```bash
npm run install-all
```

### Running Locally
To launch both the backend API server and frontend dashboard concurrently:
1. Start both servers:
   ```bash
   npm run dev
   ```
2. Open your browser and navigate to the frontend URL printed in the console (usually `http://localhost:5173`).
3. The Express API server will listen on `http://localhost:5000`.

---

## 3. Testing Workflows

### 3.1 Standard Green Suite Run
To verify the entire backend allocation suite passes:
```bash
npm run test:backend
```

### 3.2 Stage 2: Deliberate Red Run Failure
To verify the tests successfully detect software errors and capture a Red Run log:
1. Inject the bug:
   ```bash
   node scripts/simulate_failure.js
   ```
2. Execute the test suite (it will fail with 4 errors in Jest):
   ```bash
   npm run test:backend
   ```
3. Revert the bug and restore healthy operation:
   ```bash
   node scripts/restore_app.js
   ```
4. Verify tests pass again:
   ```bash
   npm run test:backend
   ```

### 3.3 Stage 3: AI Self-Healing Change Loop
To execute the automated AI change loop (which implements the new VIP shipping tier capacity bypass feature):
1. Execute the orchestrator:
   ```bash
   npm run ai-loop
   ```
2. The orchestrator will:
   - Append a new VIP bypass unit test to `allocation.test.js`.
   - Run tests to see the new test fail (Red Run).
   - Apply a patch to `allocationEngine.js` simulating the AI agent's logic.
   - Run tests again, confirming they all pass (Green Run).
   - Write the trace log to `ai_change_loop_log.md` in the root folder.

---

## 4. Ground Rules & Tooling Disclosure

As required by the assessment guidelines, here is the list of AI tools utilized during development:

- **Antigravity (by Google Deepmind)**: Used as the primary pairing software agent to structure files, write algorithms, implement the CSS glassmorphism styling tokens, write testing files, and automate the loop scripts.
- **Jest & Supertest**: Used to compile structural test coverages.
- **Vite & React**: Scaffolder for the interactive map interface.
