import React, { useState, useRef } from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import th from "date-fns/locale/th";
import provinces from "../data/provinces";
import * as XLSX from "xlsx";
import Select from "react-select";
import { calculateHourlyETo } from "../utils/calculateETo"; // เพิ่ม import

registerLocale("th", th);

// ✅ เก็บฝั่ง new-data
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
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
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

  const formatDateThai = (isoDate) => {
    const [y, m, d] = isoDate.split("-");
    return `${d}-${m}-${y}`;
  };

  // Debounce & cache
  const debounceRef = useRef();
  const handleFetch = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (!province.value || !district.value) return;
      setLoading(true);
      setData([]);
      // Format start and end date
      const startStr = startDate.toISOString().slice(0, 10);
      const endStr = endDate.toISOString().slice(0, 10);
      const location = `${province.value},TH`;
      const cacheKey = `weather_${location}_${startStr}_${endStr}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        setData(JSON.parse(cached));
        setLoading(false);
        return;
      }
      let tries = 0;
      while (tries < API_KEYS.length) {
        const apiKey = getApiKey();
        const url = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${encodeURIComponent(location)}/${startStr}/${endStr}?unitGroup=metric&include=days%2Chours&key=${apiKey}&contentType=json`;
        try {
          const res = await fetch(url);
          if (res.status === 429) {
            rotateApiKey();
            tries++;
            continue;
          }
          if (!res.ok) throw new Error("โหลดข้อมูลล้มเหลว");
          const json = await res.json();
          // Flatten all hours from all days, add date field
          const tableData = [];
          (json.days || []).forEach((day) => {
            const dateLabel = formatDateThai(day.datetime);
            (day.hours || []).forEach((row) => {
              const solarMJ =
                row.solarradiation !== undefined
                  ? (row.solarradiation * 3600) / 1e6
                  : null;
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
              const vpd =
                row.temp !== undefined && row.humidity !== undefined
                  ? (
                      0.6108 * Math.exp((17.27 * row.temp) / (row.temp + 237.3)) -
                      (row.humidity / 100) *
                        (0.6108 * Math.exp((17.27 * row.temp) / (row.temp + 237.3)))
                    ).toFixed(3)
                  : "";
              tableData.push({
                date: dateLabel,
                hour: row.datetime,
                temp: row.temp ?? 0,
                humidity: row.humidity ?? 0,
                solar: row.solarradiation ?? 0,
                wind: row.windspeed ?? 0,
                vpd,
                eto: etoHourly !== null ? etoHourly.toFixed(3) : "",
              });
            });
          });
          localStorage.setItem(cacheKey, JSON.stringify(tableData));
          setData(tableData);
          setLoading(false);
          return;
        } catch (e) {
          tries++;
          rotateApiKey();
        }
      }
      alert("เกิดข้อผิดพลาดในการโหลดข้อมูล");
      setLoading(false);
    }, 1000); // debounce 1 วินาที
  };

  const handleExport = () => {
    if (!data.length) return;
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "WeatherData");
    const startStr = startDate
      ? startDate
          .toLocaleDateString("th-TH", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })
          .replace(/\//g, "-")
      : "unknown";
    const endStr = endDate
      ? endDate
          .toLocaleDateString("th-TH", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })
          .replace(/\//g, "-")
      : "unknown";
    XLSX.writeFile(wb, `weather_data(${startStr}_to_${endStr}).xlsx`);
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
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <label>วันที่เริ่มต้น:</label>
          <DatePicker
            selected={startDate}
            onChange={setStartDate}
            locale="th"
            dateFormat="dd-MM-yyyy"
          />
          <label>วันที่สิ้นสุด:</label>
          <DatePicker
            selected={endDate}
            onChange={setEndDate}
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
        <table
          border="1"
          cellPadding={6}
          style={{ width: "100%", fontSize: 14 }}
        >
          <thead>
            <tr>
              <th>วันที่</th>
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
              let hourStr = row.hour;
              if (typeof hourStr === "string") {
                const parts = hourStr.split(":");
                hourStr = `${parts[0].padStart(2, "0")}:${parts[1].padStart(
                  2,
                  "0"
                )}`;
              }
              const solarMJ =
                row.solar !== undefined
                  ? ((row.solar * 3600) / 1e6).toFixed(2)
                  : row.solar.toFixed(2);

              // ✅ เช็คว่าเป็นเวลา 00:00
              const isMidnight = hourStr === "00:00";

              return (
                <tr
                  key={i}
                  style={isMidnight ? { backgroundColor: "#eee" } : {}}
                >
                  <td>{row.date}</td>
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
