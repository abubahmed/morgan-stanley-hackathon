import dotenv from "dotenv";
import { createSandbox, runPython } from "../sandbox/agent";

dotenv.config({ path: ".env.local" });

async function main() {
  if (!process.env.E2B_API_KEY) {
    console.error("E2B_API_KEY is not set");
    process.exit(1);
  }

  const sandbox = await createSandbox();

  try {
    const output = await runPython(
      sandbox,
      `import pandas as pd
print("resources rows", len(resources))
print(get_resources(zip="10001", take=3)[["id","name","zip_code"]].head())
reviews = get_reviews(resources["id"].iloc[0])
print("reviews rows", len(reviews))
print(get_wait_time_trends(resources["id"].iloc[0]).head())
try:
    fetch_json("https://platform.foodhelpline.org/health")
except Exception as e:
    print("fetch_json error", type(e).__name__)
`,
    );

    console.log(output);
  } finally {
    await sandbox.kill();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
