import React, { useState, useEffect, useMemo } from "react";
import Select from "react-select";
import { db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";
import provinces from "../data/provinces";
import provinceCoordinates from "../data/provinceCoordinates";
import VPDDailyChart from "./VPDDailyChart";
import { calculateHourlyETo } from "../utils/calculateETo";
import { kcOptionsByPlant, plantEn } from "../data/kcOptions";
import useWeatherAggregator from "../hooks/WeatherDataAggregator";
import WeatherMap from "./map";
import provinceEn from "../data/provinceEn";
import districtEn from "../data/districtEn";

const API_KEY = "8GEWAKR6AXWDET8C3DVV787XW";

// เพิ่มอ็อบเจ็กต์ข้อความสองภาษา
const translations = {
  th: {
    weatherForecast: "พยากรณ์อากาศ",
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
  },
  en: {
    weatherForecast: "Weather Forecast",
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
  },
};

export default function WeatherApp({ user }) {
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
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [t, setT] = useState(null);
  const [h, setH] = useState(null);
  const [l, setL] = useState(null);
  const [, setETo] = useState(null);
  const [canopyRadius, setCanopyRadius] = useState(1);
  const [plantType, setPlantType] = useState("ทุเรียน");
  const [kc, setKc] = useState(kcOptionsByPlant[plantType]?.[0]);
  const [lang, setLang] = useState("th");
  const t_ = translations[lang];

  const formatDate = (d) => d.toISOString().slice(0, 10);

  useEffect(() => {
    const firstDistrict = provinces[province.value]?.[0];
    if (firstDistrict)
      setDistrict({ label: firstDistrict, value: firstDistrict });
  }, [province]);

  useEffect(() => {
    const defaultKc = kcOptionsByPlant[plantType]?.[0];
    if (defaultKc) setKc(defaultKc);
  }, [plantType]);

  useEffect(() => {
    const fetchWeather = async () => {
      if (!district || !province) return;
      setLoading(true);
      setError(null);
      setWeather(null);
      try {
        const today = new Date();
        const startDate = formatDate(today);
        const endDate = formatDate(new Date(today.getTime() + 7 * 86400000));
        const location = `${province.value},TH`;
        const url = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${encodeURIComponent(
          location
        )}/${startDate}/${endDate}?unitGroup=metric&include=days%2Chours&key=${API_KEY}&contentType=json`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(lang === "th" ? "ไม่สามารถดึงข้อมูลได้" : "Unable to fetch data");
        const data = await response.json();
        setWeather(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchWeather();
    // eslint-disable-next-line
  }, [province, district, lang]);

  useEffect(() => {
    if (weather?.days?.length > 0) setSelectedDay(weather.days[0].datetime);
  }, [weather]);

  useEffect(() => {
    if (weather && selectedDay) {
      const dayData = weather.days.find((day) => day.datetime === selectedDay);
      if (dayData) {
        setT(dayData.temp);
        setH(dayData.humidity);
        setL(dayData.solarradiation);
      }
    }
  }, [weather, selectedDay]);

  useEffect(() => {
    if (!weather || !selectedDay) return;
    const dayData = weather.days.find((day) => day.datetime === selectedDay);
    if (!dayData) return;
    const tMax = dayData.tempmax || dayData.temp || 25;
    const tMin = dayData.tempmin || dayData.temp || 15;
    const tMean = dayData.temp || (tMax + tMin) / 2;
    const rhMax = dayData.humiditymax || dayData.humidity || 80;
    const rhMin = dayData.humiditymin || dayData.humidity || 40;
    const windSpeed = dayData.windspeed || 2;
    const solarRadiationWm2 = dayData.solarradiation || 15;
    const solarRadiation = (solarRadiationWm2 * 86400) / 1e6;
    const etoValue = calculateHourlyETo({
      temp: tMean,
      humidity: (rhMax + rhMin) / 2,
      windSpeed,
      solarRadiation,
      altitude: 100,
    });
    setETo(etoValue);
  }, [weather, selectedDay]);

  const vpd = useMemo(() => {
    if (t !== null && h !== null) {
      const svp = 0.6108 * Math.exp((17.27 * t) / (t + 237.3));
      const avp = (h / 100) * svp;
      return parseFloat((svp - avp).toFixed(3));
    }
    return null;
  }, [t, h]);

  // ฟังก์ชันแปลงชื่อจังหวัด/อำเภอ/พืช ตามภาษา
  const getProvinceLabel = (prov) => lang === "en" ? (provinceEn[prov] || prov) : prov;
  const getDistrictLabel = (prov, dist) => {
    if (lang === "en") {
      // ใช้ provinceEn เพื่อแปลงชื่อจังหวัดไทยเป็นอังกฤษก่อนหาใน districtEn
      const provEn = provinceEn[prov] || prov;
      return (districtEn[provEn]?.[dist] || dist);
    }
    return dist;
  };
  const getPlantLabel = (plant) =>
    lang === "en"
      ? (plantEn[plant]?.name || plant)
      : plant;

  // สร้าง options dropdown ตามภาษา
  const provinceOptions = Object.keys(provinces).map((prov) => ({
    label: getProvinceLabel(prov),
    value: prov,
  }));
  const districtOptions =
    provinces[province.value]?.map((dist) => ({
      label: getDistrictLabel(province.value, dist),
      value: dist,
    })) || [];
  const plantOptions = Object.keys(kcOptionsByPlant).map((key) => ({
    label: getPlantLabel(key),
    value: key,
  }));

  const formatDateThai = (isoDate) => {
    const [y, m, d] = isoDate.split("-");
    return `${d}-${m}-${y}`;
  };
  const formatDateEn = (isoDate) => {
    const [y, m, d] = isoDate.split("-");
    return `${y}-${m}-${d}`;
  };

  const dayOptions =
    weather?.days.map((day) => ({
      label: lang === "th" ? formatDateThai(day.datetime) : formatDateEn(day.datetime),
      value: day.datetime,
    })) || [];

  const coordKey = `${province.value}_${district.value}`;
  const mapCenter =
    provinceCoordinates[coordKey] || provinceCoordinates[province.value];

  const hourlyData = useMemo(() => {
    if (!weather || !selectedDay) return [];
    const day = weather.days.find((d) => d.datetime === selectedDay);
    return day?.hours || [];
  }, [weather, selectedDay]);

  const totalDailyETo = useMemo(() => {
    return hourlyData
      .reduce((sum, hour) => {
        const { temp, humidity, windspeed = 2, solarradiation } = hour;
        const solarMJ =
          solarradiation !== undefined ? (solarradiation * 3600) / 1e6 : null;
        if (temp === undefined || humidity === undefined || solarMJ === null)
          return sum;
        const eto = calculateHourlyETo({
          temp,
          humidity,
          windSpeed: windspeed,
          solarRadiation: solarMJ,
          altitude: 100,
        });
        return isNaN(eto) ? sum : sum + eto;
      }, 0)
      .toFixed(3);
  }, [hourlyData]);

  const etc = useMemo(
    () =>
      totalDailyETo !== null && kc?.value !== undefined
        ? totalDailyETo * kc.value
        : null,
    [totalDailyETo, kc]
  );

  const canopyAreaSqM = useMemo(() => {
    const r = parseFloat(canopyRadius);
    return !isNaN(r) ? Math.PI * r * r : null;
  }, [canopyRadius]);

  const rainfall = useMemo(() => {
    const rain = weather?.days.find((d) => d.datetime === selectedDay)?.precip;
    return rain !== undefined ? parseFloat(rain.toFixed(2)) : null;
  }, [weather, selectedDay]);

  const waterNetPerTree = useMemo(() => {
    if (canopyAreaSqM !== null && etc !== null && rainfall !== null) {
      const netETc = etc - rainfall;
      const netWater = Math.max(0, canopyAreaSqM * netETc);
      return netWater.toFixed(2);
    }
    return null;
  }, [canopyAreaSqM, etc, rainfall]);

  const calcVPD = (tempC, humidity) => {
    const svp = 0.6108 * Math.exp((17.27 * tempC) / (tempC + 237.3));
    const avp = (humidity / 100) * svp;
    return parseFloat((svp - avp).toFixed(3));
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (
        vpd !== null &&
        province &&
        district &&
        selectedDay &&
        totalDailyETo !== null &&
        rainfall !== null &&
        etc !== null &&
        waterNetPerTree !== null
      ) {
        const saveRawData = async () => {
          try {
            await addDoc(collection(db, "weather_minute_summary"), {
              province: province.value,
              district: district.value,
              canopyRadius: parseFloat(canopyRadius),
              kc: kc.value,
              date: new Date(selectedDay),
              timestamp: new Date(),
              totalDailyETo: parseFloat(totalDailyETo),
              rainfall: parseFloat(rainfall),
              etc: parseFloat(etc.toFixed(3)),
              waterNetPerTree: parseFloat(waterNetPerTree),
              vpd,
            });
            console.log("✅ บันทึกข้อมูลดิบเรียบร้อย (10 นาที)");
          } catch (e) {
            console.error("❌ บันทึกข้อมูลดิบล้มเหลว:", e);
          }
        };
        saveRawData();
      }
    }, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, [
    province,
    district,
    selectedDay,
    totalDailyETo,
    rainfall,
    etc,
    waterNetPerTree,
    vpd,
    canopyRadius,
    kc,
  ]);

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
    vpd,
  });

  return (
    <div className="container" style={{ maxWidth: 1200, marginTop: 20 }}>
      {/* ปุ่มเปลี่ยนภาษา */}
      <button
        style={{ float: "right", marginTop: 10 }}
        onClick={() => setLang(lang === "th" ? "en" : "th")}
      >
        {t_.langBtn}
      </button>
      <h2>{t_.weatherForecast}</h2>
      <div className="row">
        <div className="col-6">
          <WeatherMap
            province={province}
            district={district}
            mapCenter={mapCenter}
            weather={weather}
            selectedDay={selectedDay}
            t={t}
            h={h}
            l={l}
            vpd={vpd}
          />

          <label>{t_.province}</label>
          <Select
            options={provinceOptions}
            value={{
              label: getProvinceLabel(province.value),
              value: province.value,
            }}
            onChange={setProvince}
            isSearchable
          />

          <label>{t_.district}</label>
          <Select
            options={districtOptions}
            value={{
              label: getDistrictLabel(province.value, district.value),
              value: district.value,
            }}
            onChange={setDistrict}
            isSearchable
          />

          <label>{t_.canopyRadius}</label>
          <input
            type="number"
            value={canopyRadius}
            onChange={(e) => setCanopyRadius(e.target.value)}
            style={{ width: "100%" }}
            min="0"
            step="1"
          />

          <label>{t_.selectPlant}</label>
          <Select
            options={plantOptions}
            value={{
              label: getPlantLabel(plantType),
              value: plantType,
            }}
            onChange={(option) => setPlantType(option.value)}
          />

          <label>
            {t_.kc(
              lang === "en"
                ? (plantEn[plantType]?.name || plantType)
                : plantType
            )}
          </label>
          <Select
            options={
              lang === "en" && plantEn[plantType]?.labelEn
                ? kcOptionsByPlant[plantType].map((opt, idx) => ({
                    label: plantEn[plantType].labelEn[idx],
                    value: opt.value,
                  }))
                : kcOptionsByPlant[plantType]
            }
            value={
              lang === "en" && plantEn[plantType]?.labelEn
                ? {
                    label:
                      plantEn[plantType].labelEn[
                        kcOptionsByPlant[plantType].findIndex((k) => k.value === kc.value)
                      ],
                    value: kc.value,
                  }
                : kc
            }
            onChange={setKc}
          />

          {weather && (
            <>
              <label>{t_.selectDate}</label>
              <Select
                options={dayOptions}
                value={dayOptions.find((opt) => opt.value === selectedDay)}
                onChange={(option) => setSelectedDay(option.value)}
              />
            </>
          )}

          {loading && <p>{t_.loading}</p>}
          {error && <p style={{ color: "red" }}>{error}</p>}
        </div>

        <div className="col-6">
          <h4>{t_.hourlyWeather}</h4>
          {hourlyData.length === 0 ? (
            <p>{t_.noHourly}</p>
          ) : (
            <>
              <table
                border="1"
                cellPadding="5"
                style={{
                  borderCollapse: "collapse",
                  width: "100%",
                  textAlign: "center",
                }}
              >
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
                  {hourlyData.map((hour) => {
                    const temp = hour.temp;
                    const humidity = hour.humidity;
                    const wind = hour.windspeed || 2;
                    const solarMJ =
                      hour.solarradiation !== undefined
                        ? (hour.solarradiation * 3600) / 1e6
                        : null;
                    const etoHourly =
                      temp !== undefined &&
                      humidity !== undefined &&
                      solarMJ !== null
                        ? calculateHourlyETo({
                            temp,
                            humidity,
                            windSpeed: wind,
                            solarRadiation: solarMJ,
                            altitude: 100,
                          })
                        : null;
                    return (
                      <tr key={hour.datetime}>
                        <td>
                          {hour.datetimeEpoch
                            ? new Date(
                                hour.datetimeEpoch * 1000
                              ).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : t_.notSpecified}
                        </td>
                        <td>
                          {temp !== undefined ? temp.toFixed(1) : t_.notSpecified}
                        </td>
                        <td>
                          {humidity !== undefined
                            ? humidity.toFixed(0)
                            : t_.notSpecified}
                        </td>
                        <td>
                          {solarMJ !== null ? solarMJ.toFixed(2) : t_.notSpecified}
                        </td>
                        <td>
                          {wind !== undefined ? wind.toFixed(1) : t_.notSpecified}
                        </td>
                        <td>
                          {temp !== undefined && humidity !== undefined
                            ? calcVPD(temp, humidity)
                            : t_.notSpecified}
                        </td>
                        <td>
                          {etoHourly !== null
                            ? etoHourly.toFixed(3)
                            : t_.notSpecified}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div style={{ marginTop: 10, fontWeight: "bold" }}>
                {t_.dailyEto}: {totalDailyETo} mm
              </div>
              <div style={{ marginTop: 10, fontWeight: "bold" }}>
                <div>
                  {t_.rainfall}:{" "}
                  {rainfall !== null ? `${rainfall} mm` : t_.notSpecified}
                </div>
                <div>
                  {t_.etc}:{" "}
                  {etc !== null ? `${etc.toFixed(3)} mm/day` : t_.notSpecified}
                </div>
                {etc !== null &&
                  rainfall !== null &&
                  canopyAreaSqM !== null && (
                    <div style={{ color: "blue", marginTop: 10 }}>
                      {t_.netWater} = ({etc.toFixed(3)} - {rainfall.toFixed(2)}) ×{" "}
                      {canopyAreaSqM.toFixed(4)} = {waterNetPerTree}{" "}
                      {t_.litersPerTree}
                    </div>
                  )}
              </div>
            </>
          )}
          <VPDDailyChart weather={weather} selectedDay={selectedDay} lang={lang} />
        </div>
      </div>
    </div>
  );
}
