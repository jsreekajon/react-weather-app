import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { useLanguage } from "../contexts/LanguageContext";

// 1. นำเข้าข้อมูลสำหรับแปลงภาษา
import provinceEn from "../data/provinceEn";
import districtEn from "../data/districtEn";
import { plantEn } from "../data/kcOptions";

export default function UserDataDisplay() {
  const { lang } = useLanguage();
  const [user, loadingAuth] = useAuthState(auth);
  const [userData, setUserData] = useState(null);
  const [loadingData, setLoadingData] = useState(false);

  // --- 2. ฟังก์ชันช่วยแปลงภาษาข้อมูล (Data Translation Helpers) ---
  const getProvinceLabel = (prov) => {
    if (!prov) return "-";
    return lang === "en" ? provinceEn[prov] || prov : prov;
  };

  const getDistrictLabel = (prov, dist) => {
    if (!prov || !dist) return "-";
    if (lang === "en") {
      const provEnName = provinceEn[prov] || prov;
      return districtEn[provEnName]?.[dist] || dist;
    }
    return dist;
  };

  const getPlantLabel = (plant) => {
    if (!plant) return "-";
    return lang === "en" ? plantEn[plant]?.name || plant : plant;
  };

  // --- 3. นิยามคำแปล (Translations) ---
  const translations = {
    th: {
      loading: "⏳ กำลังโหลดข้อมูล...",
      loginRequired: "กรุณาเข้าสู่ระบบเพื่อดูข้อมูล",
      notFound: (email) => `ไม่พบข้อมูลบันทึกล่าสุดของ ${email}`,
      header: (email, time) => `ข้อมูลล่าสุดของแปลงของคุณ ${email} ที่บันทึกไว้เมื่อ ${time}`,
      
      // Label หลัก
      province: "จังหวัด:",
      district: "อำเภอ:",
      radius: "รัศมีทรงพุ่ม (เมตร):",
      plant: "เลือกชนิดพืช:",
      kc: (plantName) => `Kc (ระยะพัฒนาการของ ${plantName}):`,
      date: "เลือกวันที่:",
      moreInfo: "ข้อมูลเพิ่มเติม:",

      // Label ข้อมูลเทคนิค (แก้ไขตามที่คุณระบุ)
      emailLabel: "Email:",
      etoLabel: "รวม ETo รายวัน:",                 // แก้ไข
      rainLabel: "ปริมาณน้ำฝน รายวัน:",             // แก้ไข
      etcLabel: "ETc (พืชใช้น้ำ):",                // แก้ไข
      waterLabel: "ปริมาณน้ำสุทธิที่ต้องให้น้ำเอง (หลังหักน้ำฝน):", // แก้ไข
      timestampLabel: "Timestamp:",
      
      // หน่วย
      unitDay: "มม./วัน",
      unitRain: "มม.",
      unitLiter: "ลิตร"
    },
    en: {
      loading: "⏳ Loading data...",
      loginRequired: "Please log in to view data.",
      notFound: (email) => `No recent records found for ${email}`,
      header: (email, time) => `Latest data for your plot ${email} recorded on ${time}`,
      
      // Main Labels
      province: "Province:",
      district: "District:",
      radius: "Canopy radius (m):",
      plant: "Plant type:",
      kc: (plantName) => `Kc (Growth stage of ${plantName}):`,
      date: "Selected date:",
      moreInfo: "Additional Information:",

      // Technical Labels
      emailLabel: "Email:",
      etoLabel: "Total Daily ETo:",
      rainLabel: "Rainfall:",
      etcLabel: "ETc:",
      waterLabel: "Water Net Per Tree:",
      timestampLabel: "Timestamp:",
      
      // Units
      unitDay: "mm/day",
      unitRain: "mm",
      unitLiter: "liters"
    }
  };

  const t = translations[lang] || translations.th;

  useEffect(() => {
    if (loadingAuth || !user) return;

    const fetchData = async () => {
      setLoadingData(true);
      try {
        // Query ใช้ userId ตามที่แก้ไขไปก่อนหน้านี้
        const q = query(
          collection(db, "HomePage"),
          where("userId", "==", user.uid),
          orderBy("timestamp", "desc"),
          limit(1)
        );

        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const docData = querySnapshot.docs[0].data();
          setUserData(docData);
        } else {
          console.log("ไม่พบข้อมูลสำหรับ User ID:", user.uid);
          setUserData(null);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [user, loadingAuth]);

  if (loadingAuth || loadingData) {
    return <p style={{ textAlign: "center", marginTop: 20 }}>{t.loading}</p>;
  }

  if (!user) {
    return <p style={{ textAlign: "center", marginTop: 20 }}>{t.loginRequired}</p>;
  }

  if (!userData) {
    return (
      <div style={{ padding: 20, border: "1px solid #ddd", borderRadius: 8, maxWidth: 600, margin: "20px auto", textAlign: "center" }}>
        <p>{t.notFound(user.email)}</p>
      </div>
    );
  }

  // เตรียมค่าสำหรับแสดงผล (ผ่านฟังก์ชันแปลงภาษา)
  const timestampStr = userData.timestamp?.toDate 
    ? userData.timestamp.toDate().toLocaleString(lang === "en" ? "en-US" : "th-TH") 
    : "";
    
  const displayProvince = getProvinceLabel(userData.province);
  const displayDistrict = getDistrictLabel(userData.province, userData.district);
  const displayPlant = getPlantLabel(userData.plantType);

  return (
    <div style={{ padding: 20, border: "1px solid #ddd", borderRadius: 8, maxWidth: 600, margin: "20px auto", backgroundColor: "#f9f9f9" }}>
      {/* ส่วนหัวข้อ */}
      <h3 style={{ borderBottom: "2px solid #4caf50", paddingBottom: 10, fontSize: "1.1em", lineHeight: "1.5" }}>
        {t.header(userData.userEmail, timestampStr)}
      </h3>
      
      {/* ส่วนแสดงผลหลัก (ใช้ค่าตัวแปร display... ที่แปลงภาษาแล้ว) */}
      <div style={{ marginBottom: 20, fontSize: "1em", lineHeight: "1.8" }}>
        <p><strong>{t.province}</strong> {displayProvince}</p>
        <p><strong>{t.district}</strong> {displayDistrict}</p>
        <p><strong>{t.radius}</strong> {userData.canopyRadius}</p>
        <p><strong>{t.plant}</strong> {displayPlant}</p>
        <p><strong>{t.kc(displayPlant)}</strong> {userData.kc}</p>
        <p><strong>{t.date}</strong> {userData.selectedDate}</p>
      </div>

      <hr />

      {/* ส่วนข้อมูลเพิ่มเติม */}
      <div style={{ fontSize: "0.9em", color: "#555" }}>
        <h4 style={{ marginBottom: 10 }}>{t.moreInfo}</h4>
        <ul style={{ listStyleType: "none", paddingLeft: 0, lineHeight: "1.6" }}>
          <li><strong>{t.emailLabel}</strong> {userData.userEmail}</li>
          <li><strong>{t.etoLabel}</strong> {userData.totalDailyETo} {t.unitDay}</li>
          <li><strong>{t.rainLabel}</strong> {userData.rainfall} {t.unitRain}</li>
          <li><strong>{t.etcLabel}</strong> {userData.etc} {t.unitDay}</li>
          <li><strong>{t.waterLabel}</strong> {userData.waterNetPerTree} {t.unitLiter}</li>
          <li><strong>{t.timestampLabel}</strong> {timestampStr}</li>
        </ul>
      </div>
    </div>
  );
}