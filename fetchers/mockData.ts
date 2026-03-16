import type { UserRole, KpiStat, ChartSpec } from "@/types/chat";

export function getFoodDistributionByArea() {
  return [
    { area: "Bronx", resources: 312 },
    { area: "Brooklyn", resources: 428 },
    { area: "Manhattan", resources: 267 },
    { area: "Queens", resources: 341 },
    { area: "Staten Island", resources: 89 },
    { area: "Newark", resources: 156 },
    { area: "Jersey City", resources: 112 },
    { area: "Yonkers", resources: 74 },
  ];
}

export function getFamiliesServedOverTime() {
  return [
    { month: "Sep", families: 2840 },
    { month: "Oct", families: 3120 },
    { month: "Nov", families: 3890 },
    { month: "Dec", families: 4210 },
    { month: "Jan", families: 3760 },
    { month: "Feb", families: 3540 },
  ];
}

export function getResourceTypeBreakdown() {
  return [
    { type: "Food Pantry", count: 8342 },
    { type: "Soup Kitchen", count: 3217 },
    { type: "SNAP/EBT", count: 2610 },
  ];
}

export function getWaitTimeByRegion() {
  return [
    { region: "Bronx", avgWait: 22 },
    { region: "Brooklyn", avgWait: 18 },
    { region: "Manhattan", avgWait: 14 },
    { region: "Queens", avgWait: 26 },
    { region: "Staten Island", avgWait: 11 },
    { region: "Newark", avgWait: 31 },
  ];
}

export function getKpiStats(role: UserRole): KpiStat[] {
  const base: Record<UserRole, KpiStat[]> = {
    food_bank_partner: [
      { label: "Total Food Distributed", value: "64,300 lbs", delta: "+12% vs last quarter", trend: "up" },
      { label: "Active Distribution Sites", value: "28", delta: "+2 new this month", trend: "up" },
      { label: "Delivery Efficiency", value: "$0.23/lb", delta: "-5% cost reduction", trend: "up" },
      { label: "Food Waste Rate", value: "3.2%", delta: "-1.8% improvement", trend: "up" },
      { label: "Unmet Demand Sites", value: "12 sites", delta: "Needs attention", trend: "down" },
    ],
    government_policy: [
      { label: "Total Resources in Region", value: "14,169", delta: "Across all cities", trend: "neutral" },
      { label: "Open Today", value: "1,873", delta: "Real-time count", trend: "neutral" },
      { label: "Unserved Zip Codes", value: "47", delta: "No nearby resources", trend: "down" },
      { label: "Avg Wait Time (City)", value: "19 min", delta: "+3 min vs last month", trend: "down" },
      { label: "SNAP Coverage Rate", value: "68%", delta: "of eligible households", trend: "neutral" },
    ],
    donor: [
      { label: "Families Impacted", value: "3,540", delta: "This month", trend: "up" },
      { label: "Resources Funded", value: "142", delta: "Across 6 neighborhoods", trend: "up" },
      { label: "Pounds Delivered", value: "128K lbs", delta: "Last 6 months", trend: "up" },
      { label: "High-Need Areas", value: "12 zones", delta: "Donor priority sites", trend: "neutral" },
    ],
    volunteer: [
      { label: "Open Sites Today", value: "1,873", delta: "Accepting volunteers", trend: "neutral" },
      { label: "High-Demand Sites", value: "34", delta: "Understaffed this week", trend: "down" },
      { label: "Avg Wait Time", value: "19 min", delta: "Can be reduced with help", trend: "neutral" },
      { label: "Your Impact", value: "~120 families", delta: "Per volunteer shift", trend: "up" },
    ],
    researcher: [
      { label: "Total Resources", value: "14,169", delta: "In database", trend: "neutral" },
      { label: "Reviews Collected", value: "82,400+", delta: "With sentiment data", trend: "up" },
      { label: "Avg Rating", value: "3.1 / 5", delta: "Across all resources", trend: "neutral" },
      { label: "Data Coverage", value: "11 cities", delta: "With full API access", trend: "neutral" },
      { label: "Open Data Fields", value: "28 fields", delta: "Per resource record", trend: "neutral" },
    ],
    community: [
      { label: "Resources Near You", value: "—", delta: "Enter a zip to explore", trend: "neutral" },
      { label: "Open Right Now", value: "1,873", delta: "Across the network", trend: "neutral" },
      { label: "Food Pantries", value: "8,342", delta: "Offering groceries", trend: "neutral" },
      { label: "Soup Kitchens", value: "3,217", delta: "Hot meals available", trend: "neutral" },
    ],
  };

  return base[role] ?? base.community;
}

export const SUGGESTION_CHIPS = [
  "Show me distribution gaps by zip code",
  "How has demand changed over 6 months?",
  "Which partners serve the most families?",
  "Compare food waste vs. distribution volume",
  "Where are underserved communities?",
  "What foods are most requested?",
];

export const GUIDED_QUESTIONS = [
  {
    question: "Which zip codes have the fewest food resources per capita?",
    description: "Combines distribution data with population estimates",
  },
  {
    question: "Is our food waste going up or down — and why?",
    description: "Tracks waste metrics against distribution efficiency over time",
  },
  {
    question: "Which partner sites have growing unmet demand?",
    description: "Cross-references partner requests with actual deliveries",
  },
  {
    question: "How does weather affect food pickup rates?",
    description: "An example of a question our data wasn't built for — but can still answer",
  },
  {
    question: "Why is wait time higher in certain neighborhoods?",
    description: "AI investigates correlations across resources, hours, and reviews",
  },
];

export const SAMPLE_CHART_SPECS: ChartSpec[] = [
  {
    type: "bar",
    title: "Total Food Distributed by Area",
    data: getFoodDistributionByArea(),
    xKey: "area",
    yKey: "resources",
    color: "#16a34a",
  },
  {
    type: "line",
    title: "Families Served Over Time",
    data: getFamiliesServedOverTime(),
    xKey: "month",
    yKey: "families",
    color: "#22c55e",
  },
];
