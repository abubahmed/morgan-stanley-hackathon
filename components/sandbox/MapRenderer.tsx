"use client";

import { useEffect, useRef } from "react";
import type { MapSpec } from "@/types/chat";

interface MapRendererProps {
  spec: MapSpec;
}

export default function MapRenderer({ spec }: MapRendererProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    let map: any;

    async function initMap() {
      const mapboxgl = (await import("mapbox-gl")).default;
      mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

      map = new mapboxgl.Map({
        container: mapRef.current!,
        style: "mapbox://styles/mapbox/light-v11",
        center: spec.markers.length > 0
          ? [spec.markers[0].lng, spec.markers[0].lat]
          : [-74.006, 40.7128],
        zoom: 11,
      });

      mapInstanceRef.current = map;

      map.on("load", () => {
        for (const marker of spec.markers) {
          const el = document.createElement("div");
          el.style.cssText = `
            width: 12px; height: 12px; border-radius: 50%;
            background: ${marker.color ?? "#3DBFAC"};
            border: 2px solid white;
            box-shadow: 0 1px 4px rgba(0,0,0,0.3);
            cursor: pointer;
          `;

          new mapboxgl.Marker({ element: el })
            .setLngLat([marker.lng, marker.lat])
            .setPopup(
              new mapboxgl.Popup({ offset: 12 }).setHTML(
                `<p style="font-size:12px;font-weight:600;color:#1E2D3D;margin:0">${marker.label}</p>`
              )
            )
            .addTo(map);
        }

        // Fit to markers if multiple
        if (spec.markers.length > 1) {
          const bounds = spec.markers.reduce(
            (b, m) => b.extend([m.lng, m.lat]),
            new mapboxgl.LngLatBounds(
              [spec.markers[0].lng, spec.markers[0].lat],
              [spec.markers[0].lng, spec.markers[0].lat]
            )
          );
          map.fitBounds(bounds, { padding: 40, maxZoom: 14 });
        }
      });
    }

    initMap().catch(console.error);

    return () => {
      map?.remove();
      mapInstanceRef.current = null;
    };
  }, [spec]);

  return (
    <div className="rounded-xl overflow-hidden"
      style={{ border: "1px solid rgba(210,195,165,0.45)" }}>
      <div className="px-3 py-2 bg-white/70"
        style={{ borderBottom: "1px solid rgba(210,195,165,0.3)" }}>
        <p className="text-[12px] font-semibold" style={{ color: "#1E2D3D" }}>{spec.title}</p>
        <p className="text-[11px]" style={{ color: "#9AAAB8" }}>{spec.markers.length} location{spec.markers.length !== 1 ? "s" : ""}</p>
      </div>
      <div ref={mapRef} style={{ height: 240 }} />
    </div>
  );
}
