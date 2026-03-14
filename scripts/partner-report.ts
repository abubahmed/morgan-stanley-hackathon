import { runAgent } from "../sandbox/agent";

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

  const jobDescription = `
Create a Partner Insight Report for the 'Bronx' analyzing gaps, trends, and disruptions:
1. Print the neighborhood resource mix using get_neighborhood_stats('Bronx').
2. Identify any service disruptions using get_service_disruptions() and print the first 5.
3. Fetch reviews for a specific resource in the Bronx (e.g., the first one returned by get_resources), categorize them with categorize_feedback(), and print the category distribution.
4. Provide a 2-3 sentence summary of the biggest challenges for resources in this area based on the data.
`;

  console.log("[Notice] Partner Insight Job Description:");
  console.log("-------------------------------------------------------------------------");
  console.log(jobDescription.trim());
  console.log("-------------------------------------------------------------------------\n");
  
  console.log("To generate this JSON report and PDF chart, run:");
  console.log("    npx tsx scripts/partner-report.ts\n");

  // Uncomment below to execute live
  
  try {
      console.log("Executing via E2B Sandbox Agent...");
      const result = await runAgent(jobDescription);
      console.log("\\n=== FINAL REPORT ===");
      console.log(result ? result.answer : "No report generated.");
  } catch (err) {
      console.error(err);
  }
  
}

runPartnerInsightWorkflow().catch(console.error);
