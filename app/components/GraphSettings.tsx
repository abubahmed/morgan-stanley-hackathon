'use client';
import { useState, useEffect } from "react";

const DEFAULTS = {
  linkDistance: 120, chargeStrength: -250, collisionRadius: 25,
  velocityDecay: 0.4, clusterStrength: 0.15, showHulls: true,
  template: "force", zoom: 1, nodeColor: "group", nodeRing: "none"
};

export default function GraphSettings({ onUpdate, currentZoom, featureKeys }: { onUpdate: (s: any) => void, currentZoom: number, featureKeys: string[] }) {
  const [s, setS] = useState(DEFAULTS);

  useEffect(() => {
    setS(prev => ({ ...prev, zoom: currentZoom }));
  }, [currentZoom]);

  const update = (key: string, val: any) => {
    const next = { ...s, [key]: val };
    setS(next);
    onUpdate(next);
  };

  return (
    <div className="absolute bottom-6 right-6 w-56 bg-white/70 backdrop-blur-md border border-zinc-100 rounded-2xl p-5 opacity-0 group-hover:opacity-100 transition-all duration-500 z-30 shadow-sm">
      <div className="space-y-5">
        <header className="flex justify-between items-start">
          <div className="space-y-0.5">
            <p className="text-[9px] uppercase tracking-widest text-zinc-400">Control</p>
            <p className="text-[11px] font-medium text-zinc-800">Visuals & Physics</p>
          </div>
          <button onClick={() => { setS(DEFAULTS); onUpdate(DEFAULTS); }} className="text-[9px] uppercase tracking-tighter text-zinc-400 hover:text-zinc-800 transition-colors">Reset</button>
        </header>

        {/* Visual Mapping Dropdowns */}
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-[8px] uppercase tracking-wider text-zinc-400">Node Color</label>
            <select value={s.nodeColor} onChange={(e) => update('nodeColor', e.target.value)} className="w-full bg-zinc-100/50 text-[10px] p-1.5 rounded-md border-none focus:ring-1 focus:ring-zinc-300 outline-none">
              <option value="group">Cluster Group</option>
              {featureKeys.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[8px] uppercase tracking-wider text-zinc-400">Node Rings</label>
            <select value={s.nodeRing} onChange={(e) => update('nodeRing', e.target.value)} className="w-full bg-zinc-100/50 text-[10px] p-1.5 rounded-md border-none focus:ring-1 focus:ring-zinc-300 outline-none">
              <option value="none">None</option>
              {featureKeys.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
        </div>
        
        <div className="flex bg-zinc-100 p-1 rounded-lg">
          <button onClick={() => update('template', 'treemap')} className={`flex-1 text-[10px] py-1 rounded-md transition-all ${s.template === 'treemap' ? 'bg-white shadow-sm text-zinc-800' : 'text-zinc-400'}`}>Treemap</button>
          <button onClick={() => update('template', 'force')} className={`flex-1 text-[10px] py-1 rounded-md transition-all ${s.template === 'force' ? 'bg-white shadow-sm text-zinc-800' : 'text-zinc-400'}`}>Force</button>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-[9px] uppercase text-zinc-500 font-mono"><span>Zoom</span><span>{s.zoom.toFixed(2)}x</span></div>
          <input type="range" min="0.1" max="10" step="0.1" value={s.zoom} onChange={(e) => update('zoom', parseFloat(e.target.value))} className="w-full h-0.5 bg-zinc-100 rounded-full appearance-none accent-zinc-800" />
        </div>

        {[
          { label: "Link Length", key: "linkDistance", min: 10, max: 500, step: 10 },
          { label: "Repulsion", key: "chargeStrength", min: -2000, max: 0, step: 50 },
          { label: "Collision", key: "collisionRadius", min: 2, max: 100, step: 1 },
          { label: "Friction", key: "velocityDecay", min: 0.1, max: 0.9, step: 0.05 },
          { label: "Clustering", key: "clusterStrength", min: 0, max: 1.0, step: 0.01 },
        ].map((f) => (
          <div key={f.key} className="space-y-2">
            <div className="flex justify-between text-[9px] uppercase text-zinc-500 font-mono"><span>{f.label}</span><span>{(s as any)[f.key]}</span></div>
            <input type="range" min={f.min} max={f.max} step={f.step} value={(s as any)[f.key]} onChange={(e) => update(f.key, parseFloat(e.target.value))} className="w-full h-0.5 bg-zinc-100 rounded-full appearance-none accent-zinc-800" />
          </div>
        ))}
        
        <div className="pt-2 border-t border-zinc-50 flex items-center justify-between">
          <span className="text-[9px] uppercase text-zinc-500 font-mono">Cluster Aids</span>
          <button onClick={() => update('showHulls', !s.showHulls)} className={`w-8 h-4 rounded-full relative transition-colors ${s.showHulls ? 'bg-zinc-800' : 'bg-zinc-200'}`}><div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${s.showHulls ? 'left-[18px]' : 'left-0.5'}`} /></button>
        </div>
      </div>
    </div>
  );
}