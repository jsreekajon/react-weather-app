import React, { useState, useEffect, useMemo, useRef } from "react";
import Select from "react-select";
import provinces from "../data/provinces";
import provinceCoordinates from "../data/provinceCoordinates";
import { calculateHourlyETo } from "../utils/calculateETo";
import { kcOptionsByPlant, plantEn } from "../data/kcOptions";
import useWeatherAggregator from "../hooks/WeatherDataAggregator";
import WeatherMap from "../components/map";
import provinceEn from "../data/provinceEn";
import districtEn from "../data/districtEn";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../firebase";
import useFetchProfile from "../hooks/useFetchProfile";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { useLanguage } from "../contexts/LanguageContext";
import GoogleLoginModal from "../components/GoogleLoginModal";
import {
  logPageView,
  logMinuteSummary,
  logHomePageSummary,
} from "../utils/analytics";

/**
 * HomePage.jsx (clean + fixes)
 *
 * หลัก ๆ ที่แก้:
 * - ย้าย climate state ขึ้นก่อนใช้งาน
 * - แก้ rainfall/dayData และซิงก์ unit conversion ให้ชัดเจน
 * - totalDailyETo เก็บเป็น number (ไม่ใช่ string)
 * - ปรับ mapCenter ให้มี fallback
 * - ใช้ hour.datetimeEpoch เป็น key ในตาราง (unique)
 * - แปลงค่า input เป็น number เมื่อจำเป็น
 * - ปรับ dependencies ของ useEffect ให้เฉพาะค่า .value เท่านั้น
 * - ป้องกันการบันทึกข้อมูลไม่ครบก่อนส่งไป analytics
 */

/* translations (unchanged) */
const translations = {
  th: {
    weatherForecast: "แบบจำลองการคาดการณ์การใช้น้ำของพืช",
    province: "จังหวัด:",
    district: "อำเภอ:",
    canopyRadius: "รัศมีทรงพุ่ม (เมตร):",
    selectPlant: "เลือกชนิดพืช:",
    kc: (plant) => `Kc (ระยะพัฒนาการของ ${plant}):`,
    selectDate: "เลือกวันที่:",
    loading: "กำลังโหลดข้อมูล...",
    noHourly: "ไม่มีข้อมูลรายชั่วโมง",
    hourlyWeather: "สภาพอากาศรายชั่วโมง",
    time: "เวลา",
    temp: "อุณหภูมิ (°C)",
    humidity: "ความชื้น (%)",
    solar: "แสงอาทิตย์ (MJ/m²/hr)",
    wind: "ความเร็วลม (km/h)",
    vpd: "VPD (kPa)",
    eto: "ETo (mm/hr)",
    dailyEto: "รวม ETo รายวัน",
    rainfall: "ปริมาณน้ำฝน รายวัน",
    etc: "ETc (พืชใช้น้ำ)",
    netWater: "ปริมาณน้ำสุทธิที่ต้องให้น้ำเอง (หลังหักน้ำฝน)",
    litersPerTree: "ลิตร/ต้น/วัน",
    notSpecified: "ไม่ระบุ",
    langBtn: "EN",
    climateScenarioLabel: "Climate Scenario ทำให้มีการเปลี่ยนแปลง",
    tempLabel: "อุณหภูมิ",
    humidityLabel: "ความชื้น",
    netWaterScenario: "ทำให้ปริมาณน้ำสุทธิที่ต้องให้น้ำเอง =",
    degreeUnit: "°C",
    percentUnit: "%",
    saveData: "บันทึกข้อมูลสรุป",
  },
  en: {
    weatherForecast: "Predictive Plant Water Consumption Model",
    province: "Province:",
    district: "District:",
    canopyRadius: "Canopy radius (m):",
    selectPlant: "Select plant type:",
    kc: (plant) => `Kc (growth stage of ${plant}):`,
    selectDate: "Select date:",
    loading: "Loading...",
    noHourly: "No hourly data",
    hourlyWeather: "Hourly Weather",
    time: "Time",
    temp: "Temperature (°C)",
    humidity: "Humidity (%)",
    solar: "Solar (MJ/m²/hr)",
    wind: "Wind speed (km/h)",
    vpd: "VPD (kPa)",
    eto: "ETo (mm/hr)",
    dailyEto: "Total daily ETo",
    rainfall: "Daily rainfall",
    etc: "ETc (crop water use)",
    netWater: "Net irrigation required (after rainfall)",
    litersPerTree: "liters/tree/day",
    notSpecified: "N/A",
    langBtn: "TH",
    climateScenarioLabel: "Climate Scenario causes changes in",
    tempLabel: "Temperature",
    humidityLabel: "Humidity",
    netWaterScenario: "Net irrigation required =",
    degreeUnit: "°C",
    percentUnit: "%",
    saveData: "Save Summary Data",
  },
};

