"use client";

import React, { useState } from 'react';
import Map, { Marker, Popup, NavigationControl } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { getFlyerUrl } from '@/lib/lemontree_api';

export interface FoodResource {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  addressStreet1?: string;
  waitTimeMinutesAverage?: number;
}

interface MapProps {
  dataPoints: FoodResource[];
}

export default function InteractiveMap({ dataPoints }: MapProps) {
  const [selectedPantry, setSelectedPantry] = useState<FoodResource | null>(null);

  return (
    <div className="w-full h-full">
      <Map
        initialViewState={{
          longitude: -73.9442,
          latitude: 40.6782,
          zoom: 11,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/light-v11"
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
      >
        <NavigationControl position="top-right" />

        {dataPoints.map((point) => (
          <Marker
            key={point.id}
            longitude={Number(point.longitude)}
            latitude={Number(point.latitude)}
            anchor="bottom"
          >
            <button
              className="p-1 bg-blue-600 rounded-full border-2 border-white shadow-md hover:bg-red-500 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedPantry(point);
              }}
            >
              <div className="w-2 h-2 bg-white rounded-full" />
            </button>
          </Marker>
        ))}

        {selectedPantry && (
          <Popup
            longitude={Number(selectedPantry.longitude)}
            latitude={Number(selectedPantry.latitude)}
            anchor="top"
            onClose={() => setSelectedPantry(null)}
          >
            <div className="p-2 text-zinc-900 min-w-[150px]">
              <h4 className="font-bold text-xs mb-1">{selectedPantry.name}</h4>
              <p className="text-[10px] text-zinc-500 mb-3">{selectedPantry.addressStreet1}</p>
              
              <a 
                href={getFlyerUrl(Number(selectedPantry.latitude), Number(selectedPantry.longitude))}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center text-[10px] bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700"
              >
                Download Schedule PDF
              </a>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}