// Script to inject a bug into the allocation engine for Stage 2 (Deliberate Red Run)
const fs = require("fs");
const path = require("path");

const enginePath = path.join(__dirname, "../backend/allocationEngine.js");

console.log("Injecting bug to simulate a test failure (Stage 2: Red Run)...");

try {
  let code = fs.readFileSync(enginePath, "utf8");

  if (code.includes("return 0; // Injected Bug for Red Run")) {
    console.log("Bug is already injected.");
    process.exit(0);
  }

  // Break the proximity distance calculation by returning 0
  const brokenCode = code.replace(
    "return Math.sqrt(dx * dx + dy * dy);",
    "return 0; // Injected Bug for Red Run"
  );

  fs.writeFileSync(enginePath, brokenCode, "utf8");
  console.log("Bug successfully injected into backend/allocationEngine.js.");
  console.log("Run 'npm run test:backend' to execute the test suite and capture the Red Run failures!");
} catch (err) {
  console.error("Failed to inject bug:", err.message);
  process.exit(1);
}