const API_KEYS = [
  "8GEWAKR6AXWDET8C3DVV787XW",
  "W5VMZDF42HAR6S9RJTSLX2MJY",
  "D2HBXFV5VCMLAV8U4C32EUUNK",
  "RAC3VSK24LPDLNDJHNX84UA4A",
  "M9T85BKN7MTSP9MVVKU9TRX6B",
  "BZLDWWXWNSSJ6NA622JC7BWZQ",
];
let apiKeyIndex = 0;
function getApiKey() {
  return API_KEYS[apiKeyIndex];
}
function rotateApiKey() {
  apiKeyIndex = (apiKeyIndex + 1) % API_KEYS.length;
  return getApiKey();
}

export default function HomePage() {
  const [user] = useAuthState(auth);
  useFetchProfile();
  const { lang, setLang } = useLanguage();

  const defaultProvince = Object.keys(provinces)[0];
  const defaultDistrict = provinces[defaultProvince][0];

  // --- STATES (logical grouping & order) ---
  const [province, setProvince] = useState({
    label: defaultProvince,
    value: defaultProvince,
  });
  const [district, setDistrict] = useState({
    label: defaultDistrict,
    value: defaultDistrict,
  });

  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [selectedDay, setSelectedDay] = useState(null);

  // summary inputs / derived
  const [canopyRadius, setCanopyRadius] = useState(1); // store as number
  const [plantType, setPlantType] = useState("ทุเรียน");
  const [kc, setKc] = useState(kcOptionsByPlant["ทุเรียน"]?.[0] || null);

  // climate scenario controls (moved up so available to handlers)
  const [climateTempDelta, setClimateTempDelta] = useState(2);
  const [climateHumidityDelta, setClimateHumidityDelta] = useState(-20);

  // small UI states
  const [t, setT] = useState(null);
  const [h, setH] = useState(null);
  const [l, setL] = useState(null);
  const [, setETo] = useState(null);

  const t_ = translations[lang];

  // --- helpers ---
  const formatDate = (d) => d.toISOString().slice(0, 10);
  const formatDateThai = (isoDate) => {
    const [y, m, d] = isoDate.split("-");
    return `${d}-${m}-${y}`;
  };
  const formatDateEn = (isoDate) => {
    const [y, m, d] = isoDate.split("-");
    return `${m}-${d}-${y}`; // en -> MM-DD-YYYY for readability
  };

  // translate helpers
  const getProvinceLabel = (prov) =>
    lang === "en" ? provinceEn[prov] || prov : prov;
  const getDistrictLabel = (prov, dist) => {
    if (lang === "en") {
      const provEn = provinceEn[prov] || prov;
      return districtEn[provEn]?.[dist] || dist;
    }
    return dist;
  };
  const getPlantLabel = (plant) =>
    lang === "en" ? plantEn[plant]?.name || plant : plant;

  // --- analytics: log page view once when user+province available (avoid duplicate logs) ---
  useEffect(() => {
    if (user && province?.value) {
      logPageView(user, "HomePage", {
        province: province.value,
        district: district.value,
      });
    }
    // only re-run when user or province.value changes
  }, [user, province?.value, district?.value]);

  // keep kc in sync with plantType
  useEffect(() => {
    const defaultKc = kcOptionsByPlant[plantType]?.[0] || null;
    setKc(defaultKc);
  }, [plantType]);

  // ensure district resets when province changes
  useEffect(() => {
    const firstDistrict = provinces[province.value]?.[0];
    if (firstDistrict) setDistrict({ label: firstDistrict, value: firstDistrict });
  }, [province.value]);

  // --- fetch weather (debounced + cached) ---
  const debounceRef = useRef();
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (!province?.value || !district?.value) return;
      setLoading(true);
      setError(null);
      setWeather(null);

      const today = new Date();
      const startDate = formatDate(today);
      const endDate = formatDate(new Date(today.getTime() + 7 * 86400000));

      const coords = provinceCoordinates[province.value];
      const location = coords ? `${coords[0]},${coords[1]}` : `${province.value},TH`;

      const cacheKey = `weather_${location}_${startDate}_${endDate}_${lang}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          setWeather(JSON.parse(cached));
          setLoading(false);
          return;
        } catch (e) {
          // if cache is corrupt, continue to fetch
          console.warn("Invalid cached weather, refetching", e);
        }
      }

      const fetchWeather = async () => {
        let tries = 0;
        let lastError = null;
        while (tries < API_KEYS.length) {
          const apiKey = getApiKey();
          const url = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${encodeURIComponent(
            location
          )}/${startDate}/${endDate}?unitGroup=metric&include=days%2Chours&key=${apiKey}&contentType=json`;
          try {
            const response = await fetch(url);
            if (response.status === 429) {
              rotateApiKey();
              tries++;
              continue;
            }
            if (!response.ok)
              throw new Error(lang === "th" ? "ไม่สามารถดึงข้อมูลได้" : "Unable to fetch data");
            const data = await response.json();
            localStorage.setItem(cacheKey, JSON.stringify(data));
            setWeather(data);
            setLoading(false);
            return;
          } catch (err) {
            lastError = err;
            tries++;
            rotateApiKey();
          }
        }
        setError(lastError ? lastError.message : lang === "th" ? "ไม่สามารถดึงข้อมูลได้" : "Unable to fetch data");
        setLoading(false);
      };
      fetchWeather();
    }, 1000);
    return () => clearTimeout(debounceRef.current);
  }, [province.value, district.value, lang]);

  // set default selectedDay when weather arrives
  useEffect(() => {
    if (weather?.days?.length > 0) setSelectedDay(weather.days[0].datetime);
  }, [weather]);

  // set t/h/l when selectedDay changes
  useEffect(() => {
    if (!weather || !selectedDay) return;
    const dayData = weather.days.find((day) => day.datetime === selectedDay);
    if (dayData) {
      setT(dayData.temp ?? null);
      setH(dayData.humidity ?? null);
      setL(dayData.solarradiation ?? null);
    }
  }, [weather, selectedDay]);

  // compute per-day summary ETo (number, mm/day)
  const hourlyData = useMemo(() => {
    if (!weather || !selectedDay) return [];
    const day = weather.days.find((d) => d.datetime === selectedDay);
    return day?.hours || [];
  }, [weather, selectedDay]);

  const totalDailyETo = useMemo(() => {
    if (!hourlyData || hourlyData.length === 0) return 0;
    const sum = hourlyData.reduce((sumAcc, hour) => {
      const { temp, humidity, windspeed = 2, solarradiation } = hour;
      // VisualCrossing solarradiation in W/m2 -> convert to MJ/m2 per hour:
      // W/m2 * 3600 sec * 1e-6 = MJ/m2/hr
      const solarMJ = solarradiation !== undefined ? (solarradiation * 3600) / 1e6 : null;
      if (temp === undefined || humidity === undefined || solarMJ === null) return sumAcc;
      const eto = calculateHourlyETo({
        temp,
        humidity,
        windSpeed: windspeed,
        solarRadiation: solarMJ,
        altitude: 100,
      });
      return isNaN(eto) ? sumAcc : sumAcc + eto;
    }, 0);
    // return number (rounded to 3 decimals)
    return Number(sum.toFixed(3));
  }, [hourlyData]);

  // ETc (mm/day) using kc.value; ensure kc exists and kc.value is numeric
  const etc = useMemo(() => {
    const kcVal = kc?.value ?? null;
    if (totalDailyETo === null || kcVal === null) return null;
    return Number((totalDailyETo * kcVal).toFixed(3));
  }, [totalDailyETo, kc]);

  const canopyAreaSqM = useMemo(() => {
    const r = Number(canopyRadius);
    return !isNaN(r) ? Math.PI * r * r : null;
  }, [canopyRadius]);

  // rainfall for selected day (mm) - safe extraction and rounding
  const rainfall = useMemo(() => {
    if (!weather || !selectedDay) return null;
    const dayData = weather.days.find((d) => d.datetime === selectedDay);
    const rain = dayData?.precip ?? 0;
    return Number(rain.toFixed(2));
  }, [weather, selectedDay]);

  // net water per tree in liters (assuming canopyArea in m2, using mm -> liters/m2)
  // NOTE: 1 mm over 1 m2 = 1 liter. We used canopyAreaSqM (m2) * netETc(mm)
  const waterNetPerTree = useMemo(() => {
    if (canopyAreaSqM === null || etc === null || rainfall === null) return null;
    const netETc = etc - rainfall; // mm
    const netWater = Math.max(0, canopyAreaSqM * netETc); // liters (mm*m2 -> liters)
    return Number(netWater.toFixed(2));
  }, [canopyAreaSqM, etc, rainfall]);

  // Simple VPD helper (kPa)
  const calcVPD = (tempC, humidityPct) => {
    const svp = 0.6108 * Math.exp((17.27 * tempC) / (tempC + 237.3));
    const avp = (humidityPct / 100) * svp;
    return Number((svp - avp).toFixed(3));
  };

  // aggregator hook (keeps sending summary for analytics, non-blocking)
  useWeatherAggregator({
    user,
    province,
    district,
    selectedDay,
    canopyRadius,
    kc,
    totalDailyETo,
    rainfall,
    etc,
    waterNetPerTree,
    vpd: calcVPD(t ?? 0, h ?? 0),
  });

  // Climate scenario: recompute net water per tree under scenario deltas
  const climateScenarioWaterNetPerTree = useMemo(() => {
    if (!weather || !selectedDay || canopyAreaSqM === null || rainfall === null) return null;
    const etoSum = hourlyData.reduce((acc, hour) => {
      const temp = hour.temp !== undefined ? hour.temp + climateTempDelta : undefined;
      const humidityRaw = hour.humidity !== undefined ? hour.humidity + climateHumidityDelta : undefined;
      const humidity = humidityRaw !== undefined ? Math.max(0, Math.min(100, humidityRaw)) : undefined;
      const wind = hour.windspeed || 2;
      const solarMJ = hour.solarradiation !== undefined ? (hour.solarradiation * 3600) / 1e6 : null;
      if (temp === undefined || humidity === undefined || solarMJ === null) return acc;
      const etoH = calculateHourlyETo({
        temp,
        humidity,
        windSpeed: wind,
        solarRadiation: solarMJ,
        altitude: 100,
      });
      return isNaN(etoH) ? acc : acc + etoH;
    }, 0);
    const etcScenario = Number((etoSum * (kc?.value ?? 0)).toFixed(3));
    const netETc = etcScenario - rainfall;
    const netWater = Math.max(0, canopyAreaSqM * netETc);
    return Number(netWater.toFixed(2));
  }, [weather, selectedDay, canopyAreaSqM, rainfall, climateTempDelta, climateHumidityDelta, kc, hourlyData]);

  // UI options
  const provinceOptions = Object.keys(provinces).map((prov) => ({
    label: getProvinceLabel(prov),
    value: prov,
  }));
  const districtOptions = provinces[province.value]?.map((dist) => ({
    label: getDistrictLabel(province.value, dist),
    value: dist,
  })) || [];
  const plantOptions = Object.keys(kcOptionsByPlant).map((key) => ({
    label: getPlantLabel(key),
    value: key,
  }));

  const dayOptions = weather?.days?.map((day) => ({
    label: lang === "th" ? formatDateThai(day.datetime) : formatDateEn(day.datetime),
    value: day.datetime,
  })) || [];

  const coordKey = `${province.value}_${district.value}`;
  const mapCenter = provinceCoordinates[coordKey] || provinceCoordinates[province.value] || [13.7563, 100.5018];

  // --- HANDLERS ---
  const handleSaveSummary = async () => {
    // Validate required fields before saving
    const missing = [];
    if (!province?.value) missing.push("province");
    if (!district?.value) missing.push("district");
    if (!selectedDay) missing.push("selectedDate");
    if (totalDailyETo === null) missing.push("totalDailyETo");
    if (etc === null) missing.push("etc");
    if (rainfall === null) missing.push("rainfall");
    if (waterNetPerTree === null) missing.push("waterNetPerTree");
    if (!user) missing.push("user");

    if (missing.length > 0) {
      alert(lang === "th" ? `⚠️ ข้อมูลไม่ครบ: ${missing.join(", ")}` : `⚠️ Missing fields: ${missing.join(", ")}`);
      return;
    }

    try {
      await logMinuteSummary(user, {
        userId: user.uid,
        userEmail: user.email,
        province: province.value,
        district: district.value,
        canopyRadius: Number(canopyRadius),
        kc: kc?.value ?? 0,
        selectedDay,
        totalDailyETo: Number(totalDailyETo),
        rainfall: Number(rainfall),
        etc: Number(etc),
        waterNetPerTree: Number(waterNetPerTree),
        vpd: calcVPD(t ?? 0, h ?? 0),
      });

      // logHomePageSummary expects root-level fields in analytics.js (per your analytics file)
      await logHomePageSummary(user, {
        userId: user.uid,
        userEmail: user.email,
        timestamp: new Date(),
        province: province.value,
        district: district.value,
        canopyRadius: Number(canopyRadius),
        plantType,
        kc: kc?.value ?? 0,
        selectedDate: selectedDay,
        totalDailyETo: Number(totalDailyETo),
        rainfall: Number(rainfall),
        etc: Number(etc),
        waterNetPerTree: Number(waterNetPerTree),
        climateTempDelta,
        climateHumidityDelta,
      });

      alert(lang === "th" ? "✅ บันทึกข้อมูลเรียบร้อย" : "✅ Data saved successfully");
    } catch (e) {
      console.error("Save failed:", e);
      alert(lang === "th" ? "❌ บันทึกข้อมูลล้มเหลว" : "❌ Failed to save data");
    }
  };

  // --- Chart components (kept local) ---
  function ClimateScenarioVPDChart({ weather, selectedDay, tempDelta, humidityDelta, lang = "th" }) {
    const hourlyVPDData = useMemo(() => {
      if (!weather?.days || !selectedDay) return [];
      const dayData = weather.days.find((d) => d.datetime === selectedDay);
      if (!dayData?.hours) return [];
      return dayData.hours
        .map((hour) => {
          const tempC = hour.temp !== undefined ? hour.temp + tempDelta : undefined;
          const humidityRaw = hour.humidity !== undefined ? hour.humidity + humidityDelta : undefined;
          const humidity = humidityRaw !== undefined ? Math.max(0, Math.min(100, humidityRaw)) : undefined;
          if (tempC == null || humidity == null) return null;
          const svp = 0.6108 * Math.exp((17.27 * tempC) / (tempC + 237.3));
          const avp = svp * (humidity / 100);
          const vpd = Number((svp - avp).toFixed(3));
          return {
            time: new Date(hour.datetimeEpoch * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            vpd,
          };
        })
        .filter(Boolean);
    }, [weather, selectedDay, tempDelta, humidityDelta]);

    const chartTitle = lang === "en"
      ? `Climate Scenario VPD Chart (Hourly on ${selectedDay})`
      : `กราฟ VPD ของ Climate Scenario (รายชั่วโมงในวันที่ ${selectedDay})`;
    const noDataText = lang === "en" ? "No VPD data" : "ไม่มีข้อมูล VPD";

    return (
      <div style={{ marginTop: 40 }}>
        <h4 style={{ color: "red", fontSize: "1.1em" }}>{chartTitle}</h4>
        {hourlyVPDData.length === 0 ? (
          <p>{noDataText}</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={hourlyVPDData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis label={{ value: "kPa", angle: -90, position: "insideLeft" }} />
              <Tooltip />
              <Line type="monotone" dataKey="vpd" stroke="red" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    );
  }

  function VPDDailyChartCustom({ weather, selectedDay, lang = "th" }) {
    const hourlyVPDData = useMemo(() => {
      if (!weather?.days || !selectedDay) return [];
      const dayData = weather.days.find((d) => d.datetime === selectedDay);
      if (!dayData?.hours) return [];
      return dayData.hours
        .map((hour) => {
          const tempC = hour.temp;
          const humidity = hour.humidity;
          if (tempC == null || humidity == null) return null;
          const svp = 0.6108 * Math.exp((17.27 * tempC) / (tempC + 237.3));
          const avp = svp * (humidity / 100);
          const vpd = Number((svp - avp).toFixed(3));
          return {
            time: new Date(hour.datetimeEpoch * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            vpd,
          };
        })
        .filter(Boolean);
    }, [weather, selectedDay]);

    const chartTitle = lang === "en" ? `VPD Chart (Hourly on ${selectedDay})` : `กราฟ VPD (รายชั่วโมงในวันที่ ${selectedDay})`;
    const noDataText = lang === "en" ? "No VPD data" : "ไม่มีข้อมูล VPD";

    return (
      <div style={{ marginTop: 40 }}>
        <h4 style={{ fontSize: "1.1em" }}>{chartTitle}</h4>
        {hourlyVPDData.length === 0 ? (
          <p>{noDataText}</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={hourlyVPDData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis label={{ value: "kPa", angle: -90, position: "insideLeft" }} />
              <Tooltip />
              <Line type="monotone" dataKey="vpd" stroke="#222" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    );
  }

  // --- RENDER ---
  return (
    <div className="container" style={{ maxWidth: 1200, marginTop: 20 }}>
      <GoogleLoginModal />
      <button style={{ float: "right", marginTop: 10 }} onClick={() => setLang(lang === "th" ? "en" : "th")}>
        {t_.langBtn}
      </button>
      <h2>{t_.weatherForecast}</h2>

      <div className="row">
        <div className="col-6">
          <WeatherMap province={province} district={district} mapCenter={mapCenter} weather={weather} selectedDay={selectedDay} t={t} h={h} l={l} vpd={calcVPD(t ?? 0, h ?? 0)} />

          <label>{t_.province}</label>
          <Select options={provinceOptions} value={{ label: getProvinceLabel(province.value), value: province.value }} onChange={setProvince} isSearchable />

          <label>{t_.district}</label>
          <Select options={districtOptions} value={{ label: getDistrictLabel(province.value, district.value), value: district.value }} onChange={setDistrict} isSearchable />

          <label>{t_.canopyRadius}</label>
          <input
            type="number"
            value={canopyRadius}
            onChange={(e) => setCanopyRadius(e.target.value === "" ? "" : Number(e.target.value))}
            style={{ width: "100%" }}
            min="0"
            step="1"
          />

          <label>{t_.selectPlant}</label>
          <Select options={plantOptions} value={{ label: getPlantLabel(plantType), value: plantType }} onChange={(option) => setPlantType(option.value)} />

          <label>{t_.kc(lang === "en" ? plantEn[plantType]?.name || plantType : plantType)}</label>
          <Select
            options={
              lang === "en" && plantEn[plantType]?.labelEn
                ? kcOptionsByPlant[plantType].map((opt, idx) => ({ label: plantEn[plantType].labelEn[idx], value: opt.value }))
                : kcOptionsByPlant[plantType]
            }
            value={
              lang === "en" && plantEn[plantType]?.labelEn
                ? {
                    label:
                      plantEn[plantType].labelEn[kcOptionsByPlant[plantType].findIndex((k) => k.value === kc?.value)],
                    value: kc?.value,
                  }
                : kc
            }
            onChange={setKc}
          />

          {weather && (
            <>
              <label>{t_.selectDate}</label>
              <Select options={dayOptions} value={dayOptions.find((opt) => opt.value === selectedDay)} onChange={(option) => setSelectedDay(option.value)} />
            </>
          )}

          {loading && <p>{t_.loading}</p>}
          {error && <p style={{ color: "red" }}>{error}</p>}
        </div>

        <div className="col-6">
          <h4 style={{ fontSize: "1.1em" }}>{t_.hourlyWeather}</h4>

          {hourlyData.length === 0 ? (
            <p>{t_.noHourly}</p>
          ) : (
            <>
              <table border="1" cellPadding="5" style={{ borderCollapse: "collapse", width: "100%", textAlign: "center" }}>
                <thead>
                  <tr>
                    <th>{t_.time}</th>
                    <th>{t_.temp}</th>
                    <th>{t_.humidity}</th>
                    <th>{t_.solar}</th>
                    <th>{t_.wind}</th>
                    <th>{t_.vpd}</th>
                    <th>{t_.eto}</th>
                  </tr>
                </thead>
                <tbody>
                  {hourlyData.map((hour, idx) => {
                    const temp = hour.temp;
                    const humidity = hour.humidity;
                    const wind = hour.windspeed || 2;
                    const solarMJ = hour.solarradiation !== undefined ? (hour.solarradiation * 3600) / 1e6 : null;
                    const etoHourly = temp !== undefined && humidity !== undefined && solarMJ !== null
                      ? calculateHourlyETo({ temp, humidity, windSpeed: wind, solarRadiation: solarMJ, altitude: 100 })
                      : null;
                    const key = hour.datetimeEpoch ?? `${selectedDay}_${idx}`;
                    return (
                      <tr key={key}>
                        <td>
                          {hour.datetime ? (() => {
                            const parts = hour.datetime.split(":");
                            return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
                          })() : t_.notSpecified}
                        </td>
                        <td>{temp !== undefined ? temp.toFixed(1) : t_.notSpecified}</td>
                        <td>{humidity !== undefined ? humidity.toFixed(0) : t_.notSpecified}</td>
                        <td>{solarMJ !== null ? solarMJ.toFixed(2) : t_.notSpecified}</td>
                        <td>{wind !== undefined ? wind.toFixed(1) : t_.notSpecified}</td>
                        <td>{temp !== undefined && humidity !== undefined ? calcVPD(temp, humidity) : t_.notSpecified}</td>
                        <td>{etoHourly !== null ? etoHourly.toFixed(3) : t_.notSpecified}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div style={{ marginTop: 10, fontWeight: "bold", fontSize: "1.1em" }}>
                {t_.dailyEto}: {totalDailyETo.toFixed(3)} mm
              </div>

              <div style={{ marginTop: 10, fontWeight: "bold", fontSize: "1.1em" }}>
                <div>{t_.rainfall}: {rainfall !== null ? `${rainfall.toFixed(2)} mm` : t_.notSpecified}</div>
                <div>{t_.etc}: {etc !== null ? `${etc.toFixed(3)} mm/day` : t_.notSpecified}</div>

                {etc !== null && rainfall !== null && canopyAreaSqM !== null && (
                  <>
                    <div style={{ color: "blue", marginTop: 10, fontSize: "1.1em" }}>
                      {t_.netWater} = ({etc.toFixed(3)} - {rainfall.toFixed(2)}) × {canopyAreaSqM.toFixed(4)} = {waterNetPerTree} {t_.litersPerTree}
                    </div>

                    <div style={{ marginTop: 20 }}>
                      <div style={{ color: "red", fontWeight: "bold", fontSize: "1.1em" }}>
                        {t_.climateScenarioLabel}&nbsp;
                        <label>
                          {t_.tempLabel}&nbsp;
                          <input type="number" value={climateTempDelta} onChange={(e) => setClimateTempDelta(Number(e.target.value))} style={{ width: 60, color: "red", borderColor: "red" }} />&nbsp;{t_.degreeUnit}&nbsp;
                        </label>
                        {lang === "th" ? "กับ" : "and"}&nbsp;
                        <label>
                          {t_.humidityLabel}&nbsp;
                          <input type="number" value={climateHumidityDelta} onChange={(e) => setClimateHumidityDelta(Number(e.target.value))} style={{ width: 60, color: "red", borderColor: "red" }} />&nbsp;{t_.percentUnit}&nbsp;
                        </label>
                        {t_.netWaterScenario} {climateScenarioWaterNetPerTree} {t_.litersPerTree}
                      </div>
                    </div>

                    <button onClick={handleSaveSummary} style={{ marginTop: 15, width: "100%", padding: 8, fontSize: "1.1em", cursor: "pointer" }}>
                      {t_.saveData}
                    </button>
                  </>
                )}
              </div>
            </>
          )}
          <VPDDailyChartCustom weather={weather} selectedDay={selectedDay} lang={lang} />
          <ClimateScenarioVPDChart weather={weather} selectedDay={selectedDay} tempDelta={climateTempDelta} humidityDelta={climateHumidityDelta} lang={lang} />
        </div>
      </div>
    </div>
  );
}
