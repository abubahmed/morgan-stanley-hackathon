"use client";

import React, { useMemo, useState, useCallback, useRef, forwardRef, useImperativeHandle } from "react";
import MapGL, { Source, Layer, NavigationControl, Popup, MapRef } from "react-map-gl/mapbox";
import { motion, AnimatePresence } from "framer-motion";
import "mapbox-gl/dist/mapbox-gl.css";

export interface FoodResource {
  id: string;
  name?: string;
  latitude: number | string;
  longitude: number | string;
  waitTimeMinutesAverage?: number | null;
  addressStreet1?: string | null;
  city?: string | null;
  state?: string | null;
  resourceType?: string;
  rating?: number | null;
  reviewCount?: number;
  subscribers?: number;
  acceptingNewClients?: boolean;
}

const TYPE_COLORS: Record<string, string> = {
  FOOD_PANTRY: "#3DBFAC",
  SOUP_KITCHEN: "#8b5cf6",
  SNAP_EBT: "#f59e0b",
};

const TYPE_LABELS: Record<string, string> = {
  FOOD_PANTRY: "Food Pantry",
  SOUP_KITCHEN: "Soup Kitchen",
  SNAP_EBT: "SNAP/EBT",
};

interface MapProps {
  dataPoints: FoodResource[];
  mode: "none" | "transit" | "weather" | "employment" | "poverty";
  overlayColors?: string[];
  onViewTrends?: (pantry: FoodResource) => void;
}

