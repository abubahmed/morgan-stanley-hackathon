"use client";

import React, { useEffect, useMemo, useState, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import MapGL, { Source, Layer, NavigationControl, Popup, MapRef } from 'react-map-gl/mapbox';
import { motion, AnimatePresence } from 'framer-motion';
import 'mapbox-gl/dist/mapbox-gl.css';

export interface FoodResource {
  id: string;
  name?: string;
  latitude: number | string;
  longitude: number | string;
  waitTimeMinutesAverage?: number | null;
  addressStreet1?: string;
}

interface MapProps {
  dataPoints: FoodResource[];
  mode: 'none' | 'transit' | 'weather' | 'employment' | 'poverty';
  onViewTrends?: (pantry: FoodResource) => void;
}

function parseCSV(text: string) {
  const lines = text.split(/\r?\n/);
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = line.split(',');
    const row: any = {};
    headers.forEach((h, index) => {
      row[h] = values[index]?.trim().replace(/"/g, '');
    });
    data.push(row);
  }
  return data;
}

const InteractiveMap = forwardRef((props: MapProps, ref) => {
  const { dataPoints = [], mode, onViewTrends } = props;
  const mapRef = useRef<MapRef>(null);
  const [hoveredPantry, setHoveredPantry] = useState<FoodResource | null>(null);
  const [selectedPantry, setSelectedPantry] = useState<FoodResource | null>(null);
  const [activeOverlayColors, setActiveOverlayColors] = useState<any[]>(["00000", "transparent"]);
  const colorCache = useRef<Record<string, any[]>>({});
  
  // Track previous view state to revert zoom accurately
  const prevViewState = useRef<{ center: [number, number]; zoom: number } | null>(null);

  useImperativeHandle(ref, () => ({
    flyToLocation: (lng: number, lat: number, zoom: number = 12) => {
      mapRef.current?.flyTo({
        center: [lng, lat],
        zoom: zoom,
        essential: true,
        duration: 2000
      });
    }
  }));

  useEffect(() => {
    let isMounted = true;
    async function loadOverlayData() {
      if (mode === 'none' || mode === 'weather') {
        setActiveOverlayColors(["00000", "transparent"]);
        return;
      }
      if (colorCache.current[mode]) {
        setActiveOverlayColors(colorCache.current[mode]);
        return;
      }

      try {
        const url = mode === 'employment' ? '/csv/bls_laus_county.csv' : '/csv/census_acs5_county.csv';
        const response = await fetch(url);
        if (!response.ok) return;
        const text = await response.text();
        const csvData = parseCSV(text);
        const flat: any[] = [];

        if (mode === 'employment') {
          const countyStats = new Map<string, { sum: number; count: number }>();
          csvData.forEach(d => {
            const fips = String(d.county_fips).padStart(5, '0');
            const rate = parseFloat(d.unemployment_rate);
            if (!isNaN(rate)) {
              const current = countyStats.get(fips) || { sum: 0, count: 0 };
              countyStats.set(fips, { sum: current.sum + rate, count: current.count + 1 });
            }
          });
          countyStats.forEach((stats, fips) => {
            const avgRate = stats.sum / stats.count;
            const color = avgRate > 7 ? '#ef4444' : avgRate > 4.5 ? '#f59e0b' : '#3DBFAC';
            flat.push(fips, color);
          });
        } else if (mode === 'transit') {
          csvData.forEach(d => {
            const fips = String(d.county_fips).padStart(5, '0');
            const pop = parseInt(d.poverty_total || '0', 10);
            if (!isNaN(pop)) {
              flat.push(fips, pop > 100000 ? '#3DBFAC' : pop > 40000 ? '#f59e0b' : '#ef4444');
            }
          });
        } else if (mode === 'poverty') {
          const povMap = new Map<string, { count: number; total: number }>();
          csvData.forEach(d => {
            const fips = String(d.county_fips).padStart(5, '0');
            const povCount = parseInt(d.poverty_count, 10);
            const povTotal = parseInt(d.poverty_total, 10);
            if (!isNaN(povCount) && !isNaN(povTotal)) {
              const current = povMap.get(fips) || { count: 0, total: 0 };
              povMap.set(fips, { count: current.count + povCount, total: current.total + povTotal });
            }
          });
          povMap.forEach((stats, fips) => {
            if (stats.total > 0) {
              const povRate = (stats.count / stats.total) * 100;
              const color = povRate > 20 ? '#ef4444' : povRate > 12 ? '#f59e0b' : '#3DBFAC';
              flat.push(fips, color);
            }
          });
        }

        if (flat.length > 0) colorCache.current[mode] = flat;
        if (isMounted) setActiveOverlayColors(flat.length > 0 ? flat : ["00000", "transparent"]);
      } catch (err) {
        console.error("Overlay process failed", err);
      }
    }
    loadOverlayData();
    return () => { isMounted = false; };
  }, [mode]);

  const pointSourceData = useMemo(() => {
    const safeData = Array.isArray(dataPoints) ? dataPoints : [];
    return {
      type: 'FeatureCollection',
      features: safeData
        .filter(p => p && !isNaN(Number(p.latitude)) && Number(p.latitude) !== 0)
        .map(p => ({
          type: 'Feature',
          properties: { ...p, waitTime: p.waitTimeMinutesAverage },
          geometry: { type: 'Point', coordinates: [Number(p.longitude), Number(p.latitude)] }
        }))
    };
  }, [dataPoints]);

  const pulseLayerStyle: any = {
    id: 'food-resource-pulse',
    type: 'circle',
    filter: ['>', ['get', 'waitTime'], 45],
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 4, 10, 15, 15, 25],
      'circle-color': '#ef4444',
      'circle-opacity': 0.2,
      'circle-stroke-width': 1,
      'circle-stroke-color': '#ef4444'
    }
  };

  const circleLayerStyle: any = {
    id: 'food-resource-circles',
    type: 'circle',
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 2, 10, 8, 15, 12],
      'circle-color': [
        'case',
        ['==', ['get', 'waitTime'], null], '#a1a1aa',
        ['>', ['get', 'waitTime'], 45], '#ef4444',
        ['>', ['get', 'waitTime'], 20], '#f59e0b',
        '#3DBFAC'
      ],
      'circle-stroke-width': 1.5,
      'circle-stroke-color': '#ffffff'
    }
  };

  const regionLayerStyle: any = useMemo(() => ({
    id: 'regional-overlay',
    type: 'fill',
    paint: {
      'fill-color': ['match', ['to-string', ['get', 'GEOID']], ...activeOverlayColors, 'transparent'],
      'fill-opacity': (mode === 'employment' || mode === 'transit' || mode === 'poverty') ? 0.4 : 0
    }
  }), [activeOverlayColors, mode]);

  const onMouseMove = useCallback((event: any) => {
    const feature = event.features && event.features[0];
    if (feature && feature.layer.id === 'food-resource-circles') {
      setHoveredPantry(feature.properties);
    } else { 
      setHoveredPantry(null); 
    }
  }, []);

  const handleClosePanel = useCallback(() => {
    if (prevViewState.current && mapRef.current) {
      mapRef.current.flyTo({
        center: prevViewState.current.center,
        zoom: prevViewState.current.zoom,
        duration: 2000,
        padding: { right: 0 } // Reset padding
      });
    }
    setSelectedPantry(null);
    prevViewState.current = null;
  }, []);

  const onMapClick = useCallback((event: any) => {
    const feature = event.features && event.features[0];
    if (feature && feature.layer.id === 'food-resource-circles') {
      const pantry = feature.properties;
      
      if (selectedPantry?.id === pantry.id) {
        handleClosePanel();
      } else {
        // Save state before zooming in if we aren't already in a selection
        if (!selectedPantry) {
          const map = mapRef.current?.getMap();
          if (map) {
            prevViewState.current = {
              center: [map.getCenter().lng, map.getCenter().lat],
              zoom: map.getZoom()
            };
          }
        }

        setSelectedPantry(pantry);
        onViewTrends?.(pantry);
        mapRef.current?.flyTo({
          center: [Number(pantry.longitude), Number(pantry.latitude)],
          zoom: 13,
          duration: 2000,
          padding: { right: 400 } // Offset for sidebar + buffer for zoom buttons
        });
      }
    } else {
      if (selectedPantry) handleClosePanel();
    }
  }, [selectedPantry, onViewTrends, handleClosePanel]);

  return (
    <div className="w-full h-full relative group overflow-hidden">
      <MapGL
        ref={mapRef}
        initialViewState={{ longitude: -98.5795, latitude: 39.8283, zoom: 3.5 }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/light-v11"
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        onMouseMove={onMouseMove}
        onClick={onMapClick}
        onDragStart={() => { if (selectedPantry) handleClosePanel(); }}
        interactiveLayerIds={['food-resource-circles']}
        reuseMaps
      >
        <NavigationControl position="top-right" />
        
        <Source id="regions" type="geojson" data="https://raw.githubusercontent.com/loganpowell/census-geojson/master/GeoJSON/5m/2018/county.json">
          <Layer {...regionLayerStyle} />
        </Source>

        {mode === 'weather' && (
          <Source id="noaa-radar" type="raster" tiles={['https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0q-900913/{z}/{x}/{y}.png']} tileSize={256}>
            <Layer id="radar-layer" type="raster" paint={{ 'raster-opacity': 0.4 }} />
          </Source>
        )}

        <Source id="food-points" type="geojson" data={pointSourceData}>
          <Layer {...pulseLayerStyle} />
          <Layer {...circleLayerStyle} />
        </Source>
        
        <AnimatePresence>
          {hoveredPantry && !selectedPantry && (
            <Popup
              longitude={Number(hoveredPantry.longitude)}
              latitude={Number(hoveredPantry.latitude)}
              anchor="bottom"
              offset={18}
              closeButton={false}
              closeOnClick={false}
              className="z-50 pointer-events-none"
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="p-3 bg-white/95 backdrop-blur-lg rounded-2xl shadow-xl border border-zinc-100 min-w-[180px]"
              >
                <div className="flex flex-col gap-1">
                  <h4 className="text-[11px] font-bold uppercase tracking-tight text-zinc-900 leading-tight">
                    {hoveredPantry.name}
                  </h4>
                  <p className="text-[10px] font-medium text-zinc-500 uppercase">
                    {hoveredPantry.waitTimeMinutesAverage ?? '??'}m Wait
                  </p>
                </div>
              </motion.div>
            </Popup>
          )}
        </AnimatePresence>
      </MapGL>

      <AnimatePresence>
        {selectedPantry && (
          <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 250 }}
            // Moved further left (right-16) to avoid overlap with zoom controls
            className="absolute top-4 right-16 bottom-4 w-80 bg-white/95 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-zinc-200/50 z-[100] p-6 flex flex-col"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#3DBFAC]">Resource Profile</span>
                <h2 className="text-xl font-bold text-zinc-900 leading-tight">{selectedPantry.name}</h2>
              </div>
              <button 
                onClick={handleClosePanel}
                className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 5L5 15M5 5l10 10" />
                </svg>
              </button>
            </div>

            <div className="space-y-6 overflow-y-auto pr-2">
              <section>
                <h3 className="text-[11px] font-bold uppercase text-zinc-400 mb-2">Current Status</h3>
                <div className="flex items-center gap-3 p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                  <div className={`h-3 w-3 rounded-full animate-pulse ${
                    selectedPantry.waitTimeMinutesAverage == null ? 'bg-zinc-400' :
                    selectedPantry.waitTimeMinutesAverage > 45 ? 'bg-red-500' : 'bg-[#3DBFAC]'
                  }`} />
                  <div>
                    <p className="text-sm font-bold text-zinc-900">
                      {selectedPantry.waitTimeMinutesAverage ?? 'N/A'} Minute Average Wait
                    </p>
                    <p className="text-[10px] text-zinc-500 font-medium">Updated 5 minutes ago</p>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-[11px] font-bold uppercase text-zinc-400 mb-2">Location</h3>
                <p className="text-sm text-zinc-600 font-medium leading-relaxed">
                  {selectedPantry.addressStreet1 || 'Address details currently unavailable for this resource.'}
                </p>
              </section>

              <div className="mt-auto pt-6">
                <button 
                  onClick={() => onViewTrends?.(selectedPantry)}
                  className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-zinc-800 transition-all active:scale-[0.98]"
                >
                  View Full Trends
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

InteractiveMap.displayName = "InteractiveMap";
export default InteractiveMap;