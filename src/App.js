import React, { useState, useEffect, useRef } from "react";
import Select from "react-select";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import provinces from "./provinces";
import provinceCoordinates from "./provinceCoordinates";

const API_KEY = "8GEWAKR6AXWDET8C3DVV787XW";

const googleMarkerIcon = new L.Icon({
  iconUrl: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

export default function WeatherApp() {
  const defaultProvince = Object.keys(provinces)[0];
  const defaultDistrict = provinces[defaultProvince][0];

  const [province, setProvince] = useState({ label: defaultProvince, value: defaultProvince });
  const [district, setDistrict] = useState({ label: defaultDistrict, value: defaultDistrict });
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const mapRef = useRef(null);

  const formatDate = (d) => d.toISOString().slice(0, 10);

  // เมื่อเปลี่ยนจังหวัด รีเซ็ตอำเภอ และสั่งแผนที่ย้ายตำแหน่งและซูมด้วย flyTo
  useEffect(() => {
    const firstDistrict = provinces[province.value][0];
    setDistrict({ label: firstDistrict, value: firstDistrict });

    const coord = provinceCoordinates[province.value];
    if (coord && mapRef.current) {
      // เคลื่อนกล้องไปยังตำแหน่งหมุด พร้อมซูมระดับ 9 ใช้ duration 2 วิ
      mapRef.current.flyTo(coord, 9, { animate: true, duration: 2 });
    }
  }, [province]);

  const fetchWeather = async () => {
    if (!district || !province) return;
    setLoading(true);
    setError(null);
    setWeather(null);

    try {
      const today = new Date();
      const startDate = formatDate(today);
      const endDate = formatDate(new Date(today.setDate(today.getDate() + 7)));

      const location = `${district.value},${province.value},TH`;
      const url = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${encodeURIComponent(
        location
      )}/${startDate}/${endDate}?unitGroup=metric&include=days&key=${API_KEY}&contentType=json`;

      const response = await fetch(url);
      if (!response.ok) throw new Error("ไม่สามารถดึงข้อมูลได้");
      const data = await response.json();
      setWeather(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const provinceOptions = Object.keys(provinces).map((prov) => ({ label: prov, value: prov }));
  const districtOptions = provinces[province.value]?.map((dist) => ({ label: dist, value: dist })) || [];

  return (
    <div style={{ maxWidth: 500, margin: "auto" }}>
      <h2>พยากรณ์อากาศ</h2>

      <MapContainer
        center={[13.736717, 100.523186]} // ตำแหน่งเริ่มต้นกรุงเทพฯ
        zoom={6} // zoom เริ่มต้นกว้างๆ
        style={{ height: 300, width: "100%", marginBottom: 20 }}
        whenCreated={(mapInstance) => {
          mapRef.current = mapInstance;
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {province.value && provinceCoordinates[province.value] && weather && (
          <Marker position={provinceCoordinates[province.value]} icon={googleMarkerIcon}>
            <Popup>
              <div>
                <strong>{weather.resolvedAddress}</strong>
                <ul style={{ paddingLeft: 16 }}>
                  {weather.days.map((day) => (
                    <li key={day.datetime}>
                      {day.datetime}: {day.conditions}, {day.temp} °C
                    </li>
                  ))}
                </ul>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      <label>จังหวัด:</label>
      <Select
        options={provinceOptions}
        value={province}
        onChange={setProvince}
        isSearchable
        styles={{ container: (base) => ({ ...base, marginBottom: 10 }) }}
      />

      <label>อำเภอ:</label>
      <Select
        options={districtOptions}
        value={district}
        onChange={setDistrict}
        isSearchable
        styles={{ container: (base) => ({ ...base, marginBottom: 10 }) }}
      />

      <button onClick={fetchWeather} style={{ padding: 8, width: "100%" }}>
        ดูสภาพอากาศ ({district.label}, {province.label})
      </button>

      {loading && <p>กำลังโหลดข้อมูล...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {weather && (
        <div style={{ marginTop: 20 }}>
          <h3>{weather.resolvedAddress}</h3>
          <p>จังหวัด: {province.label}</p>
          <p>อำเภอ: {district.label}</p>
          <p>วันที่เริ่มต้น: {weather.days[0].datetime}</p>
          <p>วันที่สิ้นสุด: {weather.days[weather.days.length - 1].datetime}</p>

          <h4>พยากรณ์รายวัน</h4>
          <ul>
            {weather.days.map((day) => (
              <li key={day.datetime} style={{ marginBottom: 10 }}>
                <strong>{day.datetime}</strong>: {day.conditions}, อุณหภูมิ {day.temp} °C
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
