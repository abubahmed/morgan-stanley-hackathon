import { GraphNode } from "../types/d3-types";

export function runKMeans(nodes: GraphNode[], k: number) {
  if (nodes.length === 0 || !nodes[0].features) return nodes;

  const featureKeys = Object.keys(nodes[0].features);
  const data = nodes.map(n => featureKeys.map(key => n.features![key]));
  
  const normalized = data.map(v => v.map((val, d) => {
    const col = data.map(row => row[d]);
    const min = Math.min(...col), max = Math.max(...col);
    return max === min ? 0 : (val - min) / (max - min);
  }));

  let centroids = normalized.slice(0, k).map(v => [...v]);
  let assignments = new Array(nodes.length).fill(-1);
  let changed = true;

  for (let iter = 0; iter < 20 && changed; iter++) {
    changed = false;
    nodes.forEach((_, i) => {
      let minDist = Infinity, closest = -1;
      centroids.forEach((c, j) => {
        const d = Math.sqrt(normalized[i].reduce((s, v, di) => s + Math.pow(v - c[di], 2), 0));
        if (d < minDist) { minDist = d; closest = j; }
      });
      if (assignments[i] !== closest) { assignments[i] = closest; changed = true; }
    });

    centroids = centroids.map((_, j) => {
      const cluster = normalized.filter((_, i) => assignments[i] === j);
      return cluster.length === 0 ? centroids[j] : cluster[0].map((_, d) => 
        cluster.reduce((s, p) => s + p[d], 0) / cluster.length
      );
    });
  }

  // Calculate cluster profiles (average values per feature per cluster)
  const clusterProfiles = centroids.map((_, clusterIdx) => {
    const clusterNodes = nodes.filter((_, i) => assignments[i] === clusterIdx);
    if (clusterNodes.length === 0) return "";
    
    return featureKeys.map(key => {
      const avg = clusterNodes.reduce((sum, n) => sum + (n.features![key] || 0), 0) / clusterNodes.length;
      return `${key.toUpperCase()}: ${avg.toFixed(2)}`;
    }).join("\n");
  });

  return nodes.map((node, i) => ({
    ...node,
    group: `Cluster ${assignments[i] + 1}`,
    description: node.description || "No description provided.",
    clusterMeta: `CLUSTER PROFILE:\n${clusterProfiles[assignments[i]]}`
  }));
}