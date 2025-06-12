import React, { useState, useEffect, useMemo } from "react";
import Select from "react-select";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

import provinces from "../data/provinces";
import provinceCoordinates from "../data/provinceCoordinates";
import VPDDailyChart from "./VPDDailyChart";
import { calculateHourlyETo } from "../utils/calculateETo";
import "../styles/WeatherTable.css";
import { kcOptions } from "../data/kcOptions";

const API_KEY = "8GEWAKR6AXWDET8C3DVV787XW";

const googleMarkerIcon = new L.Icon({
  iconUrl: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

function FlyToLocation({ coordinates }) {
  const map = useMap();
  useEffect(() => {
    if (coordinates) {
      map.flyTo(coordinates, 10, { animate: true, duration: 1.5 });
    }
  }, [coordinates, map]);
  return null;
}

export default function WeatherApp() {
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
  const [eto, setETo] = useState(null);
  const [canopyRadius, setCanopyRadius] = useState(1);
  const [kc, setKc] = useState(kcOptions[0]);

  const formatDate = (d) => d.toISOString().slice(0, 10);

  useEffect(() => {
    const firstDistrict = provinces[province.value]?.[0];
    if (firstDistrict) {
      setDistrict({ label: firstDistrict, value: firstDistrict });
    }
  }, [province]);

  useEffect(() => {
    const fetchWeather = async () => {
      if (!district || !province) return;
      setLoading(true);
      setError(null);
      setWeather(null);

      try {
        const today = new Date();
        const startDate = formatDate(today);
        const endDate = formatDate(
          new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
        );
        const location = `${province.value},TH`;
        const encodedLocation = encodeURIComponent(location);

        const url = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${encodedLocation}/${startDate}/${endDate}?unitGroup=metric&include=days%2Chours&key=${API_KEY}&contentType=json`;

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
    if (weather?.days?.length > 0) {
      setSelectedDay(weather.days[0].datetime);
    }
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
    const altitude = 100;

    const etoValue = calculateHourlyETo({
      temp: tMean,
      humidity: (rhMax + rhMin) / 2,
      windSpeed,
      solarRadiation,
      altitude,
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

  const calcVPD = (tempC, humidity) => {
    const svp = 0.6108 * Math.exp((17.27 * tempC) / (tempC + 237.3));
    const avp = (humidity / 100) * svp;
    return parseFloat((svp - avp).toFixed(3));
  };

  const provinceOptions = Object.keys(provinces).map((prov) => ({
    label: prov,
    value: prov,
  }));
  const districtOptions =
    provinces[province.value]?.map((dist) => ({ label: dist, value: dist })) ||
    [];
  const dayOptions =
    weather?.days.map((day) => ({
      label: day.datetime,
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
        const temp = hour.temp;
        const humidity = hour.humidity;
        const wind = hour.windspeed || 2;
        const radiationWm2 = hour.solarradiation;
        const solarRadiationMJ =
          radiationWm2 !== undefined && radiationWm2 !== null
            ? (radiationWm2 * 3600) / 1e6
            : null;

        if (
          temp === undefined ||
          humidity === undefined ||
          solarRadiationMJ === null
        )
          return sum;

        const etoHourly = calculateHourlyETo({
          temp,
          humidity,
          windSpeed: wind,
          solarRadiation: solarRadiationMJ,
          altitude: 100,
        });

        return isNaN(etoHourly) ? sum : sum + etoHourly;
      }, 0)
      .toFixed(3);
  }, [hourlyData]);

const etc = useMemo(() => {
  if (eto !== null && kc?.value !== undefined) {
    return (eto * kc.value).toFixed(3); // mm/day
  }
  return null;
}, [eto, kc]);

const canopyAreaSqM = useMemo(() => {
  const r = parseFloat(canopyRadius);
  return !isNaN(r) ? (Math.PI * r * r).toFixed(2) : null;
}, [canopyRadius]);

const waterPerTree = useMemo(() => {
  if (canopyAreaSqM && etc) {
    return (parseFloat(canopyAreaSqM) * parseFloat(etc)).toFixed(2); // ลิตร/ต้น
  }
  return null;
}, [canopyAreaSqM, etc]);


  return (
    <div className="container" style={{ maxWidth: 1200, marginTop: 20 }}>
      <h2>พยากรณ์อากาศ</h2>

      <div className="row">
        <div className="col-6">
          <MapContainer
            center={[13.736717, 100.523186]}
            zoom={10}
            style={{ height: 300, width: "100%", marginBottom: 20 }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FlyToLocation coordinates={mapCenter} />
            {mapCenter && weather && selectedDay && (
              <Marker position={mapCenter} icon={googleMarkerIcon}>
                <Popup>
                  <div>
                    <p>วันที่: {selectedDay}</p>
                    <p>อุณหภูมิเฉลี่ย: {t} °C</p>
                    <p>ความชื้นสัมพัทธ์เฉลี่ย: {h} %</p>
                    <p>
                      การแผ่รังสีแสงอาทิตย์เฉลี่ย:{" "}
                      {l !== undefined
                        ? ((l * 86400) / 1e6).toFixed(2)
                        : "ไม่ระบุ"}{" "}
                      MJ/m²/day
                    </p>
                    <p>
                      VPD (รายวัน): {vpd !== null ? vpd + " kPa" : "ไม่ระบุ"}
                    </p>
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>

          <label htmlFor="province-select">จังหวัด:</label>
          <Select
            inputId="province-select"
            options={provinceOptions}
            value={province}
            onChange={setProvince}
            isSearchable
            styles={{ container: (base) => ({ ...base, marginBottom: 10 }) }}
          />

          <label htmlFor="district-select">อำเภอ:</label>
          <Select
            inputId="district-select"
            options={districtOptions}
            value={district}
            onChange={setDistrict}
            isSearchable
            styles={{ container: (base) => ({ ...base, marginBottom: 10 }) }}
          />

          <label htmlFor="canopy-radius">รัศมีทรงพุ่ม (เมตร):</label>
          <input
            id="canopy-radius"
            type="number"
            value={canopyRadius}
            onChange={(e) => setCanopyRadius(e.target.value)}
            placeholder="ระบุรัศมี (เมตร)"
            style={{ width: "100%", marginBottom: 10, padding: 5 }}
          />

          <label htmlFor="kc-select">ช่วงการพัฒนาการของทุเรียน:</label>
          <Select
            inputId="kc-select"
            options={kcOptions}
            value={kc}
            onChange={setKc}
            isSearchable={false}
            styles={{ container: (base) => ({ ...base, marginBottom: 10 }) }}
          />

          {weather && (
            <>
              <label htmlFor="day-select">เลือกวันที่:</label>
              <Select
                inputId="day-select"
                options={dayOptions}
                value={dayOptions.find((opt) => opt.value === selectedDay)}
                onChange={(option) => setSelectedDay(option.value)}
                isSearchable={false}
                styles={{
                  container: (base) => ({ ...base, marginBottom: 10 }),
                }}
              />
            </>
          )}

          {loading && <p>กำลังโหลดข้อมูล...</p>}
          {error && <p style={{ color: "red" }}>{error}</p>}

          {weather && selectedDay && (
            <div style={{ marginTop: 20 }}>
              <h4>สภาพอากาศรายวัน</h4>
              {weather.days
                .filter((day) => day.datetime === selectedDay)
                .map((day) => {
                  const solarRadiation =
                    day.solarradiation !== undefined
                      ? ((day.solarradiation * 86400) / 1e6).toFixed(2)
                      : "ไม่ระบุ";

                  return (
                    <div key={day.datetime}>
                      <p>สภาพอากาศ: {day.conditions}</p>
                      <p>อุณหภูมิเฉลี่ย: {day.temp} °C</p>
                      <p>ความชื้นสัมพัทธ์เฉลี่ย: {day.humidity}%</p>
                      <p>
                        การแผ่รังสีแสงอาทิตย์เฉลี่ย: {solarRadiation} MJ/m²/day
                      </p>
                      <p>
                        VPD (รายวัน): {vpd !== null ? `${vpd} kPa` : "ไม่ระบุ"}
                      </p>
                    </div>
                  );
                })}
            </div>
          )}
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
                    <th>การแผ่รังสีแสงอาทิตย์ (MJ/m²/hr)</th>
                    <th>VPD (kPa)</th>
                    <th>ETo (mm/hr)</th>
                  </tr>
                </thead>
                <tbody>
                  {hourlyData.map((hour) => {
                    const temp = hour.temp;
                    const humidity = hour.humidity;
                    const wind = hour.windspeed || 2;
                    const radiationWm2 = hour.solarradiation;
                    const solarRadiationMJ =
                      radiationWm2 !== undefined
                        ? (radiationWm2 * 3600) / 1e6
                        : null;

                    const etoHourly =
                      temp !== undefined &&
                      humidity !== undefined &&
                      solarRadiationMJ !== null
                        ? calculateHourlyETo({
                            temp,
                            humidity,
                            windSpeed: wind,
                            solarRadiation: solarRadiationMJ,
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
                          {solarRadiationMJ !== null
                            ? solarRadiationMJ.toFixed(2)
                            : "ไม่ระบุ"}
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
                  {weather && selectedDay
                    ? weather.days
                        .find((d) => d.datetime === selectedDay)
                        ?.precip?.toFixed(2) ?? "ไม่ระบุ"
                    : "ไม่ระบุ"}{" "}
                  mm
                </div>
                <div style={{ color: "blue" }}>
                  {waterPerTree && (
                    <div style={{ color: "green", marginTop: 10 }}>
                      ปริมาณน้ำที่ต้องการรายต้น ≈ {waterPerTree} ลิตร/ต้น
                    </div>
                  )}
                  <div style={{ marginTop: 10, fontWeight: "bold" }}>
                    ETc (พืชใช้น้ำ):{" "}
                    {etc !== null ? `${etc} mm/day` : "ไม่ระบุ"}
                  </div>
                </div>
              </div>
            </>
          )}

          <VPDDailyChart weather={weather} selectedDay={selectedDay} />
        </div>
      </div>
    </div>
  );
}
