// Script to restore the allocation engine code back to its original healthy state
const fs = require("fs");
const path = require("path");

const enginePath = path.join(__dirname, "../backend/allocationEngine.js");

console.log("Restoring original allocation engine code...");

try {
  let code = fs.readFileSync(enginePath, "utf8");

  if (!code.includes("return 0; // Injected Bug for Red Run")) {
    console.log("Code is already in a healthy state (no bug detected).");
    process.exit(0);
  }

  // Restore the proximity distance calculation
  const restoredCode = code.replace(
    "return 0; // Injected Bug for Red Run",
    "return Math.sqrt(dx * dx + dy * dy);"
  );

  fs.writeFileSync(enginePath, restoredCode, "utf8");
  console.log("Successfully restored backend/allocationEngine.js to healthy state.");
} catch (err) {
  console.error("Failed to restore code:", err.message);
  process.exit(1);
}
