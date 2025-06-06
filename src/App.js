import React, { useState, useEffect } from "react";
import Select from "react-select";
import provinces from "./provinces";

const API_KEY = "8GEWAKR6AXWDET8C3DVV787XW";

export default function WeatherApp() {
  const [province, setProvince] = useState({ label: "กรุงเทพมหานคร", value: "กรุงเทพมหานคร" });
  const [district, setDistrict] = useState({ label: provinces["กรุงเทพมหานคร"][0], value: provinces["กรุงเทพมหานคร"][0] });
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const formatDate = (d) => d.toISOString().slice(0, 10);

  useEffect(() => {
    const firstDistrict = provinces[province.value][0];
    setDistrict({ label: firstDistrict, value: firstDistrict });
  }, [province]);

  const fetchWeather = async () => {
    if (!district || !province) return;
    setLoading(true);
    setError(null);
    setWeather(null);

    try {
      const today = new Date();
      const startDate = formatDate(today);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const endDate = formatDate(futureDate);

      const location = `${district.value},${province.value},TH`;
      const locationEncoded = encodeURIComponent(location);

      const url = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${locationEncoded}/${startDate}/${endDate}?unitGroup=metric&include=days&key=${API_KEY}&contentType=json`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("ไม่สามารถดึงข้อมูลได้");
      }
      const data = await response.json();
      setWeather(data);
    } catch (err) {
      setError(err.message);
      setWeather(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
  }, []);

  // แปลงจังหวัด/อำเภอ เป็น format ที่ใช้กับ react-select
  const provinceOptions = Object.keys(provinces).map((prov) => ({
    label: prov,
    value: prov,
  }));

  const districtOptions = province.value
    ? provinces[province.value].map((dist) => ({
        label: dist,
        value: dist,
      }))
    : [];

  return (
    <div style={{ maxWidth: 400, margin: "auto", fontFamily: "Arial" }}>
      <h2>พยากรณ์อากาศ</h2>

      <label>จังหวัด:</label>
      <Select
        options={provinceOptions}
        value={province}
        onChange={setProvince}
        placeholder="เลือกจังหวัด"
        isSearchable
        styles={{ container: (base) => ({ ...base, marginBottom: 10 }) }}
      />

      <label>อำเภอ:</label>
      <Select
        options={districtOptions}
        value={district}
        onChange={setDistrict}
        placeholder="เลือกอำเภอ"
        isSearchable
        styles={{ container: (base) => ({ ...base, marginBottom: 10 }) }}
      />

      <button onClick={fetchWeather} style={{ padding: 8, width: "100%" }}>
        ดูสภาพอากาศ
      </button>

      {loading && <p>กำลังโหลดข้อมูล...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {weather && (
        <div style={{ marginTop: 20 }}>
          <h3>{weather.resolvedAddress}</h3>
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
