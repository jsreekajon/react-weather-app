import React, { useState, useRef } from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import th from "date-fns/locale/th";
import provinces from "../data/provinces";
import * as XLSX from "xlsx";
import Select from "react-select";
import { calculateHourlyETo } from "../utils/calculateETo";
import { useLanguage } from "../contexts/LanguageContext";
import provinceEn from "../data/provinceEn";
import districtEn from "../data/districtEn";
import { kcOptionsByPlant, plantEn } from "../data/kcOptions";
import provinceCoordinates from "../data/provinceCoordinates";
import GoogleLoginModal from "../components/GoogleLoginModal";


import { logPageView, logDataPageSearch } from "../utils/analytics";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../firebase";
import useFetchProfile from "../hooks/useFetchProfile"; 
import { useEffect } from "react";

registerLocale("th", th);

// ✅ เก็บฝั่ง new-data
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

export default function DataPage() {
  useFetchProfile();
  const [user] = useAuthState(auth);
  
  
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

  // Plant type and Kc selection
  const defaultPlant = Object.keys(kcOptionsByPlant)[0];
  const [plantType, setPlantType] = useState(defaultPlant);
  const [kc, setKc] = useState(kcOptionsByPlant[defaultPlant][0]);

  const { lang, setLang } = useLanguage();


  useEffect(() => {
    if (user && province?.value) {
      logPageView(user, "DataPage", {
        province: province.value,
        district: district.value,
      });
    }
  }, [user, province?.value, district?.value]);

  // เพิ่ม translations สำหรับทุกข้อความ
  const translations = {
    th: {
      langBtn: "EN",
      title: "ค้นหาข้อมูลอากาศ 24 ชั่วโมง (Visual Crossing)",
      province: "จังหวัด:",
      district: "อำเภอ:",
      plant: "ชนิดพืช:",
      kc: (plant) => `Kc (ระยะพัฒนาการของ ${plant}):`,
      startDate: "วันที่เริ่มต้น:",
      endDate: "วันที่สิ้นสุด:",
      search: "ค้นหา",
      export: "Export Excel",
      loading: "กำลังโหลดข้อมูล...",
      notFound: "ไม่พบข้อมูลในช่วงที่เลือก",
      table: {
        date: "วันที่",
        time: "เวลา",
        temp: "อุณหภูมิ (°C)",
        humidity: "ความชื้น (%)",
        solar: "แสงอาทิตย์ (MJ/m²/hr)",
        wind: "ความเร็วลม (km/h)",
        vpd: "VPD (kPa)",
        eto: "ETo (mm/hr)",
        etc: "ETc (mm/hr)",
      },
      error: "เกิดข้อผิดพลาดในการโหลดข้อมูล",
    },
    en: {
      langBtn: "TH",
      title: "Search 24-hour Weather Data (Visual Crossing)",
      province: "Province:",
      district: "District:",
      plant: "Plant type:",
      kc: (plant) => `Kc (growth stage of ${plant}):`,
      startDate: "Start date:",
      endDate: "End date:",
      search: "Search",
      export: "Export Excel",
      loading: "Loading...",
      notFound: "No data found in selected range",
      table: {
        date: "Date",
        time: "Time",
        temp: "Temperature (°C)",
        humidity: "Humidity (%)",
        solar: "Solar (MJ/m²/hr)",
        wind: "Wind speed (km/h)",
        vpd: "VPD (kPa)",
        eto: "ETo (mm/hr)",
        etc: "ETc (mm/hr)",
      },
      error: "Failed to load data",
    },
  };
  // Plant dropdown options
  const getPlantLabel = (plant) =>
    lang === "en" ? plantEn[plant]?.name || plant : plant;
  const plantOptions = Object.keys(kcOptionsByPlant).map((key) => ({
    label: getPlantLabel(key),
    value: key,
  }));

  // Kc dropdown options
  const kcOptions =
    lang === "en" && plantEn[plantType]?.labelEn
      ? kcOptionsByPlant[plantType].map((opt, idx) => ({
          label: plantEn[plantType].labelEn[idx],
          value: opt.value,
        }))
      : kcOptionsByPlant[plantType];
  const t_ = translations[lang];

  const getProvinceLabel = (prov) =>
    lang === "en" ? provinceEn[prov] || prov : prov;

  const getDistrictLabel = (prov, dist) => {
    if (lang === "en") {
      const provEn = provinceEn[prov] || prov;
      return districtEn[provEn]?.[dist] || dist;
    }
    return dist;
  };

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

  const formatDateEn = (isoDate) => {
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

      const coords = provinceCoordinates[province.value];
      const location = coords ? `${coords[0]},${coords[1]}` : `${province.value},TH`;

      console.log("province", province ,"coords", coords, "location", location);
      // const location = `${district.value},${province.value},TH`;

      
      // Include plantType and kc in cache key
      const cacheKey = `weather_${location}_${startStr}_${endStr}_${plantType}_${kc.value}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        setData(JSON.parse(cached));
        setLoading(false);
        // Log search data to Firestore after successful fetch from cache
        if (user) {
          try {
            console.log("=== handleFetch (cached) - Logging DataPage search ===");
            await logDataPageSearch(user, {
              province: province.value,
              district: district.value,
              plantType: plantType,
              kc: kc.value,
              startDate: startStr,
              endDate: endStr,
            });
            alert(lang === "th" ? "✅ บันทึกข้อมูลเรียบร้อย" : "✅ Data saved successfully");
          } catch (e) {
            console.error("[handleFetch] Failed to log search:", e);
            alert(lang === "th" ? "❌ บันทึกข้อมูลไม่สำเร็จ" : "❌ Failed to save data");
          }
        }
        return;
      }
      let tries = 0;
      while (tries < API_KEYS.length) {
        const apiKey = getApiKey();
        const url = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${encodeURIComponent(location)}/${startStr}/${endStr}?unitGroup=metric&include=days%2Chours&key=${apiKey}&contentType=json`;
        console.log(url);
        try {
          // Debug: log the url
          console.log("Fetching weather data from:", url);
          const res = await fetch(url);
          if (res.status === 429) {
            rotateApiKey();
            tries++;
            continue;
          }
          if (!res.ok) {
            const errText = await res.text();
            console.error("API error:", res.status, errText);
            throw new Error("โหลดข้อมูลล้มเหลว");
          }
          const json = await res.json();
          // Flatten all hours from all days, add date field
          const tableData = [];
          (json.days || []).forEach((day) => {
            const dateLabel =
              lang === "en"
                ? formatDateEn(day.datetime)
                : formatDateThai(day.datetime);
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
              // Calculate ETc per hour
              const etcHourly =
                etoHourly !== null && kc.value !== undefined
                  ? (etoHourly * kc.value).toFixed(3)
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
                etc: etcHourly,
              });
            });
          });
          localStorage.setItem(cacheKey, JSON.stringify(tableData));
          setData(tableData);
          setLoading(false);
          
          // Log search data to Firestore after successful fetch
          if (user) {
            try {
              console.log("=== handleFetch (API) - Logging DataPage search ===");
              await logDataPageSearch(user, {
                province: province.value,
                district: district.value,
                plantType: plantType,
                kc: kc.value,
                startDate: startStr,
                endDate: endStr,
              });
              alert(lang === "th" ? "✅ บันทึกข้อมูลเรียบร้อย" : "✅ Data saved successfully");
            } catch (e) {
              console.error("[handleFetch] Failed to log search:", e);
              alert(lang === "th" ? "❌ บันทึกข้อมูลไม่สำเร็จ" : "❌ Failed to save data");
            }
          }
          return;
        } catch (e) {
          console.error("Fetch failed:", e.message);
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
        <div style={{ minWidth: 200 }}>
          <label>{t_.plant}</label>
          <Select
            options={plantOptions}
            value={{
              label: getPlantLabel(plantType),
              value: plantType,
            }}
            onChange={(option) => {
              setPlantType(option.value);
              setKc(kcOptionsByPlant[option.value][0]);
            }}
          />
        </div>
        <div style={{ minWidth: 250 }}>
          <label>
            {t_.kc(
              lang === "en" ? plantEn[plantType]?.name || plantType : plantType
            )}
          </label>
          <Select
            options={kcOptions}
            value={
              lang === "en" && plantEn[plantType]?.labelEn
                ? {
                    label:
                      plantEn[plantType].labelEn[
                        kcOptionsByPlant[plantType].findIndex(
                          (k) => k.value === kc.value
                        )
                      ],
                    value: kc.value,
                  }
                : kc
            }
            onChange={(option) => {
              setKc(option);
            }}
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
        <button onClick={handleFetch} style={{ alignSelf: "end" }}>
          {t_.search}
        </button>
        <button
          onClick={handleExport}
          style={{ alignSelf: "end" }}
          disabled={!data.length}
        >
          {t_.export}
        </button>
      </div>
      {loading ? (
        <p>{t_.loading}</p>
      ) : data.length ? (
        <table
          border="1"
          cellPadding={6}
          style={{ width: "100%", fontSize: 14 }}
        >
          <thead>
            <tr>
              <th>{t_.table.date}</th>
              <th>{t_.table.time}</th>
              <th>{t_.table.temp}</th>
              <th>{t_.table.humidity}</th>
              <th>{t_.table.solar}</th>
              <th>{t_.table.wind}</th>
              <th>{t_.table.vpd}</th>
              <th>{t_.table.eto}</th>
              <th>{t_.table.etc}</th>
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
                  <td>{row.etc}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : null}
      {!loading && !data.length && <p>{t_.notFound}</p>}
      {!loading && !data.length && <p>{t_.notFound}</p>}
      
    </div>
  );
}

