import { runCode } from "../lib/claude";

/**
 * This script demonstrates how our sandbox prelude functions 
 * can power a complex workflow:
 * 1. Data Ingestion: Fetching a large sample of food resources across NY
 * 2. Analytics: Calculating distance metrics, sorting, and aggregating
 * 3. Visualization: Generating a histogram of resource locations by type
 * 4. Output: Returning the Base64 image and the raw statistical summary
 */
async function runComplexWorkflow() {
  console.log("=== Launching Advanced Sandbox Analytics Workflow ===\n");

  const advancedPythonScript = `
# 1. Ingest Data: Fetching up to 200 resources using our sandboxed API wrapper
print("Fetching food resources from Lemontree API...")
df = get_resources(take=200, region="NYC")
print(f"Successfully loaded {len(df)} records into pandas DataFrame.")

# 2. Data Cleaning & Transformation
# Ensure 'distance' and 'resourceTypeId' columns are valid
df = df.dropna(subset=['resourceTypeId'])

if 'distance' in df.columns:
    df['distance'] = pd.to_numeric(df['distance'], errors='coerce')
    avg_dist = df['distance'].mean()
    print(f"\\nStats Analysis: The average distance metric for fetched pantries is {avg_dist:.2f} miles.")
else:
    print("\\nNote: No distance metric available in this query.")

# 3. Text Analysis: Fetching reviews for a sample pantry
print("\\nFetching community reviews for sentiment analysis...")
try:
    sample_id = df.iloc[0]['id']
    reviews_df = get_reviews(sample_id)
    if not reviews_df.empty and 'rating' in reviews_df.columns:
        avg_rating = reviews_df['rating'].mean()
        print(f"Sample Location ({sample_id}) has an average rating of {avg_rating:.1f}/5.0 based on {len(reviews_df)} reviews.")
    else:
        print(f"No reviews found for sample location ({sample_id}).")
except KeyError:
    print("Could not isolate a sample ID for review fetching.")

# 4. Aggregation
type_counts = df['resourceTypeId'].value_counts()
print("\\nResource Type Distribution:")
print(type_counts)

# 5. Advanced Visualization
plt.figure(figsize=(10, 6))
type_counts.plot(
    kind='pie', 
    autopct='%1.1f%%', 
    startangle=140, 
    colors=['#ff9999','#66b3ff','#99ff99','#ffcc99','#c2c2f0']
)
plt.title('Distribution of Food Resource Types in NYC', fontsize=14, pad=20)
plt.axis('equal')  # Equal aspect ratio ensures that pie is drawn as a circle.
plt.tight_layout()

# Anthropic's sandbox intercepts plt.show() and returns the image buffer
plt.show() 

print("\\nWorkflow Complete: Aggregated statistics and generated visualization plot.")
  `.trim();

  console.log("[Notice] Below is the Python payload that would be sent to Claude's Sandbox:");
  console.log("-------------------------------------------------------------------------");
  console.log(advancedPythonScript);
  console.log("-------------------------------------------------------------------------\n");
  
  console.log("To execute this payload through the API, ensure your .env.local file has your Anthropic Key, then run:");
  console.log("    npx tsx scripts/workflow-demo.ts\n");

  // Uncomment the block below if you have the API key setup and want to run it live:
  /*
  try {
      console.log("Executing in Anthropic Sandbox...");
      const result = await runCode(advancedPythonScript);
      
      console.log("\\n=== SANDBOX EXECUTION RESULTS ===");
      console.log("Stdout:\\n" + result.stdout);
      
      if (result.images.length > 0) {
          console.log(`\\nSuccess! Received ${result.images.length} visualization(s) from Matplotlib.`);
          console.log(`Base64 Data (first 50 chars): data:image/png;base64,${result.images[0].substring(0, 50)}...`);
      }
      
  } catch (error) {
      console.error("\\nWorkflow Execution Failed:\\n", error);
  }
  */
}

runComplexWorkflow().catch(console.error);
