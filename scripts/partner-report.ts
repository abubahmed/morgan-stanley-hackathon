import { runCode } from "../lib/claude";

/**
 * PROJECT MISSION: Partner Insight Report Demonstration
 * 
 * This script demonstrates the "Partner Insight Report" workflow:
 * 1. Geographic Gap Analysis: Using get_neighborhood_stats()
 * 2. Automated Feedback Categorization: Using categorize_feedback()
 * 3. Trend Analysis: Using get_wait_time_trends()
 * 4. Insight Generation: Highlighting "Gaps and Recurring Issues"
 */
async function runPartnerInsightWorkflow() {
  console.log("=== Launching Lemontree Partner Insight Report ===\n");

  const reportPythonScript = `
import pandas as pd
import matplotlib.pyplot as plt

# 1. Neighborhood Overview (Geographic Gaps)
print("Analyzing Geographic Gaps in 'Bronx'...")
neighborhood_stats = get_neighborhood_stats("Bronx")
print("\\nNeighborhood Resource Mix:")
print(neighborhood_stats)

# 2. Deep Dive: Service Reliability (Wait Times & Categorization)
# Step A: Fetch resources to pick a target
resources = get_resources(region="Bronx", take=10)
if not resources.empty:
    target_id = resources.iloc[0]['id']
    target_name = resources.iloc[0]['name']
    print(f"\\n--- Deep Dive: {target_name} ({target_id}) ---")

    # Step B: Fetch and Categorize Reviews
    reviews = get_reviews(target_id)
    categorized_reviews = categorize_feedback(reviews)
    
    cat_summary = categorized_reviews['category'].value_counts()
    print("\\nAutomated Feedback Categorization:")
    print(cat_summary)

    # Step C: Temporal Trend Analysis (Wait Times)
    trends = get_wait_time_trends(target_id)
    print("\\nWeekly Wait Time Trends (Last 8 Weeks):")
    print(trends.tail(8))

    # 3. Visualization: Trend vs Distribution
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 6))

    # Plot 1: Monthly Wait Times
    trends.plot(x='week', y='avg_wait_minutes', ax=ax1, marker='o', color='red')
    ax1.set_title('Avg Wait Time Over Time')
    ax1.set_ylabel('Minutes')
    ax1.grid(True)

    # Plot 2: Category Distribution
    cat_summary.plot(kind='bar', color='skyblue', ax=ax2)
    ax2.set_title('Community Feedback by Category')
    ax2.set_ylabel('Number of Reviews')
    plt.xticks(rotation=45)

    plt.tight_layout()
    plt.show()

    print("\\nINSIGHT GENERATED: Visualization captured and results summarized for Partner Report.")
else:
    print("No resources found for analysis.")
  `.trim();

  console.log("[Notice] Partner Insight Logic:");
  console.log("-------------------------------------------------------------------------");
  console.log(reportPythonScript);
  console.log("-------------------------------------------------------------------------\n");
  
  console.log("To generate this JSON report and PDF chart, run:");
  console.log("    npx tsx scripts/partner-report.ts\n");

  /* Uncomment below to execute live */
  /*
  const result = await runCode(reportPythonScript);
  console.log(result.stdout);
  */
}

runPartnerInsightWorkflow().catch(console.error);