const InteractiveMap = forwardRef((props: MapProps, ref) => {
  const { dataPoints = [], mode, overlayColors, onViewTrends } = props;
  const mapRef = useRef<MapRef>(null);
  const [hoveredPantry, setHoveredPantry] = useState<FoodResource | null>(null);
  const [selectedPantry, setSelectedPantry] = useState<FoodResource | null>(null);
  const prevViewState = useRef<{ center: [number, number]; zoom: number } | null>(null);

  useImperativeHandle(ref, () => ({
    flyToLocation: (lng: number, lat: number, zoom: number = 12) => {
      mapRef.current?.flyTo({ center: [lng, lat], zoom, essential: true, duration: 2000 });
    },
  }));

  const pointSourceData = useMemo(() => ({
    type: "FeatureCollection" as const,
    features: (Array.isArray(dataPoints) ? dataPoints : [])
      .filter((p) => p && !isNaN(Number(p.latitude)) && Number(p.latitude) !== 0)
      .map((p) => ({
        type: "Feature" as const,
        properties: {
          ...p,
          waitTime: p.waitTimeMinutesAverage,
          color: TYPE_COLORS[p.resourceType ?? ""] ?? "#a1a1aa",
        },
        geometry: { type: "Point" as const, coordinates: [Number(p.longitude), Number(p.latitude)] },
      })),
  }), [dataPoints]);

  const regionLayerStyle: any = useMemo(() => {
    const colors = overlayColors && overlayColors.length > 0
      ? overlayColors
      : ["00000", "transparent"];

    return {
      id: "regional-overlay",
      type: "fill",
      paint: {
        "fill-color": ["match", ["to-string", ["get", "GEOID"]], ...colors, "transparent"],
        "fill-opacity": mode !== "none" && mode !== "weather" ? 0.4 : 0,
      },
    };
  }, [overlayColors, mode]);

  const pulseLayerStyle: any = {
    id: "food-resource-pulse",
    type: "circle",
    filter: [">", ["get", "waitTime"], 45],
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 4, 10, 15, 15, 25],
      "circle-color": "#ef4444",
      "circle-opacity": 0.2,
      "circle-stroke-width": 1,
      "circle-stroke-color": "#ef4444",
    },
  };

  const circleLayerStyle: any = {
    id: "food-resource-circles",
    type: "circle",
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 2.5, 10, 8, 15, 12],
      "circle-color": ["get", "color"],
      "circle-stroke-width": 1.5,
      "circle-stroke-color": "#ffffff",
      "circle-opacity": 0.85,
    },
  };

  const onMouseMove = useCallback((event: any) => {
    const feature = event.features?.[0];
    if (feature?.layer.id === "food-resource-circles") {
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
        padding: { right: 0 },
      });
    }
    setSelectedPantry(null);
    prevViewState.current = null;
  }, []);

  const onMapClick = useCallback((event: any) => {
    const feature = event.features?.[0];
    if (feature?.layer.id === "food-resource-circles") {
      const pantry = feature.properties;

      if (selectedPantry?.id === pantry.id) {
        handleClosePanel();
      } else {
        if (!selectedPantry) {
          const map = mapRef.current?.getMap();
          if (map) {
            prevViewState.current = {
              center: [map.getCenter().lng, map.getCenter().lat],
              zoom: map.getZoom(),
            };
          }
        }
        setSelectedPantry(pantry);
        onViewTrends?.(pantry);
        mapRef.current?.flyTo({
          center: [Number(pantry.longitude), Number(pantry.latitude)],
          zoom: 13,
          duration: 2000,
          padding: { right: 400 },
        });
      }
    } else if (selectedPantry) {
      handleClosePanel();
    }
  }, [selectedPantry, onViewTrends, handleClosePanel]);

  return (
    <div className="w-full h-full relative group overflow-hidden">
      <MapGL
        ref={mapRef}
        initialViewState={{ longitude: -98.5795, latitude: 39.8283, zoom: 3.5 }}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/light-v11"
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        onMouseMove={onMouseMove}
        onClick={onMapClick}
        onDragStart={() => { if (selectedPantry) handleClosePanel(); }}
        interactiveLayerIds={["food-resource-circles"]}
        reuseMaps
      >
        <NavigationControl position="top-right" />

        <Source id="regions" type="geojson" data="https://raw.githubusercontent.com/loganpowell/census-geojson/master/GeoJSON/5m/2018/county.json">
          <Layer {...regionLayerStyle} />
        </Source>

        {mode === "weather" && (
          <Source id="noaa-radar" type="raster" tiles={["https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0q-900913/{z}/{x}/{y}.png"]} tileSize={256}>
            <Layer id="radar-layer" type="raster" paint={{ "raster-opacity": 0.4 }} />
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
                className="p-3 bg-white/95 backdrop-blur-lg rounded-2xl shadow-xl border border-zinc-100 min-w-[200px]"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: TYPE_COLORS[hoveredPantry.resourceType ?? ""] ?? "#a1a1aa" }} />
                  <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: TYPE_COLORS[hoveredPantry.resourceType ?? ""] ?? "#a1a1aa" }}>
                    {TYPE_LABELS[hoveredPantry.resourceType ?? ""] ?? "Resource"}
                  </span>
                </div>
                <h4 className="text-[12px] font-bold text-zinc-900 leading-tight mb-2">
                  {hoveredPantry.name}
                </h4>
                <div className="flex items-center gap-3 text-[10px] text-zinc-500">
                  {hoveredPantry.rating != null && (
                    <span>{"★"} {Number(hoveredPantry.rating).toFixed(1)}</span>
                  )}
                  {(hoveredPantry.reviewCount ?? 0) > 0 && (
                    <span>{hoveredPantry.reviewCount} reviews</span>
                  )}
                  {hoveredPantry.waitTimeMinutesAverage != null && (
                    <span>{hoveredPantry.waitTimeMinutesAverage}m wait</span>
                  )}
                </div>
                {(hoveredPantry.city || hoveredPantry.state) && (
                  <p className="text-[10px] text-zinc-400 mt-1.5">
                    {[hoveredPantry.city, hoveredPantry.state].filter(Boolean).join(", ")}
                  </p>
                )}
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
            className="absolute top-4 right-16 bottom-4 w-80 bg-white/95 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-zinc-200/50 z-[100] p-6 flex flex-col"
          >
            <div className="flex justify-between items-start mb-5">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: TYPE_COLORS[selectedPantry.resourceType ?? ""] ?? "#a1a1aa" }} />
                  <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: TYPE_COLORS[selectedPantry.resourceType ?? ""] ?? "#a1a1aa" }}>
                    {TYPE_LABELS[selectedPantry.resourceType ?? ""] ?? "Resource"}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-zinc-900 leading-tight">{selectedPantry.name}</h2>
              </div>
              <button onClick={handleClosePanel} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 5L5 15M5 5l10 10" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto pr-2">
              {/* Stats row */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100 text-center">
                  <p className="text-base font-bold text-zinc-900">{selectedPantry.rating != null ? Number(selectedPantry.rating).toFixed(1) : "—"}</p>
                  <p className="text-[9px] font-semibold text-zinc-400 uppercase">Rating</p>
                </div>
                <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100 text-center">
                  <p className="text-base font-bold text-zinc-900">{selectedPantry.reviewCount ?? 0}</p>
                  <p className="text-[9px] font-semibold text-zinc-400 uppercase">Reviews</p>
                </div>
                <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100 text-center">
                  <p className="text-base font-bold text-zinc-900">{selectedPantry.subscribers ?? 0}</p>
                  <p className="text-[9px] font-semibold text-zinc-400 uppercase">Subscribed</p>
                </div>
              </div>

              {/* Wait time */}
              <div className="flex items-center gap-3 p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                <div className={`h-3 w-3 rounded-full animate-pulse ${
                  selectedPantry.waitTimeMinutesAverage == null ? "bg-zinc-400" :
                  Number(selectedPantry.waitTimeMinutesAverage) > 45 ? "bg-red-500" :
                  Number(selectedPantry.waitTimeMinutesAverage) > 20 ? "bg-amber-500" : "bg-[#3DBFAC]"
                }`} />
                <div>
                  <p className="text-sm font-bold text-zinc-900">
                    {selectedPantry.waitTimeMinutesAverage != null ? `${selectedPantry.waitTimeMinutesAverage}m avg wait` : "Wait time unknown"}
                  </p>
                  <p className="text-[10px] text-zinc-500">
                    {selectedPantry.acceptingNewClients ? "Accepting new clients" : "Not accepting new clients"}
                  </p>
                </div>
              </div>

              {/* Location */}
              <section>
                <h3 className="text-[11px] font-bold uppercase text-zinc-400 mb-2">Location</h3>
                <p className="text-sm text-zinc-600 font-medium leading-relaxed">
                  {[selectedPantry.addressStreet1, selectedPantry.city, selectedPantry.state].filter(Boolean).join(", ") || "Address unavailable"}
                </p>
              </section>

              <div className="mt-auto pt-4">
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
