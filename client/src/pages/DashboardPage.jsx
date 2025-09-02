import React, { useState, useEffect, useRef, useMemo } from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import th from "date-fns/locale/th";
import useFetchProfile from "../hooks/useFetchProfile";
import provinces from "../data/provinces";
import Select from "react-select";
import { calculateHourlyETo } from "../utils/calculateETo";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from "recharts";

registerLocale("th", th);

const yAxisOptions = [
  { value: "vpd", label: "VPD (kPa)" },
  { value: "eto", label: "ETo (mm/hr)" },
  { value: "temp", label: "อุณหภูมิ (°C)" },
  { value: "humidity", label: "ความชื้น (%)" },
  { value: "solar", label: "แสงอาทิตย์ (MJ/m²/hr)" },
  { value: "wind", label: "ความเร็วลม (km/h)" },
];

export default function DashboardPage() {
  useFetchProfile();

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
  const [weatherData, setWeatherData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [yAxis, setYAxis] = useState(yAxisOptions[0]);

  const formatDate = (date) => date.toISOString().split("T")[0];

  // สร้าง options dropdown
  const provinceOptions = Object.keys(provinces).map((prov) => ({
    label: prov,
    value: prov,
  }));
  const districtOptions =
    provinces[province.value]?.map((dist) => ({
      label: dist,
      value: dist,
    })) || [];

  // Debounce & cache
  const debounceRef = useRef();
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      setErrorMsg("");
      setWeatherData([]);
      const start = formatDate(startDate);
      const end = formatDate(endDate);
      const location = `${province.value},TH`;
      const cacheKey = `weather_${location}_${start}_${end}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        setWeatherData(JSON.parse(cached));
        setLoading(false);
        return;
      }
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
      let tries = 0;
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
            // Flatten all hours from all days, add date field
            const tableData = [];
            (json.days || []).forEach((day) => {
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
                  date: day.datetime,
                  time: row.datetime,
                  temp: row.temp ?? 0,
                  humidity: row.humidity ?? 0,
                  solar: solarMJ !== null ? parseFloat(solarMJ.toFixed(2)) : 0,
                  wind: row.windspeed ?? 0,
                  vpd: vpd !== "" ? parseFloat(vpd) : null,
                  eto: etoHourly !== null ? parseFloat(etoHourly.toFixed(3)) : null,
                });
              });
            });
            localStorage.setItem(cacheKey, JSON.stringify(tableData));
            setWeatherData(tableData);
            setLoading(false);
            return;
          } catch (err) {
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
  }, [province, district, startDate, endDate]);

  // กรองข้อมูลเฉพาะช่วงวันที่ที่เลือก
  const filteredHourlyData = useMemo(() => {
    const start = formatDate(startDate);
    const end = formatDate(endDate);
    return weatherData.filter(d => d.date >= start && d.date <= end);
  }, [weatherData, startDate, endDate]);

  // Custom Tooltip สำหรับกราฟ
  function CustomTooltip({ active, payload, label }) {
    if (active && payload && payload.length > 0) {
      const data = payload[0].payload;
      // แปลงวันที่เป็น วัน เดือน ปี
      const [year, month, day] = (data.date || "").split("-");
      const dateText = day && month && year ? `${day}-${month}-${year}` : data.date || "";
      return (
        <div style={{ background: "#fff", border: "1px solid #ccc", padding: 8 }}>
          <div>วันที่: {dateText}</div>
          <div>เวลา: {data.time}</div>
          <div>
            {payload[0].name}: {payload[0].value}
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="container" style={{ maxWidth: 1000, marginTop: 20 }}>
      <h2>กราฟข้อมูลอากาศรายชั่วโมง</h2>
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
        <div style={{ minWidth: 200 }}>
          <label>เลือกแกน y:</label>
          <Select
            options={yAxisOptions}
            value={yAxis}
            onChange={setYAxis}
          />
        </div>
      </div>

      {loading ? (
        <p>⏳ กำลังโหลด...</p>
      ) : errorMsg ? (
        <p style={{ color: "red" }}>{errorMsg}</p>
      ) : filteredHourlyData.length === 0 ? (
        <p>ไม่พบข้อมูลในช่วงที่เลือก</p>
      ) : (
        <>
          {/* กราฟ */}
          <ResponsiveContainer width="100%" height={350}>
            <LineChart
              data={filteredHourlyData}
              margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" label={{ value: "เวลา", position: "insideBottom", offset: -5 }} />
              <YAxis
                label={{
                  value: yAxis.label,
                  angle: -90,
                  position: "insideLeft",
                  offset: 10,
                }}
                domain={yAxis.value === "humidity" ? [0, 100] : undefined}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey={yAxis.value}
                stroke="#ff7300"
                strokeWidth={2}
                dot={{ r: 3 }}
                name={yAxis.label}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  );
}
