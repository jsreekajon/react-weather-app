import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const googleMarkerIcon = new L.Icon({
  iconUrl: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

function FlyToLocation({ coordinates }) {
  const map = useMap();

  useEffect(() => {
    if (coordinates) {
      map.flyTo(coordinates, 10, { animate: true, duration: 1.5 });
    }
  }, [coordinates, map]);

  return null;
}

export default function WeatherMap({ mapCenter, weather, selectedDay, t, h, l, vpd }) {
  return (
    <MapContainer
      center={mapCenter}
      zoom={10}
      style={{ height: 300, width: "100%", marginBottom: 20 }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <FlyToLocation coordinates={mapCenter} />
      {mapCenter && weather && selectedDay && (
        <Marker position={mapCenter} icon={googleMarkerIcon}>
          <Popup>
            <div>
              <p>วันที่: {selectedDay}</p>
              <p>อุณหภูมิเฉลี่ย: {t} °C</p>
              <p>ความชื้นสัมพัทธ์เฉลี่ย: {h} %</p>
              <p>
                การแผ่รังสีแสงอาทิตย์เฉลี่ย:{" "}
                {l !== undefined ? ((l * 86400) / 1e6).toFixed(2) : "ไม่ระบุ"} MJ/m²/day
              </p>
              <p>VPD (รายวัน): {vpd !== null ? `${vpd} kPa` : "ไม่ระบุ"}</p>
            </div>
          </Popup>
        </Marker>
      )}
    </MapContainer>
  );
}
