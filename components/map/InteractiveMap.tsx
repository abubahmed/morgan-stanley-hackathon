"use client";

import React, { useState } from "react";
import Map, { Marker, Popup, NavigationControl } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

export interface FoodResource {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  addressStreet1?: string;
  waitTimeMinutesAverage?: number;
  zipCode?: string;
}

interface MapProps {
  dataPoints: FoodResource[];
  onViewTrends?: (pantry: FoodResource) => void;
}

export default function InteractiveMap({ dataPoints, onViewTrends }: MapProps) {
  const [selectedPantry, setSelectedPantry] = useState<FoodResource | null>(null);

  const getStatusColor = (waitTime: number | undefined | null) => {
    if (waitTime === undefined || waitTime === null) return "bg-zinc-400";
    if (waitTime > 45) return "bg-red-500";
    if (waitTime > 20) return "bg-amber-500";
    return "bg-emerald-500";
  };

  const validPoints = React.useMemo(() => {
    return (
      dataPoints?.filter((point) => {
        const lat = Number(point.latitude);
        const lng = Number(point.longitude);
        return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
      }) || []
    );
  }, [dataPoints]);

  return (
    <div className="w-full h-full relative overflow-hidden rounded-2xl border border-zinc-200 shadow-sm bg-zinc-50">
      <Map
        initialViewState={{ longitude: -73.9442, latitude: 40.6782, zoom: 11 }}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/light-v11"
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
      >
        <NavigationControl position="top-right" />

        {validPoints.map((point) => {
          const waitTime = point.waitTimeMinutesAverage;
          return (
            <Marker
              key={point.id}
              longitude={Number(point.longitude)}
              latitude={Number(point.latitude)}
              anchor="bottom"
              onClick={(e: any) => {
                e.originalEvent.stopPropagation();
                setSelectedPantry(point);
              }}
            >
              <div className="cursor-pointer group relative flex flex-col items-center">
                {waitTime !== null && waitTime !== undefined && waitTime > 45 && (
                  <div className="absolute inset-0 w-5 h-5 bg-red-400 rounded-full animate-ping opacity-20" />
                )}
                <div
                  className={`w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm transition-all group-hover:scale-110 ${getStatusColor(waitTime)}`}
                />
              </div>
            </Marker>
          );
        })}

        {selectedPantry && (
          <Popup
            longitude={Number(selectedPantry.longitude)}
            latitude={Number(selectedPantry.latitude)}
            anchor="top"
            offset={12}
            onClose={() => setSelectedPantry(null)}
            closeOnClick={false}
            maxWidth="240px"
          >
            <div className="p-1 font-sans text-zinc-800">
              <div className="mb-3">
                <h4 className="text-sm font-semibold leading-tight text-zinc-900">{selectedPantry.name}</h4>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  {selectedPantry.addressStreet1 || "No address provided"}
                </p>
              </div>
              <div className="flex gap-2 mb-4">
                <div className="flex-1 bg-zinc-100/50 p-2 rounded-lg border border-zinc-200/40 text-center">
                  <p className="text-[9px] font-medium text-zinc-400 uppercase tracking-tight">Wait Time</p>
                  <p className="text-xs font-semibold text-zinc-700">
                    {selectedPantry.waitTimeMinutesAverage != null
                      ? `${selectedPantry.waitTimeMinutesAverage}m`
                      : "Unknown"}
                  </p>
                </div>
                <div className="flex-1 bg-zinc-100/50 p-2 rounded-lg border border-zinc-200/40 text-center">
                  <p className="text-[9px] font-medium text-zinc-400 uppercase tracking-tight">Zip Code</p>
                  <p className="text-xs font-semibold text-zinc-700">{selectedPantry.zipCode || "N/A"}</p>
                </div>
              </div>
              {onViewTrends && (
                <button
                  className="w-full text-white text-[11px] font-medium py-2 rounded-lg transition-all shadow-sm active:scale-95"
                  style={{ background: "linear-gradient(135deg, #3DBFAC 0%, #27A090 100%)" }}
                  onClick={() => onViewTrends(selectedPantry)}
                >
                  View Detailed Trends
                </button>
              )}
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}
