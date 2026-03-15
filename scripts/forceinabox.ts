import * as d3 from "d3";
import { GraphNode, GraphLink } from "../types/d3-types";

export function forceInABox() {
  let nodes: GraphNode[] = [];
  let links: GraphLink[] = [];
  let size = [928, 600];
  let groupBy = (d: GraphNode) => d.group;
  let strength = 0.1;
  let template = "treemap"; // "treemap" or "grid"
  let foci: { [key: string]: { x: number; y: number } } = {};

  function force(alpha: number) {
    for (let i = 0, n = nodes.length, node, focus; i < n; ++i) {
      node = nodes[i];
      focus = foci[String(groupBy(node))];
      if (!focus) continue;

      // Pull nodes toward their group's focus point
      node.vx! += (focus.x - node.x!) * strength * alpha;
      node.vy! += (focus.y - node.y!) * strength * alpha;
    }
  }

  function initialize() {
    if (!nodes) return;

    // 1. Count nodes per group
    const counts = d3.rollup(nodes, v => v.length, d => String(groupBy(d)));
    const clusters = Array.from(counts.keys()).map(key => ({
      id: key,
      value: counts.get(key) || 0
    }));

    // 2. Compute Foci (Center points for each group)
    if (template === "treemap") {
      const root = d3.hierarchy({ children: clusters })
        .sum(d => (d as any).value);

      d3.treemap()
        .size([size[0], size[1]])
        .padding(1)
        (root as d3.HierarchyRectangularNode<any>);

      root.leaves().forEach((d: any) => {
        foci[d.data.id] = {
          x: (d.x0 + d.x1) / 2,
          y: (d.y0 + d.y1) / 2
        };
      });
    } else {
      // Simple Grid fallback
      const cols = Math.ceil(Math.sqrt(clusters.length));
      clusters.forEach((c, i) => {
        foci[c.id] = {
          x: (i % cols + 0.5) * (size[0] / cols),
          y: (Math.floor(i / cols) + 0.5) * (size[1] / cols)
        };
      });
    }
  }

  force.initialize = (_: GraphNode[]) => {
    nodes = _;
    initialize();
  };

  force.template = (x: string) => {
    template = x;
    return force;
  };

  force.groupBy = (x: (d: GraphNode) => string | number) => {
    groupBy = x as any;
    return force;
  };

  force.size = (x: [number, number]) => {
    size = x;
    return force;
  };

  force.strength = (x: number) => {
    strength = x;
    return force;
  };

  return force;
}