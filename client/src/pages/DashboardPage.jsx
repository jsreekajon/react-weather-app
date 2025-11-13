import React, { useState, useEffect, useRef, useMemo } from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import th from "date-fns/locale/th";
import useFetchProfile from "../hooks/useFetchProfile";
import provinces from "../data/provinces";
import provinceEn from "../data/provinceEn"; // เพิ่ม
import districtEn from "../data/districtEn"; // เพิ่ม
import Select from "react-select";
import { calculateHourlyETo } from "../utils/calculateETo";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { useLanguage } from "../contexts/LanguageContext"; // เพิ่ม
import provinceCoordinates from "../data/provinceCoordinates";
import GoogleLoginModal from "../components/GoogleLoginModal";
import { logPageView, logDashboardSummary } from "../utils/analytics";
import { useAuthState } from "react-firebase-hooks/auth"; 
import { auth } from "../firebase";


registerLocale("th", th);

function getYAxisOptions(currentLang) {
  const isEn = currentLang === "en";
  return [
    { value: "vpd", label: isEn ? "VPD (kPa)" : "VPD (kPa)" },
    { value: "eto", label: isEn ? "ETo (mm/hr)" : "ETo (mm/hr)" },
    { value: "temp", label: isEn ? "Temperature (°C)" : "อุณหภูมิ (°C)" },
    { value: "humidity", label: isEn ? "Humidity (%)" : "ความชื้น (%)" },
    {
      value: "solar",
      label: isEn ? "Solar (MJ/m²/hr)" : "แสงอาทิตย์ (MJ/m²/hr)",
    },
    { value: "wind", label: isEn ? "Wind speed (km/h)" : "ความเร็วลม (km/h)" },
  ];
}

