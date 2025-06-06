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

  // 1. ซูมตำแหน่งเริ่มต้นตอนเปิดแอป
  useEffect(() => {
  let coord = null;
  const districtKey = `${province.value}_${district.value}`;

  if (provinceCoordinates[districtKey]) {
    coord = provinceCoordinates[districtKey];
  } else if (provinceCoordinates[province.value]) {
    coord = provinceCoordinates[province.value];
  }

  if (coord && mapRef.current) {
    console.log("Initial Zooming to:", coord); // ✅ ตรวจสอบตอนเริ่มต้น
    mapRef.current.flyTo(coord, 12, { animate: true, duration: 2 });
  }
}, []);


  // 2. รีเซ็ตอำเภอเมื่อเปลี่ยนจังหวัด
  useEffect(() => {
    const firstDistrict = provinces[province.value]?.[0];
    if (firstDistrict) {
      setDistrict({ label: firstDistrict, value: firstDistrict });
    }
  }, [province]);

  // 3. ซูมไปยังจังหวัดใหม่ทันทีหลังเลือก
useEffect(() => {
  if (!province.value || !district.value || !mapRef.current) return;

  const districtKey = `${province.value}_${district.value}`;
  const districtCoord = provinceCoordinates[districtKey];
  const provinceCoord = provinceCoordinates[province.value];

  const coord = districtCoord || provinceCoord;

  if (coord) {
    mapRef.current.flyTo(coord, districtCoord ? 12 : 9, {
      animate: true,
      duration: 1.5,
    });
  } else {
    console.warn("ไม่พบพิกัดสำหรับ:", districtKey, "หรือ", province.value);
  }
}, [province, district]);


  // 4. ซูมไปที่อำเภอ เมื่อเลือกเสร็จ
  useEffect(() => {
  if (!province.value || !district.value || !mapRef.current) return;

  const districtKey = `${province.value}_${district.value}`;
  const districtCoord = provinceCoordinates[districtKey];
  const provinceCoord = provinceCoordinates[province.value];

  const coord = districtCoord || provinceCoord;

  if (coord) {
    console.log("Zooming to:", coord); // ✅ แสดงค่าพิกัดจริงใน console

    mapRef.current.flyTo(coord, districtCoord ? 12 : 9, {
      animate: true,
      duration: 1.5,
    });
  } else {
    console.warn("ไม่พบพิกัดสำหรับ:", districtKey, "หรือ", province.value);
  }
}, [province, district]);


  // 5. โหลดข้อมูลพยากรณ์อากาศเมื่อ province หรือ district เปลี่ยน
  // 5. โหลดข้อมูลพยากรณ์อากาศเมื่อ province หรือ district เปลี่ยน
useEffect(() => {
  const fetchWeather = async () => {
    if (!district || !province) return;
    setLoading(true);
    setError(null);
    setWeather(null);

    try {
      const today = new Date();
      const startDate = formatDate(today);
      const endDate = formatDate(new Date(today.setDate(today.getDate() + 7)));

      const location = `${province.value},TH`; // ✅ ใช้เฉพาะจังหวัด (ปลอดภัยกว่า)
      const encodedLocation = encodeURIComponent(location); // ✅ encode แค่ 1 ครั้ง

      const url = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${encodedLocation}/${startDate}/${endDate}?unitGroup=metric&include=days&key=${API_KEY}&contentType=json`;

      // ✅ Debug
      console.log("Requesting weather for:", location);
      console.log("Full URL:", url);

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

  fetchWeather();
}, [province, district]);


  const provinceOptions = Object.keys(provinces).map((prov) => ({ label: prov, value: prov }));
  const districtOptions = provinces[province.value]?.map((dist) => ({ label: dist, value: dist })) || [];

  return (
    <div style={{ maxWidth: 500, margin: "auto" }}>
      <h2>พยากรณ์อากาศ</h2>

    <MapContainer
      center={[13.736717, 100.523186]}
      zoom={6}
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

      <button onClick={() => {}} style={{ padding: 8, width: "100%" }} disabled>
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
