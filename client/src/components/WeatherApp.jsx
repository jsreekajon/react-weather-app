import React, { useState, useEffect, useMemo } from "react";
import Select from "react-select";
import { db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";
import provinces from "../data/provinces";
import provinceCoordinates from "../data/provinceCoordinates";
import VPDDailyChart from "./VPDDailyChart";
import { calculateHourlyETo } from "../utils/calculateETo";
import { kcOptionsByPlant } from "../data/kcOptions"; // อัปเดต import
import useWeatherAggregator from "../hooks/WeatherDataAggregator";
import WeatherMap from "./map"; // ✅ // ← เพิ่มการ import ใหม่

const API_KEY = "8GEWAKR6AXWDET8C3DVV787XW";

// ↓ เหลือแค่ component เดียว: WeatherApp
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
        if (!response.ok) throw new Error("ไม่สามารถดึงข้อมูลได้");
        const data = await response.json();
        setWeather(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchWeather();
  }, [province, district]);

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

  const provinceOptions = Object.keys(provinces).map((prov) => ({
    label: prov,
    value: prov,
  }));
  const districtOptions =
    provinces[province.value]?.map((dist) => ({ label: dist, value: dist })) ||
    [];

  const formatDateThai = (isoDate) => {
    const [y, m, d] = isoDate.split("-");
    return `${d}-${m}-${y}`;
  };

  const dayOptions =
    weather?.days.map((day) => ({
      label: formatDateThai(day.datetime),
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
      <h2>พยากรณ์อากาศ</h2>
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

          <label>จังหวัด:</label>
          <Select
            options={provinceOptions}
            value={province}
            onChange={setProvince}
            isSearchable
          />

          <label>อำเภอ:</label>
          <Select
            options={districtOptions}
            value={district}
            onChange={setDistrict}
            isSearchable
          />

          <label>รัศมีทรงพุ่ม (เมตร):</label>
          <input
            type="number"
            value={canopyRadius}
            onChange={(e) => setCanopyRadius(e.target.value)}
            style={{ width: "100%" }}
            min="0"
            step="1"
          />

          <label>เลือกชนิดพืช:</label>
          <Select
            options={Object.keys(kcOptionsByPlant).map((key) => ({
              label: key,
              value: key,
            }))}
            value={{ label: plantType, value: plantType }}
            onChange={(option) => setPlantType(option.value)}
          />

          <label>Kc (ระยะพัฒนาการของ {plantType}):</label>
          <Select
            options={kcOptionsByPlant[plantType]}
            value={kc}
            onChange={setKc}
          />

          {weather && (
            <>
              <label>เลือกวันที่:</label>
              <Select
                options={dayOptions}
                value={dayOptions.find((opt) => opt.value === selectedDay)}
                onChange={(option) => setSelectedDay(option.value)}
              />
            </>
          )}

          {loading && <p>กำลังโหลดข้อมูล...</p>}
          {error && <p style={{ color: "red" }}>{error}</p>}
        </div>

        <div className="col-6">
          <h4>สภาพอากาศรายชั่วโมง</h4>
          {hourlyData.length === 0 ? (
            <p>ไม่มีข้อมูลรายชั่วโมง</p>
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
                            : "ไม่ระบุ"}
                        </td>
                        <td>
                          {temp !== undefined ? temp.toFixed(1) : "ไม่ระบุ"}
                        </td>
                        <td>
                          {humidity !== undefined
                            ? humidity.toFixed(0)
                            : "ไม่ระบุ"}
                        </td>
                        <td>
                          {solarMJ !== null ? solarMJ.toFixed(2) : "ไม่ระบุ"}
                        </td>
                        <td>
                          {wind !== undefined ? wind.toFixed(1) : "ไม่ระบุ"}
                        </td>
                        <td>
                          {temp !== undefined && humidity !== undefined
                            ? calcVPD(temp, humidity)
                            : "ไม่ระบุ"}
                        </td>
                        <td>
                          {etoHourly !== null
                            ? etoHourly.toFixed(3)
                            : "ไม่ระบุ"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div style={{ marginTop: 10, fontWeight: "bold" }}>
                รวม ETo รายวัน: {totalDailyETo} mm
              </div>
              <div style={{ marginTop: 10, fontWeight: "bold" }}>
                <div>
                  ปริมาณน้ำฝน รายวัน:{" "}
                  {rainfall !== null ? `${rainfall} mm` : "ไม่ระบุ"}
                </div>
                <div>
                  ETc (พืชใช้น้ำ):{" "}
                  {etc !== null ? `${etc.toFixed(3)} mm/day` : "ไม่ระบุ"}
                </div>
                {etc !== null &&
                  rainfall !== null &&
                  canopyAreaSqM !== null && (
                    <div style={{ color: "blue", marginTop: 10 }}>
                      ปริมาณน้ำสุทธิที่ต้องให้น้ำเอง (หลังหักน้ำฝน) = (
                      {etc.toFixed(3)} - {rainfall.toFixed(2)}) ×{" "}
                      {canopyAreaSqM.toFixed(4)} = {waterNetPerTree}{" "}
                      ลิตร/ต้น/วัน
                    </div>
                  )}
              </div>
            </>
          )}
          <VPDDailyChart weather={weather} selectedDay={selectedDay} />
        </div>
      </div>
    </div>
  );
}
