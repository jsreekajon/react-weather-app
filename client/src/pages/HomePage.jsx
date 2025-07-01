import React, { useState, useEffect } from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import th from "date-fns/locale/th"; // ✅ เพิ่ม locale ภาษาไทย

registerLocale("th", th); // ✅ ลงทะเบียน locale

export default function HomePage() {
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [weatherData, setWeatherData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const formatDate = (date) => date.toISOString().split("T")[0];

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg("");
    const start = formatDate(startDate);
    const end = formatDate(endDate);

    try {
      const res = await fetch(
        `http://localhost:3001/api/weather-range?start=${start}&end=${end}`
      );
      if (!res.ok) throw new Error("โหลดข้อมูลล้มเหลว");
      const data = await res.json();
      setWeatherData(data);
    } catch (err) {
      console.error("❌ Error:", err);
      setErrorMsg("ไม่สามารถโหลดข้อมูลจาก Node-RED ได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
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
            locale="th" // ✅ ตั้งค่า locale ภาษาไทย
            dateFormat="dd-MM-yyyy" // ✅ รูปแบบ วัน-เดือน-ปี
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
        <button onClick={fetchData} style={{ alignSelf: "end" }}>
          โหลดข้อมูล
        </button>
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
