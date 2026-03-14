"use client";

import React, { useState } from 'react';
import Map, { Marker, Popup, NavigationControl, FullscreenControl } from 'react-map-gl/mapbox';

/**
 * Interface representing the shape of our food resource data.
 * This aligns with the Lemontree API structure you shared.
 */
export interface FoodResource {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  addressStreet1?: string;
  city?: string;
  zipCode?: string;
  waitTimeMinutesAverage?: number;
  ratingAverage?: number;
}

interface MapProps {
  dataPoints: FoodResource[];
}

export default function InteractiveMap({ dataPoints }: MapProps) {
  // State to track which marker is currently clicked for the popup
  const [selectedPantry, setSelectedPantry] = useState<FoodResource | null>(null);

  return (
    <div className="relative w-full h-[600px] rounded-xl overflow-hidden shadow-inner border border-gray-200">
      <Map
        initialViewState={{
          longitude: -74.006,
          latitude: 40.7128,
          zoom: 11,
        }}
        mapStyle="mapbox://styles/mapbox/light-v11"
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
      >
        {/* Navigation UI */}
        <NavigationControl position="top-right" />
        <FullscreenControl position="top-right" />

        {/* Render Markers from the Lemontree API Data */}
        {dataPoints.map((point) => (
          <Marker
            key={point.id}
            longitude={point.longitude}
            latitude={point.latitude}
            anchor="bottom"
            // Add the type here: (e: MapLayerMouseEvent)
            onClick={(e: any) => {
            e.originalEvent.stopPropagation();
            setSelectedPantry(point);
            }}
          >
            {/* Custom Marker UI: You can style this to look like a pin */}
            <div className="cursor-pointer transform hover:scale-125 transition-transform">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 21C16.5 16.8 19 13.5 19 9.5C19 5.5 16 2.5 12 2.5C8 2.5 5 5.5 5 9.5C5 13.5 7.5 16.8 12 21Z"
                  fill="#EF4444"
                  stroke="white"
                  strokeWidth="2"
                />
                <circle cx="12" cy="9.5" r="3" fill="white" />
              </svg>
            </div>
          </Marker>
        ))}

        {/* Popup for Data Insights */}
        {selectedPantry && (
          <Popup
            longitude={selectedPantry.longitude}
            latitude={selectedPantry.latitude}
            anchor="top"
            onClose={() => setSelectedPantry(null)}
            closeOnClick={false}
            className="z-50"
          >
            <div className="p-2 max-w-[200px] font-sans">
              <h3 className="font-bold text-gray-900 border-b pb-1 mb-2">
                {selectedPantry.name}
              </h3>
              <p className="text-xs text-gray-600 mb-1">
                {selectedPantry.addressStreet1 || "Location Info N/A"}
              </p>
              
              {/* This is where the AI Data Insights go */}
              <div className="mt-2 pt-2 border-t border-gray-100">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Wait Time:</span>
                  <span className="font-semibold">{selectedPantry.waitTimeMinutesAverage}m</span>
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-gray-500">Rating:</span>
                  <span className="font-semibold">{selectedPantry.ratingAverage?.toFixed(1)}/5</span>
                </div>
              </div>
              <button 
                className="w-full mt-3 bg-blue-600 text-white text-[10px] py-1 rounded hover:bg-blue-700 transition-colors"
                onClick={() => console.log("AI Analysis for Zip:", selectedPantry.zipCode)}
              >
                Analyze Area Impact
              </button>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}