import * as d3 from "d3";

export interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  group: string | number;
  name?: string;
  description?: string;
  features?: Record<string, number>;
  clusterMeta?: string;
}

export interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  value: number;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}