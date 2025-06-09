import React, { useState, useEffect, useRef, useMemo } from "react";
import Select from "react-select";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
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

function FlyToLocation({ coordinates }) {
  const map = useMap();
  useEffect(() => {
    if (coordinates) {
      map.flyTo(coordinates, 10, { animate: true, duration: 1.5 });
    }
  }, [coordinates, map]);

  return null;
}

export default function WeatherApp() {
  const defaultProvince = Object.keys(provinces)[0];
  const defaultDistrict = provinces[defaultProvince][0];

  const [province, setProvince] = useState({ label: defaultProvince, value: defaultProvince });
  const [district, setDistrict] = useState({ label: defaultDistrict, value: defaultDistrict });
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [t, setT] = useState(null);
  const [h, setH] = useState(null);
  const [l, setL] = useState(null);

  const formatDate = (d) => d.toISOString().slice(0, 10);

  useEffect(() => {
    const firstDistrict = provinces[province.value]?.[0];
    if (firstDistrict) {
      setDistrict({ label: firstDistrict, value: firstDistrict });
    }
  }, [province]);

  useEffect(() => {
    const fetchWeather = async () => {
      if (!district || !province) return;
      setLoading(true);
      setError(null);
      setWeather(null);

      try {
        const today = new Date();
        const startDate = formatDate(today);
        const endDate = formatDate(new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000));

        const location = `${province.value},TH`;
        const encodedLocation = encodeURIComponent(location);

        const url = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${encodedLocation}/${startDate}/${endDate}?unitGroup=metric&include=days%2Chours&key=${API_KEY}&contentType=json`;

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

  useEffect(() => {
    if (weather && weather.days && weather.days.length > 0) {
      setSelectedDay(weather.days[0].datetime);
    }
  }, [weather]);

  useEffect(() => {
    if (weather && selectedDay) {
      const dayData = weather.days.find((day) => day.datetime === selectedDay);
      if (dayData) {
        setT(dayData.temp);
        setH(dayData.humidity);
        setL(dayData.uvindex);
        console.log("จังหวัด", province.label, "อำเภอ", district.label, "วันที่:", selectedDay, "อุณหภูมิเฉลี่ย:", dayData.temp, "°C", "ความชื้นสัมพัทธ์เฉลี่ย:", dayData.humidity, "%", "UV Index เฉลี่ย:", dayData.uvindex !== undefined ? dayData.uvindex : "ไม่ระบุ");
      }
    }
  }, [weather, selectedDay]);

  const vpd = useMemo(() => {
    if (t !== null && h !== null) {
      const svp = 0.6108 * Math.exp((17.27 * t) / (t + 237.3));
      const avp = (h / 100) * svp;
      return parseFloat((svp - avp).toFixed(3));
    }
    return null;
  }, [t, h]);

  const calcVPD = (tempC, humidity) => {
    const svp = 0.6108 * Math.exp((17.27 * tempC) / (tempC + 237.3));
    const avp = (humidity / 100) * svp;
    return parseFloat((svp - avp).toFixed(3));
  };

  const provinceOptions = Object.keys(provinces).map((prov) => ({ label: prov, value: prov }));
  const districtOptions = provinces[province.value]?.map((dist) => ({ label: dist, value: dist })) || [];
  const dayOptions = weather?.days.map((day) => ({ label: day.datetime, value: day.datetime })) || [];

  const coordKey = `${province.value}_${district.value}`;
  const mapCenter = provinceCoordinates[coordKey] || provinceCoordinates[province.value];

  const hourlyData = useMemo(() => {
    if (!weather || !selectedDay) return [];
    const day = weather.days.find((d) => d.datetime === selectedDay);
    return day?.hours || [];
  }, [weather, selectedDay]);

  return (
    <div style={{ maxWidth: 600, margin: "auto" }}>
      <h2>พยากรณ์อากาศ</h2>

      <MapContainer
        center={[13.736717, 100.523186]}
        zoom={6}
        style={{ height: 300, width: "100%", marginBottom: 20 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FlyToLocation coordinates={mapCenter} />
        {mapCenter && weather && selectedDay && (
          <Marker position={mapCenter} icon={googleMarkerIcon}>
            <Popup>
              <div>
                <strong>{weather.resolvedAddress}</strong>
                <p>วันที่: {selectedDay}</p>
                <p>อุณหภูมิเฉลี่ย: {t} °C</p>
                <p>ความชื้นสัมพัทธ์เฉลี่ย: {h} %</p>
                <p>UV Index เฉลี่ย: {l !== undefined ? l : "ไม่ระบุ"}</p>
                <p>VPD (รายวัน): {vpd !== null ? vpd + " kPa" : "ไม่ระบุ"}</p>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      <label>จังหวัด:</label>
      <Select options={provinceOptions} value={province} onChange={setProvince} isSearchable styles={{ container: (base) => ({ ...base, marginBottom: 10 }) }} />

      <label>อำเภอ:</label>
      <Select options={districtOptions} value={district} onChange={setDistrict} isSearchable styles={{ container: (base) => ({ ...base, marginBottom: 10 }) }} />

      {weather && (
        <>
          <label>เลือกวันที่:</label>
          <Select options={dayOptions} value={dayOptions.find((opt) => opt.value === selectedDay)} onChange={(option) => setSelectedDay(option.value)} isSearchable={false} styles={{ container: (base) => ({ ...base, marginBottom: 10 }) }} />
        </>
      )}

      {loading && <p>กำลังโหลดข้อมูล...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {weather && selectedDay && (
        <div style={{ marginTop: 20 }}>
          <h3>{weather.resolvedAddress}</h3>
          <p>จังหวัด: {province.label}</p>
          <p>อำเภอ: {district.label}</p>
          <p>วันที่: {selectedDay}</p>

          <h4>สภาพอากาศรายวัน</h4>
          <ul>
            {weather.days.filter((day) => day.datetime === selectedDay).map((day) => (
              <li key={day.datetime}>
                สภาพอากาศ: {day.conditions}<br />
                อุณหภูมิเฉลี่ย: {day.temp} °C<br />
                ความชื้นสัมพัทธ์เฉลี่ย: {day.humidity}%<br />
                UV Index เฉลี่ย: {day.uvindex !== undefined ? day.uvindex : "ไม่ระบุ"}<br />
                VPD (รายวัน): {vpd !== null ? `${vpd} kPa` : "ไม่ระบุ"}
              </li>
            ))}
          </ul>

          <h4>สภาพอากาศรายชั่วโมง</h4>
          {hourlyData.length === 0 ? (
            <p>ไม่มีข้อมูลรายชั่วโมง</p>
          ) : (
            <table border="1" cellPadding="5" style={{ borderCollapse: "collapse", width: "100%" }}>
              <thead>
                <tr>
                  <th>เวลา</th>
                  <th>อุณหภูมิ (°C)</th>
                  <th>ความชื้น (%)</th>
                  <th>UV Index</th>
                  <th>VPD (kPa)</th>
                </tr>
              </thead>
              <tbody>
                {hourlyData.map((hour) => (
                  <tr key={hour.datetime}>
                    <td>{hour.datetimeEpoch ? new Date(hour.datetimeEpoch * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "ไม่ระบุ"}</td>
                    <td>{hour.temp !== undefined ? hour.temp.toFixed(1) : "ไม่ระบุ"}</td>
                    <td>{hour.humidity !== undefined ? hour.humidity.toFixed(0) : "ไม่ระบุ"}</td>
                    <td>{hour.uvindex !== undefined ? hour.uvindex : "ไม่ระบุ"}</td>
                    <td>{hour.temp !== undefined && hour.humidity !== undefined ? calcVPD(hour.temp, hour.humidity) : "ไม่ระบุ"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
