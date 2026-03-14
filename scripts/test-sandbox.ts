import { runCode } from "../lib/claude";

async function main() {
  console.log("=== 1. Testing Data Fetch & Visualization ===");
  const vizCode = `
df = get_resources(zip="10001", take=5)
print(f"Loaded {len(df)} resources using custom prelude tool!")
print(df[['name', 'zip']].head())

# Group by zip and visualize
counts = df.groupby('zip').size()
counts.plot(kind='bar', title='Pantries by Zip Code')
plt.xlabel('Zip Code')
plt.ylabel('Count')
plt.tight_layout()
plt.show()  # This should be captured by Anthropic's sandbox backend
print("Plot generated successfully.")
  `.trim();

  try {
    const vizResult = await runCode(vizCode);
    console.log("=== DATA FETCH TEST SUCCESS ===");
    console.log("Images Returned:", vizResult.images.length);
    if (vizResult.images.length > 0) {
      console.log("Extract Base64 Header:", vizResult.images[0].substring(0, 30) + "...");
    }
  } catch (error) {
    console.error("Data Fetch Test Failed:\n", error);
  }

  console.log("\n=== 2. Testing Security Boundary ===");
  const secCode = `
try:
    print("Attempting to fetch Google...")
    res = requests.get("https://google.com")
    print("Google fetched:", res.status_code)
except PermissionError as e:
    print(f"CAUGHT EXPECTED ERROR: {e}")

try:
    import os
    print("OS Module present!")
except ImportError as e:
    print(f"CAUGHT EXPECTED IMPORT ERROR: {e}")
  `.trim();

  try {
    await runCode(secCode);
    console.log("=== SECURITY TEST SUCCESS ===");
  } catch (error) {
    console.error("Security Test Failed:\n", error);
  }
}

main().catch(console.error);
