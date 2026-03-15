import * as d3 from "d3";
import { GraphData, GraphNode, GraphLink } from "../types/d3-types";
import { forceInABox } from "./forceinabox";

export class ForceGraph {
  private width = 928;
  private height = 600;
  private colorScale = d3.scaleOrdinal(["#64748b", "#94a3b8", "#cbd5e1", "#475569", "#1e293b"]);
  private svg: d3.Selection<SVGSVGElement, unknown, any, any> | null = null;
  private mainGroup: d3.Selection<SVGGElement, unknown, any, any> | null = null;
  private hullGroup: d3.Selection<SVGGElement, unknown, any, any> | null = null;
  private tooltip: d3.Selection<HTMLDivElement, unknown, any, any> | null = null;
  private simulation: d3.Simulation<GraphNode, GraphLink>;
  private isDestroyed = false;
  private zoom: d3.ZoomBehavior<SVGSVGElement, unknown> | null = null;
  private currentlySelectedId: string | null = null;
  private showHulls = true;
  private currentTransform = d3.zoomIdentity;
  private isLocked = false;

  constructor(container: HTMLElement, data: GraphData, private onNodeClick: (node: GraphNode | null) => void, private onZoomChange?: (k: number) => void) {
    const selection = d3.select(container).style("position", "relative");
    selection.selectAll("*").remove();
    this.injectStyles();

    this.tooltip = selection.append("div").attr("class", "graph-tooltip").style("opacity", 0);
    const links = data.links.map(d => ({ ...d }));
    const nodes = data.nodes.map(d => ({ ...d }));

    this.simulation = d3.forceSimulation<GraphNode, GraphLink>(nodes)
      .alphaDecay(0.03).velocityDecay(0.4)
      .force("link", d3.forceLink<GraphNode, GraphLink>(links).id(d => d.id).distance(60).strength(1))
      .force("charge", d3.forceManyBody().strength(-150).distanceMax(500))
      .force("center", d3.forceCenter(this.width / 2, this.height / 2))
      .force("collide", d3.forceCollide().radius(25).iterations(2))
      .force("group", forceInABox().strength(0.2).groupBy(d => d.group).size([this.width, this.height]).template("treemap"));

    this.svg = selection.append("svg")
      .attr("viewBox", [0, 0, this.width, this.height])
      .attr("style", "max-width: 100%; height: auto; display: block; background: transparent; cursor: crosshair; overflow: visible; position: relative; z-index: 1;")
      .on("click", (e) => { if (e.target.tagName === 'svg') this.deselect(); });

    this.mainGroup = this.svg.append("g");
    this.hullGroup = this.mainGroup.append("g").attr("class", "hulls");

    this.zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 12])
      .on("start", (e) => { if (e.sourceEvent && e.sourceEvent.type !== 'zoom' && this.currentlySelectedId) this.deselect(); })
      .on("zoom", (event) => {
        this.mainGroup?.attr("transform", event.transform);
        if (this.onZoomChange) this.onZoomChange(event.transform.k);
      });

    this.svg.call(this.zoom as any).on("dblclick.zoom", null);
    const link = this.mainGroup.append("g").selectAll("line").data(links).join("line")
      .attr("stroke", "#e2e8f0").attr("stroke-width", 1).attr("stroke-opacity", 0.4);

    const node = this.mainGroup.append("g").selectAll("g").data(nodes).join("g").attr("class", "node-group").style("pointer-events", "all").style("cursor", "pointer")
      .on("click", (e, d) => {
        e.stopPropagation();
        if (this.currentlySelectedId === d.id) this.deselect();
        else { this.currentlySelectedId = d.id; this.onNodeClick(d); this.zoomToNode(d.id); }
      }).call(this.drag(this.simulation) as any);

    node.append("circle").attr("class", "node-fill").attr("r", 5).attr("fill", d => this.colorScale(String(d.group))).style("transition", "fill 0.3s ease, stroke-width 0.3s ease");
    
    node.append("text").attr("dy", -12).attr("text-anchor", "middle").text(d => d.name || d.id)
      .style("font-family", "Inter, sans-serif").style("font-size", "10px").style("fill", "#94a3b8").style("opacity", 0).style("pointer-events", "none");

    node.on("mouseenter", function() { d3.select(this).select(".node-fill").attr("r", 8); d3.select(this).select("text").style("opacity", 1); })
        .on("mouseleave", function() { d3.select(this).select(".node-fill").attr("r", 5); d3.select(this).select("text").style("opacity", 0); });

    this.simulation.on("tick", () => {
      if (this.isDestroyed || !this.mainGroup) return;
      link.attr("x1", d => (d.source as any).x).attr("y1", d => (d.source as any).y).attr("x2", d => (d.target as any).x).attr("y2", d => (d.target as any).y);
      node.attr("transform", d => `translate(${(d as any).x},${(d as any).y})`);
      if (this.showHulls) this.updateHulls(nodes); else this.hullGroup?.selectAll("path").remove();
    });
  }

  public updateNodeStyles(colorKey: string, ringKey: string) {
    const nodes = this.simulation.nodes();
    // FIX: Replaced interpolateSlate with interpolateBlues which exists on the d3 object
    const colorScale = d3.scaleSequential(d3.interpolateBlues).domain(d3.extent(nodes, d => d.features?.[colorKey] || 0) as [number, number]);
    const ringScale = d3.scaleLinear().domain(d3.extent(nodes, d => d.features?.[ringKey] || 0) as [number, number]).range([0, 4]);

    this.mainGroup?.selectAll(".node-group").each(function(d: any) {
      const g = d3.select(this);
      const fill = colorKey === "group" ? d3.scaleOrdinal(["#64748b", "#94a3b8", "#cbd5e1", "#475569", "#1e293b"])(String(d.group)) : colorScale(d.features?.[colorKey] || 0);
      const strokeWidth = ringKey === "none" ? 0 : ringScale(d.features?.[ringKey] || 0);

      g.select(".node-fill")
        .transition().duration(500)
        .attr("fill", fill as string)
        .attr("stroke", "#1e293b")
        .attr("stroke-opacity", 0.3)
        .attr("stroke-width", strokeWidth);
    });
  }

  private updateHulls(nodes: GraphNode[]) {
    if (!this.hullGroup) return;
    const hullData = d3.groups(nodes, d => d.group).map(([group, gNodes]) => ({
      group, points: gNodes.length >= 3 ? d3.polygonHull(gNodes.map(d => [d.x!, d.y!])) : null, meta: (gNodes[0] as any).clusterMeta || ""
    })).filter(d => d.points);
    const line = d3.line().curve(d3.curveCardinalClosed.tension(0.7));
    this.hullGroup.selectAll("path").data(hullData, (d: any) => d.group).join(
      enter => enter.append("path").attr("fill", d => this.colorScale(String(d.group))).attr("fill-opacity", 0.05)
        .attr("stroke", d => this.colorScale(String(d.group))).attr("stroke-width", 50).attr("stroke-linejoin", "round").attr("stroke-opacity", 0.1)
        .style("pointer-events", "visiblePainted").style("cursor", "help")
        .on("mousemove", (event, d: any) => {
          if (!this.tooltip) return;
          const rows = d.meta.split('\n').map((str: string) => {
            if (!str.includes(':')) return `<div class="tooltip-title" style="margin-top:8px">${str}</div>`;
            const [k, v] = str.split(':');
            return `<div class="tooltip-row"><span>${k}</span><span class="tooltip-val">${v}</span></div>`;
          }).join('');
          this.tooltip.style("opacity", 1).style("left", (event.clientX + 8) + "px").style("top", (event.clientY + 8) + "px")
            .html(`<div><div class="tooltip-title" style="color:${this.colorScale(String(d.group))}">${d.group}</div>${rows}</div>`);
        })
        .on("mouseleave", () => this.tooltip?.style("opacity", 0)),
      update => update, exit => exit.remove()
    ).attr("d", d => line(d.points as any));
  }

  public toggleLock() {
    this.isLocked = !this.isLocked;
    if (this.isLocked) { this.simulation.nodes().forEach(n => { n.fx = n.x; n.fy = n.y; }); this.simulation.stop(); }
    else { this.simulation.nodes().forEach(n => { n.fx = null; n.fy = null; }); this.simulation.alpha(0.3).restart(); }
    return this.isLocked;
  }

  public setZoom(k: number) { this.svg?.transition().duration(200).call(this.zoom!.scaleTo as any, k); }
  public setOptions(o: any) {
    if (!this.simulation) return;
    this.showHulls = o.showHulls;
    (this.simulation.force("link") as any).distance(o.linkDistance);
    (this.simulation.force("charge") as any).strength(o.chargeStrength);
    (this.simulation.force("collide") as any).radius(o.collisionRadius);
    const gF = this.simulation.force("group") as any;
    if (gF) { gF.strength(o.clusterStrength); if (o.template) { gF.template(o.template); if (gF.recompute) gF.recompute(); } }
    if (!this.isLocked) this.simulation.velocityDecay(o.velocityDecay).alpha(0.5).restart();
  }

  public resetZoom() { this.svg?.transition().duration(1000).ease(d3.easeCubicOut).call(this.zoom!.transform as any, d3.zoomIdentity); }
  public resetNodes() { this.simulation.nodes().forEach(n => { n.fx = null; n.fy = null; }); this.isLocked = false; this.simulation.alpha(1).restart(); }
  public zoomToNode(id: string) {
    const n = this.simulation.nodes().find(d => d.id === id);
    if (n && this.svg) this.svg.transition().duration(800).call(this.zoom!.transform as any, d3.zoomIdentity.translate(this.width / 2, this.height / 2).scale(4).translate(-n.x!, -n.y!));
  }
  private deselect() { this.currentlySelectedId = null; this.onNodeClick(null); this.resetZoom(); }
  private drag(s: any) {
    return d3.drag<any, any>().on("start", (e) => { if (!e.active && !this.isLocked) s.alphaTarget(0.1).restart(); e.subject.fx = e.subject.x; e.subject.fy = e.subject.y; })
      .on("drag", (e) => { e.subject.fx = e.x; e.subject.fy = e.y; })
      .on("end", (e) => { if (!e.active) s.alphaTarget(0); if (!this.isLocked) { e.subject.fx = null; e.subject.fy = null; } });
  }

  private injectStyles() {
    if (document.getElementById("graph-styles")) return;
    const style = document.createElement("style"); style.id = "graph-styles";
    style.innerHTML = `.graph-tooltip { position: fixed; pointer-events: none; background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(8px); border: 1px solid #f1f5f9; border-radius: 12px; padding: 12px; font-family: 'Inter', sans-serif; box-shadow: 0 4px 20px rgba(0,0,0,0.08); z-index: 1000; transition: opacity 0.15s ease; } .tooltip-title { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 6px; font-weight: 600; } .tooltip-row { font-size: 11px; color: #475569; display: flex; justify-content: space-between; gap: 16px; margin-top: 3px; } .tooltip-val { font-family: monospace; color: #1e293b; font-weight: 500; }`;
    document.head.appendChild(style);
  }
  public stop() { this.isDestroyed = true; this.simulation.stop(); }
}