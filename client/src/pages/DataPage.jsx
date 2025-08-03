import React, { useState } from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import th from "date-fns/locale/th";
import provinces from "../data/provinces";
import * as XLSX from "xlsx";
import Select from "react-select";
import { calculateHourlyETo } from "../utils/calculateETo"; // เพิ่ม import

registerLocale("th", th);

const API_KEY = "8GEWAKR6AXWDET8C3DVV787XW";

export default function DataPage() {
  const defaultProvince = Object.keys(provinces)[0];
  const defaultDistrict = provinces[defaultProvince][0];

  const [province, setProvince] = useState({
    label: defaultProvince,
    value: defaultProvince,
  });
  const [district, setDistrict] = useState({
    label: defaultDistrict,
    value: defaultDistrict,
  });
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const getProvinceLabel = (prov) => prov;
  const getDistrictLabel = (prov, dist) => dist;

  const provinceOptions = Object.keys(provinces).map((prov) => ({
    label: getProvinceLabel(prov),
    value: prov,
  }));
  const districtOptions =
    provinces[province.value]?.map((dist) => ({
      label: getDistrictLabel(province.value, dist),
      value: dist,
    })) || [];

  // ฟังก์ชันแปลงวันที่เป็น วัน-เดือน-ปี
  const formatDateThai = (isoDate) => {
    const [y, m, d] = isoDate.split("-");
    return `${d}-${m}-${y}`;
  };

  const handleFetch = async () => {
    if (!province.value || !district.value) return;
    setLoading(true);
    setData([]);
    try {
      // ดึงข้อมูลจาก Visual Crossing API
      const dateStr = selectedDate.toISOString().slice(0, 10);
      const location = `${province.value},TH`;
      const url = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${encodeURIComponent(
        location
      )}/${dateStr}/${dateStr}?unitGroup=metric&include=hours&key=${API_KEY}&contentType=json`;

      const res = await fetch(url);
      if (!res.ok) throw new Error("โหลดข้อมูลล้มเหลว");
      const json = await res.json();

      // แปลงข้อมูลให้อยู่ในรูปแบบที่ตารางต้องการ พร้อมคำนวณ ETo
      const hourly = json.days?.[0]?.hours || [];
      const tableData = hourly.map((row) => {
        // คำนวณ solar เป็น MJ/m²/hr
        const solarMJ =
          row.solarradiation !== undefined
            ? (row.solarradiation * 3600) / 1e6
            : null;
        // คำนวณ ETo (mm/hr)
        const etoHourly =
          row.temp !== undefined &&
          row.humidity !== undefined &&
          solarMJ !== null
            ? calculateHourlyETo({
                temp: row.temp,
                humidity: row.humidity,
                windSpeed: row.windspeed ?? 2,
                solarRadiation: solarMJ,
                altitude: 100,
              })
            : null;
        // VPD
        const vpd =
          row.temp !== undefined && row.humidity !== undefined
            ? (
                0.6108 *
                  Math.exp((17.27 * row.temp) / (row.temp + 237.3)) -
                (row.humidity / 100) *
                  (0.6108 *
                    Math.exp((17.27 * row.temp) / (row.temp + 237.3)))
              ).toFixed(3)
            : "";
        return {
          date: formatDateThai(dateStr),
          hour: row.datetime,
          temp: row.temp ?? 0,
          humidity: row.humidity ?? 0,
          solar: row.solarradiation ?? 0,
          wind: row.windspeed ?? 0,
          vpd,
          eto: etoHourly !== null ? etoHourly.toFixed(3) : "",
        };
      });

      setData(tableData);
    } catch (e) {
      alert("เกิดข้อผิดพลาดในการโหลดข้อมูล");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!data.length) return;
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "WeatherData");
    // สร้างชื่อไฟล์ตามวันที่ที่เลือก เช่น weather_data(31-07-2025).xlsx
    const dateStr = selectedDate
      ? selectedDate.toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, "-")
      : "unknown";
    XLSX.writeFile(wb, `weather_data(${dateStr}).xlsx`);
  };

  return (
    <div style={{ maxWidth: 900, margin: "30px auto" }}>
      <h2>ค้นหาข้อมูลอากาศ 24 ชั่วโมง (Visual Crossing)</h2>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
        <div style={{ minWidth: 200 }}>
          <label>จังหวัด:</label>
          <Select
            options={provinceOptions}
            value={province}
            onChange={(option) => {
              setProvince(option);
              const firstDistrict = provinces[option.value]?.[0];
              setDistrict({
                label: firstDistrict,
                value: firstDistrict,
              });
            }}
            isSearchable
          />
        </div>
        <div style={{ minWidth: 200 }}>
          <label>อำเภอ:</label>
          <Select
            options={districtOptions}
            value={district}
            onChange={setDistrict}
            isSearchable
            isDisabled={!province.value}
          />
        </div>
        <div>
          <label>วันที่:</label>
          <DatePicker
            selected={selectedDate}
            onChange={setSelectedDate}
            locale="th"
            dateFormat="dd-MM-yyyy"
          />
        </div>
        <button onClick={handleFetch} style={{ alignSelf: "end" }}>
          ค้นหา
        </button>
        <button
          onClick={handleExport}
          style={{ alignSelf: "end" }}
          disabled={!data.length}
        >
          Export Excel
        </button>
      </div>
      {loading ? (
        <p>กำลังโหลดข้อมูล...</p>
      ) : data.length ? (
        <table border="1" cellPadding={6} style={{ width: "100%", fontSize: 14 }}>
          <thead>
            <tr>
              <th>เวลา</th>
              <th>อุณหภูมิ (°C)</th>
              <th>ความชื้น (%)</th>
              <th>แสงอาทิตย์ (MJ/m²/hr)</th>
              <th>ความเร็วลม (km/h)</th>
              <th>VPD (kPa)</th>
              <th>ETo (mm/hr)</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => {
              // แปลงเวลาเป็น HH:mm
              let hourStr = row.hour;
              if (typeof hourStr === "string") {
                // ถ้าเป็น "0:00" หรือ "00:00:00" ให้แสดงเป็น "00:00"
                const parts = hourStr.split(":");
                hourStr = `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
              }
              // แปลง solar เป็น MJ/m²/hr
              const solarMJ =
                row.solarradiation !== undefined
                  ? ((row.solar * 3600) / 1e6).toFixed(2)
                  : row.solar.toFixed(2);

              return (
                <tr key={i}>
                  <td>{hourStr}</td>
                  <td>{row.temp.toFixed(1)}</td>
                  <td>{row.humidity.toFixed(0)}</td>
                  <td>{solarMJ}</td>
                  <td>{row.wind.toFixed(1)}</td>
                  <td>{row.vpd}</td>
                  <td>{row.eto}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