export default function DashboardPage() {
  useFetchProfile();
  const [user] = useAuthState(auth);
  const { lang, setLang } = useLanguage(); // ใช้ context

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
  const [yAxis, setYAxis] = useState(getYAxisOptions(lang)[0]);

  // Log page view
  useEffect(() => {
    if (user && province?.value) {
      logPageView(user, "DashboardPage", {
        province: province.value,
        district: district.value,
      });
    }
  }, [user, province?.value, district?.value]);

  // อัปเดต label ของ yAxis ตามภาษา แต่คงค่า value เดิม
  useEffect(() => {
    const options = getYAxisOptions(lang);
    setYAxis(
      (prev) => options.find((opt) => opt.value === prev?.value) || options[0]
    );
  }, [lang]);

  // เพิ่ม translations สำหรับปุ่มภาษา
  const translations = {
    th: {
      langBtn: "EN",
      title: "กราฟข้อมูลอากาศรายชั่วโมง",
      province: "จังหวัด:",
      district: "อำเภอ:",
      startDate: "วันที่เริ่มต้น:",
      endDate: "วันที่สิ้นสุด:",
      yAxis: "เลือกแกน y:",
      loading: "⏳ กำลังโหลด...",
      error: "ไม่สามารถโหลดข้อมูลจากเซิร์ฟเวอร์ได้",
      notFound: "ไม่พบข้อมูลในช่วงที่เลือก",
      chartTime: "เวลา",
      dateLabel: "วันที่",
      timeLabel: "เวลา",
    },
    en: {
      langBtn: "TH",
      title: "Hourly Weather Data Chart",
      province: "Province:",
      district: "District:",
      startDate: "Start date:",
      endDate: "End date:",
      yAxis: "Select y axis:",
      loading: "⏳ Loading...",
      error: "Failed to load data from server",
      notFound: "No data found in selected range",
      chartTime: "Time",
      dateLabel: "Date",
      timeLabel: "Time",
    },
  };
  const t_ = translations[lang];

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getProvinceLabel = (prov) =>
    lang === "en" ? provinceEn[prov] || prov : prov;

  const getDistrictLabel = (prov, dist) => {
    if (lang === "en") {
      const provEn = provinceEn[prov] || prov;
      return districtEn[provEn]?.[dist] || dist;
    }
    return dist;
  };

  // สร้าง options dropdown
  const provinceOptions = Object.keys(provinces).map((prov) => ({
    label: getProvinceLabel(prov),
    value: prov,
  }));
  const districtOptions =
    provinces[province.value]?.map((dist) => ({
      label: getDistrictLabel(province.value, dist),
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
      // Normalize date range to ensure start <= end
      const startD = new Date(startDate);
      const endD = new Date(endDate);
      const startFirst = startD <= endD ? startD : endD;
      const endLast = startD <= endD ? endD : startD;
      const start = formatDate(startFirst);
      const end = formatDate(endLast);
      
      const coords = provinceCoordinates[province.value];
      const location = coords ? `${coords[0]},${coords[1]}` : `${province.value},TH`;

      console.log("province", province ,"coords", coords, "location", location);
      // const location = `${district.value},${province.value},TH`;


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
        "D2HBXFV5VCMLAV8U4C32EUUNK",
        "RAC3VSK24LPDLNDJHNX84UA4A",
        "M9T85BKN7MTSP9MVVKU9TRX6B",
        "BZLDWWXWNSSJ6NA622JC7BWZQ"
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
          const url = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${encodeURIComponent(
            location
          )}/${start}/${end}?unitGroup=metric&include=days%2Chours&key=${apiKey}&contentType=json`;
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
                        0.6108 *
                          Math.exp((17.27 * row.temp) / (row.temp + 237.3)) -
                        (row.humidity / 100) *
                          (0.6108 *
                            Math.exp((17.27 * row.temp) / (row.temp + 237.3)))
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
                  eto:
                    etoHourly !== null
                      ? parseFloat(etoHourly.toFixed(3))
                      : null,
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
    return weatherData.filter((d) => d.date >= start && d.date <= end);
  }, [weatherData, startDate, endDate]);

  // Compute Y axis domain: ensure max has +1 unit padding (except humidity)
  const yDomain = useMemo(() => {
    if (!filteredHourlyData || !filteredHourlyData.length) return undefined;
    if (yAxis?.value === "humidity") return [0, 100];
    const vals = filteredHourlyData
      .map((d) => d[yAxis?.value])
      .filter((v) => typeof v === "number" && !isNaN(v));
    if (!vals.length) return undefined;
    const max = Math.max(...vals);
    const min = Math.min(...vals);
    // if flat line, give a small padding below as well
    if (max === min) return [min - 1, max + 1];
    return [min, max + 1];
  }, [filteredHourlyData, yAxis]);

  // Custom Tooltip สำหรับกราฟ
  function CustomTooltip({ active, payload, label }) {
    if (active && payload && payload.length > 0) {
      const data = payload[0].payload;
      // แปลงวันที่เป็น วัน เดือน ปี
      const [year, month, day] = (data.date || "").split("-");
      const dateText =
        day && month && year ? `${day}-${month}-${year}` : data.date || "";
      return (
        <div
          style={{ background: "#fff", border: "1px solid #ccc", padding: 8 }}
        >
          <div>
            {t_.dateLabel}: {dateText}
          </div>
          <div>
            {t_.timeLabel}: {data.time}
          </div>
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
      <GoogleLoginModal />
      
      <button
        style={{ float: "right", marginTop: 10 }}
        onClick={() => setLang(lang === "th" ? "en" : "th")}
      >
        {t_.langBtn}
      </button>
      <h2>{t_.title}</h2>
      <div
        style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}
      >
        <div style={{ minWidth: 200 }}>
          <label>{t_.province}</label>
          <Select
            options={provinceOptions}
            value={{
              label: getProvinceLabel(province.value),
              value: province.value,
            }}
            onChange={(option) => {
              setProvince(option);
              const firstDistrict = provinces[option.value]?.[0];
              setDistrict({
                label: getDistrictLabel(option.value, firstDistrict),
                value: firstDistrict,
              });
            }}
            isSearchable
          />
        </div>
        <div style={{ minWidth: 200 }}>
          <label>{t_.district}</label>
          <Select
            options={districtOptions}
            value={{
              label: getDistrictLabel(province.value, district.value),
              value: district.value,
            }}
            onChange={setDistrict}
            isSearchable
            isDisabled={!province.value}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <label>{t_.startDate}</label>
          <DatePicker
            selected={startDate}
            onChange={setStartDate}
            locale={lang}
            dateFormat={lang === "th" ? "dd-MM-yyyy" : "dd-MM-yyyy"}
          />
          <label>{t_.endDate}</label>
          <DatePicker
            selected={endDate}
            onChange={setEndDate}
            locale={lang}
            dateFormat={lang === "th" ? "dd-MM-yyyy" : "dd-MM-yyyy"}
          />
        </div>
        <div style={{ minWidth: 200 }}>
          <label>{t_.yAxis}</label>
          <Select
            options={getYAxisOptions(lang)}
            value={yAxis}
            onChange={setYAxis}
          />
        </div>
        <button
          onClick={() => {
            if (user) {
              logDashboardSummary(user, {
                province: province.value,
                district: district.value,
                startDate: formatDate(startDate),
                endDate: formatDate(endDate),
                yAxis: yAxis.value,
              });
            }
          }}
          style={{ alignSelf: "end" }}
        >
          {lang === "th" ? "บันทึกข้อมูลสรุป" : "Save Summary Data"}
        </button>
      </div>
      {loading ? (
        <p>{t_.loading}</p>
      ) : errorMsg ? (
        <p style={{ color: "red" }}>{t_.error}</p>
      ) : filteredHourlyData.length === 0 ? (
        <p>{t_.notFound}</p>
      ) : (
        <>
          {/* กราฟ */}
          <ResponsiveContainer width="100%" height={350}>
            <LineChart
              data={filteredHourlyData}
              margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="time"
                label={{
                  value: t_.chartTime,
                  position: "insideBottom",
                  offset: -5,
                }}
              />
              <YAxis
                label={{
                  value: yAxis.label,
                  angle: -90,
                  position: "insideLeft",
                  offset: 10,
                }}
                domain={yDomain}
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
