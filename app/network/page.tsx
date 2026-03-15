'use client';

import { useEffect, useRef, useState } from "react";

import { ForceGraph } from "../../scripts/d3-graph";

import { runKMeans } from "../../scripts/k-means";

import { GraphNode, GraphData } from "../../types/d3-types";

import GraphSettings from "../components/GraphSettings";

import * as d3 from "d3";



export default function Home() {

  const containerRef = useRef<HTMLDivElement>(null);

  const graphRef = useRef<ForceGraph | null>(null);

  const [data, setData] = useState<GraphData | null>(null);

  const baseDataRef = useRef<GraphData | null>(null);

  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  const [isLocked, setIsLocked] = useState(false);

  const [currentZoom, setCurrentZoom] = useState(1);



  useEffect(() => {

    fetch('/graph-data.json').then(res => res.json()).then(json => {

      setData(json);

      baseDataRef.current = json;

    });

  }, []);



  useEffect(() => {

    if (containerRef.current && data) {

      graphRef.current = new ForceGraph(containerRef.current, data, (node) => setSelectedNode(node), (k) => setCurrentZoom(k));

    }

    return () => graphRef.current?.stop();

  }, [data]);



  if (!data) return null;

  const groups = Array.from(new Set(data.nodes.map(n => String(n.group))));

  const featureKeys = data.nodes[0]?.features ? Object.keys(data.nodes[0].features) : [];



  return (

    <main className="min-h-screen bg-[#fafafa] flex items-center justify-center p-6 text-zinc-900 font-sans">

      <div className="w-full max-w-7xl flex gap-6">

        <div className="w-56 shrink-0 bg-white/40 backdrop-blur-md border border-zinc-100 rounded-3xl p-6 h-[600px] overflow-y-auto shadow-sm self-end">

          <p className="text-[9px] uppercase tracking-widest text-zinc-400 mb-6">Network Key</p>

          <div className="flex flex-col gap-4">

            {groups.map((g) => (

              <div key={g} className="flex items-center gap-3 group cursor-default">

                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d3.scaleOrdinal(["#64748b", "#94a3b8", "#cbd5e1", "#475569", "#1e293b"])(g) }} />

                <span className="text-[10px] text-zinc-500 group-hover:text-zinc-800 transition-colors lowercase truncate">{g}</span>

              </div>

            ))}

          </div>

        </div>



        <div className="flex-1 max-w-5xl">

          <header className="mb-12 flex justify-between items-end">

            <div className="flex flex-col gap-2">

              <h1 className="text-sm font-medium uppercase tracking-[0.3em] text-zinc-400">Network Analysis</h1>

              <h2 className="text-4xl font-light tracking-tight text-zinc-800">Lemontree <span className="text-zinc-300">Intelligence</span></h2>

            </div>

            <div className="flex gap-3">

              <button onClick={() => { setData(baseDataRef.current); graphRef.current?.resetZoom(); }} className="px-6 py-2 border border-zinc-200 text-zinc-500 text-[11px] uppercase tracking-widest rounded-full hover:bg-zinc-50">Reset Data</button>

              <button onClick={() => { if (data) setData({ ...data, nodes: runKMeans(data.nodes, 8) }); }} className="px-6 py-2 bg-zinc-900 text-white text-[11px] uppercase tracking-widest rounded-full hover:bg-zinc-700 shadow-sm">Generate Clusters</button>

            </div>

          </header>



          <div className="group relative w-full aspect-[16/10] bg-white rounded-3xl shadow-xl border border-zinc-100 overflow-hidden flex">

            <div ref={containerRef} className={`h-full transition-all duration-700 ${selectedNode ? 'w-2/3' : 'w-full'}`} />



            {selectedNode && (

              <div className="w-1/3 border-l border-zinc-100 bg-white p-10 flex flex-col animate-in slide-in-from-right duration-500 z-10 overflow-y-auto">

                <button onClick={() => { setSelectedNode(null); graphRef.current?.resetZoom(); }} className="text-[10px] uppercase tracking-widest text-zinc-400 mb-12 self-start transition-colors hover:text-zinc-800">← Back</button>

                <span className="text-[10px] uppercase tracking-widest text-zinc-300">{selectedNode.group}</span>

                <h3 className="text-2xl font-light text-zinc-800 mb-4">{selectedNode.name || selectedNode.id}</h3>

                <p className="text-sm text-zinc-500 font-light leading-relaxed mb-10">{selectedNode.description || "No description provided."}</p>

                <div className="pt-8 border-t border-zinc-50 flex flex-col gap-4 text-[10px] uppercase text-zinc-300 font-medium">

                  <div className="flex justify-between"><span>Identifier</span><span className="font-mono text-zinc-400">{selectedNode.id}</span></div>

                </div>

              </div>

            )}



            <div className="absolute top-6 left-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">

              <button onClick={() => graphRef.current?.resetZoom()} className="px-5 py-2.5 text-[10px] font-medium tracking-widest uppercase bg-white/90 border border-zinc-100 rounded-full hover:bg-white shadow-sm transition-all active:scale-95">Recenter</button>

              <button onClick={() => graphRef.current?.resetNodes()} className="px-5 py-2.5 text-[10px] font-medium tracking-widest uppercase bg-white/90 border border-zinc-100 rounded-full hover:bg-white shadow-sm transition-all active:scale-95">Release</button>

              <button

                onClick={() => setIsLocked(graphRef.current?.toggleLock() || false)}

                className={`px-5 py-2.5 text-[10px] font-medium tracking-widest uppercase border rounded-full shadow-sm transition-all active:scale-95 ${isLocked ? 'bg-zinc-800 text-white border-zinc-800' : 'bg-white/90 text-zinc-800 border-zinc-100 hover:bg-white'}`}

              >

                {isLocked ? 'Unlock' : 'Lock'}

              </button>

            </div>



            {!selectedNode && (

              <GraphSettings

                currentZoom={currentZoom}

                featureKeys={featureKeys}

                onUpdate={(s) => {

                  if (graphRef.current) {

                    graphRef.current.setOptions(s);

                    graphRef.current.setZoom(s.zoom);

                    graphRef.current.updateNodeStyles(s.nodeColor, s.nodeRing);

                  }

                }}

              />

            )}

          </div>

        </div>

      </div>

    </main>

  );

}

