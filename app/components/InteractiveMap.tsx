"use client";

import React, { useEffect, useMemo, useState } from 'react';
import MapGL, { Marker, Source, Layer, NavigationControl, Popup } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

export interface FoodResource {
  id: string;
  name?: string;
  latitude: number | string;
  longitude: number | string;
  waitTimeMinutesAverage?: number | null;
}

interface MapProps {
  dataPoints: FoodResource[];
  mode: 'none' | 'transit' | 'weather' | 'employment';
}

type MarkerClickEvent = { originalEvent: MouseEvent };

// High-speed CSV parser for your teammate's lean files
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

export default function InteractiveMap({ dataPoints, mode }: MapProps) {
  const [selectedPantry, setSelectedPantry] = useState<FoodResource | null>(null);
  
  // State to hold the dynamically generated Mapbox color array
  const [activeOverlayColors, setActiveOverlayColors] = useState<any[]>(["00000", "transparent"]);

  // Fetch and parse the CSVs ONLY when the user clicks a button
  useEffect(() => {
    let isMounted = true;

    async function loadOverlayData() {
      try {
        if (mode === 'employment') {
          // Fetch from the root public/csv/ directory
          const response = await fetch('/csv/bls_laus_county.csv');          
          if (!response.ok) {
            console.error("Failed to load Employment CSV. Status:", response.status);
            return;
          }
          
          const text = await response.text();
          const blsData = parseCSV(text);

          const countyStats = new Map<string, { sum: number; count: number }>();
          
          // Parse the 113k rows instantly and calculate 2024 averages
          blsData.forEach(d => {
            if (d.year === '2024') {
              const fips = String(d.county_fips).padStart(5, '0');
              const rate = parseFloat(d.unemployment_rate);
              if (!isNaN(rate)) {
                const current = countyStats.get(fips) || { sum: 0, count: 0 };
                countyStats.set(fips, { sum: current.sum + rate, count: current.count + 1 });
              }
            }
          });

          const flat: any[] = [];
          countyStats.forEach((stats, fips) => {
            const avgRate = stats.sum / stats.count;
            // Red: >7%, Yellow: >4.5%, Green: <4.5%
            const color = avgRate > 7 ? '#ef4444' : avgRate > 4.5 ? '#f59e0b' : '#10b981';
            flat.push(fips, color);
          });
          
          if (isMounted) setActiveOverlayColors(flat.length > 0 ? flat : ["00000", "transparent"]);

        } else if (mode === 'transit') {
          // Fetch from the root public/csv/ directory
          const response = await fetch('/csv/census_acs5_county.csv');
          if (!response.ok) {
            console.error("Failed to load Transit CSV. Status:", response.status);
            return;
          }
          
          const text = await response.text();
          const censusData = parseCSV(text);

          const flat: any[] = [];
          censusData.forEach(d => {
            const fips = String(d.county_fips).padStart(5, '0');
            const pop = parseInt(d.poverty_total || '0', 10);
            if (!isNaN(pop)) {
              flat.push(fips, pop > 100000 ? '#10b981' : pop > 40000 ? '#f59e0b' : '#ef4444');
            }
          });

          if (isMounted) setActiveOverlayColors(flat.length > 0 ? flat : ["00000", "transparent"]);
        } else {
          // Clear overlays if 'none' or 'weather' is selected
          if (isMounted) setActiveOverlayColors(["00000", "transparent"]);
        }
      } catch (error) {
        console.error("Error during CSV fetch/parse:", error);
      }
    }

    loadOverlayData();

    return () => { isMounted = false; };
  }, [mode]);

  // Mapbox Style Expression
  const regionLayerStyle: any = useMemo(() => ({
    id: 'regional-overlay',
    type: 'fill',
    paint: {
      'fill-color': ['match', ['to-string', ['get', 'GEOID']], ...activeOverlayColors, 'transparent'],
      'fill-opacity': (mode === 'employment' || mode === 'transit') ? 0.4 : 0
    }
  }), [activeOverlayColors, mode]);

  const validPoints = useMemo(() => {
    return dataPoints.filter((p: FoodResource) => {
      const lat = Number(p.latitude);
      const lng = Number(p.longitude);
      return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
    });
  }, [dataPoints]);

  return (
    <div className="w-full h-full relative">
      <MapGL
        initialViewState={{ longitude: -98.5795, latitude: 39.8283, zoom: 3.5 }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/light-v11"
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        onClick={() => setSelectedPantry(null)}
      >
        <NavigationControl position="top-right" />

        <Source id="regions" type="geojson" data="https://raw.githubusercontent.com/loganpowell/census-geojson/master/GeoJSON/5m/2018/county.json">
          <Layer {...regionLayerStyle} />
        </Source>

        {mode === 'weather' && (
          <Source id="noaa-radar" type="raster" tiles={['https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0q-900913/{z}/{x}/{y}.png']} tileSize={256}>
            <Layer id="radar-layer" type="raster" paint={{ 'raster-opacity': 0.5 }} />
          </Source>
        )}

        {validPoints.map((p: FoodResource) => {
          const waitTime = p.waitTimeMinutesAverage;
          return (
            <Marker 
              key={p.id} 
              longitude={Number(p.longitude)} 
              latitude={Number(p.latitude)} 
              anchor="bottom"
              onClick={(e: MarkerClickEvent) => {
                e.originalEvent.stopPropagation();
                setSelectedPantry(p);
              }}
            >
              <div className="cursor-pointer group relative flex flex-col items-center">
                {waitTime != null && waitTime > 45 && (
                  <div className="absolute inset-0 w-5 h-5 bg-red-400 rounded-full animate-ping opacity-20" />
                )}
                <div className={`w-3 h-3 rounded-full border-2 border-white shadow-sm transition-all group-hover:scale-125 ${
                  waitTime == null ? 'bg-zinc-400' :
                  waitTime > 45 ? 'bg-red-500' :
                  waitTime > 20 ? 'bg-amber-500' : 'bg-emerald-500'
                }`} />
              </div>
            </Marker>
          );
        })}

        {selectedPantry && (
          <Popup longitude={Number(selectedPantry.longitude)} latitude={Number(selectedPantry.latitude)} anchor="top" offset={12} onClose={() => setSelectedPantry(null)} closeOnClick={false}>
            <div className="p-1 font-sans text-zinc-800">
              <h4 className="text-sm font-semibold text-zinc-900 mb-1">{selectedPantry.name || 'Unknown Location'}</h4>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight">
                Wait Time: <span className={selectedPantry.waitTimeMinutesAverage && selectedPantry.waitTimeMinutesAverage > 45 ? 'text-red-500' : 'text-zinc-800'}>
                  {selectedPantry.waitTimeMinutesAverage != null ? `${selectedPantry.waitTimeMinutesAverage}m` : 'Unknown'}
                </span>
              </p>
            </div>
          </Popup>
        )}
      </MapGL>
    </div>
  );
}