import React, { useState, useEffect } from "react";
import Select from "react-select";
import WeatherMap from "../components/map"; // ✅ เรียกใช้คอมโพเนนต์แผนที่
import provinces from "../data/provinces";
import provinceCoordinates from "../data/provinceCoordinates";
import { db } from "../firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const API_KEY = "8GEWAKR6AXWDET8C3DVV787XW";

export default function HomePage() {
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
  const [weather, setWeather] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [t, setT] = useState(null);
  const [h, setH] = useState(null);
  const [l, setL] = useState(null);
  const [vpd, setVpd] = useState(null);

  const [myTemp, setMyTemp] = useState("");
  const [myHumidity, setMyHumidity] = useState("");
  const [mySolar, setMySolar] = useState("");
  const [myWind, setMyWind] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  const provinceOptions = Object.keys(provinces).map((prov) => ({
    label: prov,
    value: prov,
  }));

  const districtOptions =
    provinces[province.value]?.map((dist) => ({ label: dist, value: dist })) ||
    [];

  const coordKey = `${province.value}_${district.value}`;
  const mapCenter =
    provinceCoordinates[coordKey] || provinceCoordinates[province.value];

  const formatDate = (d) => d.toISOString().slice(0, 10);

  useEffect(() => {
    const firstDistrict = provinces[province.value]?.[0];
    if (firstDistrict)
      setDistrict({ label: firstDistrict, value: firstDistrict });
  }, [province]);

  useEffect(() => {
    const fetchWeather = async () => {
      const today = new Date();
      const startDate = formatDate(today);
      const endDate = formatDate(new Date(today.getTime() + 7 * 86400000));
      const location = `${province.value},TH`;
      const url = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${encodeURIComponent(
        location
      )}/${startDate}/${endDate}?unitGroup=metric&include=days&key=${API_KEY}&contentType=json`;

      try {
        const res = await fetch(url);
        const data = await res.json();
        setWeather(data);
        setSelectedDay(data.days[0].datetime);
      } catch (err) {
        console.error("โหลดข้อมูลล้มเหลว:", err);
      }
    };

    if (province && district) fetchWeather();
  }, [province, district]);

  useEffect(() => {
    if (weather && selectedDay) {
      const day = weather.days.find((d) => d.datetime === selectedDay);
      if (day) {
        setT(day.temp);
        setH(day.humidity);
        setL(day.solarradiation);
        const svp = 0.6108 * Math.exp((17.27 * day.temp) / (day.temp + 237.3));
        const avp = (day.humidity / 100) * svp;
        setVpd(parseFloat((svp - avp).toFixed(3)));
      }
    }
  }, [weather, selectedDay]);

  const formatDateThai = (isoDate) => {
    const [y, m, d] = isoDate.split("-");
    return `${d}-${m}-${y}`;
  };

  const todayISO = new Date().toISOString().split("T")[0];
  const dayOptions = [
    {
      label: formatDateThai(todayISO),
      value: todayISO,
    },
  ];

  const handleSave = async () => {
    if (isFormComplete) {
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) throw new Error("User not logged in");

        const token = await user.getIdToken(); // ⬅️ ได้ token

        const res = await fetch("http://localhost:3001/api/weather-input", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`, // ⬅️ ส่ง token ไปให้ backend
          },
          body: JSON.stringify({
            temp: parseFloat(myTemp),
            humidity: parseFloat(myHumidity),
            solar: parseFloat(mySolar),
            wind: parseFloat(myWind),
            province: province.value,
            district: district.value,
            date: selectedDay,
          }),
        });

        let result;
        try {
          result = await res.json();
        } catch (e) {
          console.warn("⚠️ ไม่สามารถแปลง response เป็น JSON:", e);
          result = { error: "Invalid response from server" };
        }

        if (res.ok) {
          setSaveMessage("✅ ส่งข้อมูลสำเร็จ");
        } else {
          throw new Error(result.error || "Unknown error");
        }
      } catch (error) {
        console.error("❌ error:", error);
        setSaveMessage("❌ เกิดข้อผิดพลาดขณะส่งข้อมูล");
      }
    }
  };

  const isFormComplete =
    myTemp.trim() !== "" &&
    myHumidity.trim() !== "" &&
    mySolar.trim() !== "" &&
    myWind.trim() !== "";

  return (
    <div className="container" style={{ maxWidth: 1200, marginTop: 20 }}>
      <h2>เลือกพื้นที่และวันที่</h2>

      {/* ✅ แผนที่ */}
      <div style={{ marginBottom: 20 }}>
        <WeatherMap
          mapCenter={mapCenter} // ✅ ถูกต้อง
          weather={weather}
          selectedDay={selectedDay}
          t={t}
          h={h}
          l={l}
          vpd={vpd}
        />
      </div>

      {/* ✅ Dropdown */}
      <label>จังหวัด:</label>
      <Select
        options={provinceOptions}
        value={province}
        onChange={setProvince}
      />

      <label>อำเภอ:</label>
      <Select
        options={districtOptions}
        value={district}
        onChange={setDistrict}
      />

      {weather && (
        <>
          <label>วันที่:</label>
          <Select
            options={dayOptions}
            value={dayOptions[0]}
            isDisabled={true}
          />
        </>
      )}

      {/* ✅ ช่องกรอกข้อมูลผู้ใช้ */}
      <div style={{ marginTop: 20 }}>
        <h4>กรอกข้อมูลของคุณเอง</h4>
        <label>อุณหภูมิของฉัน (°C):</label>
        <input
          type="number"
          value={myTemp}
          onChange={(e) => setMyTemp(e.target.value)}
          style={{ width: "100%", marginBottom: 10 }}
        />

        <label>ความชื้นของฉัน (%):</label>
        <input
          type="number"
          value={myHumidity}
          onChange={(e) => setMyHumidity(e.target.value)}
          style={{ width: "100%", marginBottom: 10 }}
        />

        <label>ปริมาณแสงแดดของฉัน (W/m²):</label>
        <input
          type="number"
          value={mySolar}
          onChange={(e) => setMySolar(e.target.value)}
          style={{ width: "100%", marginBottom: 10 }}
        />

        <label>ความเร็วลมของฉัน (km/h):</label>
        <input
          type="number"
          value={myWind}
          onChange={(e) => setMyWind(e.target.value)}
          style={{ width: "100%", marginBottom: 10 }}
        />

        {/* ปุ่มบันทึกข้อมูลหรือข้อความแจ้งเตือน */}
        {!user ? (
          <div
            style={{
              marginTop: 10,
              padding: "10px 20px",
              backgroundColor: "#dc3545",
              color: "#fff",
              borderRadius: 4,
              textAlign: "center",
              fontWeight: "bold",
            }}
          >
            ต้อง login ก่อน
          </div>
        ) : (
          <button
            onClick={handleSave}
            disabled={!isFormComplete}
            style={{
              marginTop: 10,
              padding: "10px 20px",
              backgroundColor: isFormComplete ? "#28a745" : "#ccc",
              color: "#fff",
              border: "none",
              cursor: isFormComplete ? "pointer" : "not-allowed",
            }}
          >
            บันทึกข้อมูล
          </button>
        )}

        {saveMessage && (
          <p
            style={{
              marginTop: 10,
              color: saveMessage.startsWith("✅") ? "green" : "red",
            }}
          >
            {saveMessage}
          </p>
        )}
      </div>
    </div>
  );
}
