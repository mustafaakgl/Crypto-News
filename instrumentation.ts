// This exact `=== "nodejs"` check is what lets Next drop the import from its
// Edge build; the collector itself uses Node-only modules (node:sqlite).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation-node");
  }
}
