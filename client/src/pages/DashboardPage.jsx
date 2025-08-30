import React, { useState, useEffect, useRef } from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import th from "date-fns/locale/th";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../firebase";
import useFetchProfile from "../hooks/useFetchProfile";

registerLocale("th", th);

export default function DashboardPage() {
  const [user] = useAuthState(auth); // ดึงผู้ใช้จาก Firebase Auth
  useFetchProfile();

  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [weatherData, setWeatherData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const formatDate = (date) => date.toISOString().split("T")[0];

  // Visual Crossing API keys
  const API_KEYS = [
    "8GEWAKR6AXWDET8C3DVV787XW",
    "W5VMZDF42HAR6S9RJTSLX2MJY",
    "D2HBXFV5VCMLAV8U4C32EUUNK"
  ];
  let apiKeyIndex = 0;
  function getApiKey() {
    return API_KEYS[apiKeyIndex];
  }
  function rotateApiKey() {
    apiKeyIndex = (apiKeyIndex + 1) % API_KEYS.length;
    return getApiKey();
  }

  // Debounce & cache
  const debounceRef = useRef();
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      setErrorMsg("");
      const start = formatDate(startDate);
      const end = formatDate(endDate);
      const location = "Bangkok,TH"; // สามารถปรับจังหวัดได้
      const cacheKey = `weather_${location}_${start}_${end}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        setWeatherData(JSON.parse(cached));
        setLoading(false);
        return;
      }
      let tries = 0;
      let lastError = null;
      const fetchData = async () => {
        while (tries < API_KEYS.length) {
          const apiKey = getApiKey();
          const url = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${encodeURIComponent(location)}/${start}/${end}?unitGroup=metric&include=days%2Chours&key=${apiKey}&contentType=json`;
          try {
            const res = await fetch(url);
            if (res.status === 429) {
              rotateApiKey();
              tries++;
              continue;
            }
            if (!res.ok) throw new Error("โหลดข้อมูลล้มเหลว");
            const json = await res.json();
            // Flatten all days
            const tableData = (json.days || []).map(day => ({
              date: day.datetime,
              temp: day.temp,
              humidity: day.humidity,
              solar: day.solarradiation,
              wind: day.windspeed
            }));
            localStorage.setItem(cacheKey, JSON.stringify(tableData));
            setWeatherData(tableData);
            setLoading(false);
            return;
          } catch (err) {
            lastError = err;
            tries++;
            rotateApiKey();
          }
        }
        setErrorMsg("ไม่สามารถโหลดข้อมูลจากเซิร์ฟเวอร์ได้");
        setLoading(false);
      };
      fetchData();
    }, 1000); // debounce 1 วินาที
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line
  }, [startDate, endDate]);

  return (
    <div className="container" style={{ maxWidth: 1000, marginTop: 20 }}>
      <h2>แสดงข้อมูลพยากรณ์อากาศ</h2>

      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <div>
          <label>วันที่เริ่มต้น:</label>
          <DatePicker
            selected={startDate}
            onChange={(d) => setStartDate(d)}
            locale="th"
            dateFormat="dd-MM-yyyy"
          />
        </div>
        <div>
          <label>วันที่สิ้นสุด:</label>
          <DatePicker
            selected={endDate}
            onChange={(d) => setEndDate(d)}
            locale="th"
            dateFormat="dd-MM-yyyy"
          />
        </div>
        {/* Remove the "โหลดข้อมูล" button since useEffect automatically fetches the data */}
      </div>

      {loading ? (
        <p>⏳ กำลังโหลด...</p>
      ) : errorMsg ? (
        <p style={{ color: "red" }}>{errorMsg}</p>
      ) : weatherData.length === 0 ? (
        <p>ไม่พบข้อมูลในช่วงที่เลือก</p>
      ) : (
        <table border="1" cellPadding={8} style={{ width: "100%" }}>
          <thead>
            <tr>
              <th>วันที่</th>
              <th>อุณหภูมิ (°C)</th>
              <th>ความชื้น (%)</th>
              <th>แสงแดด (W/m²)</th>
              <th>ลม (km/h)</th>
              <th>VPD</th>
            </tr>
          </thead>
          <tbody>
            {weatherData.map((item, i) => {
              const svp =
                0.6108 * Math.exp((17.27 * item.temp) / (item.temp + 237.3));
              const avp = (item.humidity / 100) * svp;
              const vpd = (svp - avp).toFixed(3);

              return (
                <tr key={i}>
                  <td>{new Date(item.date).toLocaleDateString("th-TH")}</td>
                  <td>{item.temp}</td>
                  <td>{item.humidity}</td>
                  <td>{item.solar}</td>
                  <td>{item.wind}</td>
                  <td>{vpd}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
