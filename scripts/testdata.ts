import { GraphData } from "../types/d3-types";

// Helper to generate clusters with specific feature profiles
const generateCluster = (
  prefix: string, 
  count: number, 
  group: string, 
  profile: Record<string, [number, number]>,
  desc: string
) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}-${i}`,
    group: group,
    name: `${group} Resource ${i + 1}`,
    description: desc,
    features: {
      density: Math.random() * (profile.density[1] - profile.density[0]) + profile.density[0],
      capacity: Math.random() * (profile.capacity[1] - profile.capacity[0]) + profile.capacity[0],
      urgency: Math.random() * (profile.urgency[1] - profile.urgency[0]) + profile.urgency[0],
      logistics: Math.random() * (profile.logistics[1] - profile.logistics[0]) + profile.logistics[0],
      accessibility: Math.random() * (profile.accessibility[1] - profile.accessibility[0]) + profile.accessibility[0],
    }
  }));
};

export const dummyData: GraphData = {
  nodes: [
    // 1. MANHATTAN CORE (High Density, High Logistics)
    ...generateCluster("m", 50, "MANHATTAN", 
      { density: [0.8, 1.0], capacity: [0.6, 0.9], urgency: [0.1, 0.3], logistics: [0.8, 1.0], accessibility: [0.7, 0.9] },
      "High-throughput urban hub with maximum logistical connectivity."),

    // 2. BRONX RELIEF (High Urgency, Low Accessibility)
    ...generateCluster("bx", 45, "BRONX", 
      { density: [0.2, 0.4], capacity: [0.3, 0.5], urgency: [0.8, 1.0], logistics: [0.2, 0.4], accessibility: [0.1, 0.3] },
      "Critical emergency relief zone focusing on immediate food security."),

    // 3. QUEENS TRANSIT (High Accessibility, High Capacity)
    ...generateCluster("q", 45, "QUEENS", 
      { density: [0.4, 0.6], capacity: [0.7, 0.9], urgency: [0.3, 0.5], logistics: [0.6, 0.8], accessibility: [0.8, 1.0] },
      "Major distribution artery leveraging transit-oriented infrastructure."),

    // 4. BROOKLYN LOCAL (Mid-Range Balanced)
    ...generateCluster("bk", 50, "BROOKLYN", 
      { density: [0.5, 0.7], capacity: [0.4, 0.6], urgency: [0.4, 0.6], logistics: [0.4, 0.6], accessibility: [0.5, 0.7] },
      "Community-centric pantry network with balanced operational metrics."),

    // 5. STATEN ISLAND (Isolated, High Capacity)
    ...generateCluster("si", 30, "STATEN_ISLAND", 
      { density: [0.1, 0.2], capacity: [0.8, 1.0], urgency: [0.2, 0.4], logistics: [0.1, 0.3], accessibility: [0.2, 0.4] },
      "Large-scale storage facility in a low-density suburban environment."),

    // 6. JERSEY SHUTTLE (High Logistics, Low Density)
    ...generateCluster("nj", 30, "JERSEY", 
      { density: [0.2, 0.4], capacity: [0.5, 0.7], urgency: [0.3, 0.5], logistics: [0.9, 1.0], accessibility: [0.4, 0.6] },
      "Cross-state logistical bridge for bulk resource movement."),

    // 7. HARLEM HARVEST (High Urgency, High Density)
    ...generateCluster("h", 30, "HARLEM", 
      { density: [0.8, 1.0], capacity: [0.2, 0.4], urgency: [0.7, 0.9], logistics: [0.3, 0.5], accessibility: [0.6, 0.8] },
      "Intense urban need localized in small-footprint community centers."),

    // 8. LONG ISLAND OUTPOST (Low Everything, Experimental)
    ...generateCluster("li", 20, "LONG_ISLAND", 
      { density: [0.1, 0.3], capacity: [0.1, 0.3], urgency: [0.1, 0.3], logistics: [0.1, 0.3], accessibility: [0.1, 0.3] },
      "Emerging rural outreach program with limited current infrastructure."),

    // 9. UPSTATE FARMS (Low Density, Max Capacity, Low Urgency)
    ...generateCluster("up", 30, "UPSTATE", 
      { density: [0.0, 0.1], capacity: [0.9, 1.0], urgency: [0.0, 0.2], logistics: [0.4, 0.6], accessibility: [0.2, 0.4] },
      "Resource origin point focusing on bulk agriculture and storage."),

    // 10. TECH CORE (Customized Hubs)
    ...generateCluster("core", 20, "TECH_HUBS", 
      { density: [0.5, 0.5], capacity: [1.0, 1.0], urgency: [0.0, 0.0], logistics: [1.0, 1.0], accessibility: [1.0, 1.0] },
      "High-tech data and coordination nodes for the Lemontree network.")
  ],
  links: [
    // Create Borough Master Hubs
    { source: "m-0", target: "core-0", value: 10 },
    { source: "bx-0", target: "core-0", value: 10 },
    { source: "bk-0", target: "core-0", value: 10 },
    { source: "q-0", target: "core-0", value: 10 },

    // Internal Borough Connections (Star topology for each)
    ...Array.from({ length: 40 }, (_, i) => ({ source: "m-0", target: `m-${i + 1}`, value: 1 })),
    ...Array.from({ length: 30 }, (_, i) => ({ source: "bk-0", target: `bk-${i + 1}`, value: 1 })),
    ...Array.from({ length: 30 }, (_, i) => ({ source: "bx-0", target: `bx-${i + 1}`, value: 1 })),

    // Cross-Borough Referrals (The "Bridges")
    { source: "m-10", target: "bk-10", value: 2 },
    { source: "bk-20", target: "q-15", value: 2 },
    { source: "q-5", target: "bx-12", value: 2 },
    { source: "bx-8", target: "h-5", value: 2 },
    { source: "si-5", target: "nj-5", value: 2 },
    { source: "up-2", target: "nj-10", value: 5 },
    { source: "li-3", target: "q-25", value: 1 }
  ]
};