import { useEffect, useRef } from "react";
import { db } from "../firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";

export default function useWeatherAggregator({
  province,
  district,
  canopyRadius,
  kc,
  totalDailyETo,
  rainfall,
  etc,
  waterNetPerTree,
  vpd,
  selectedDay, // 👈 เพิ่มเข้ามา
}) {
  const dataBuffer = useRef([]);
  const hasLoggedInitialInfo = useRef(false); // เพื่อป้องกันบันทึกซ้ำตอน mount

  // ✅ 1. เก็บข้อมูลทันทีเมื่อเข้าเว็บ หรือมีการเปลี่ยนจังหวัด/อำเภอ/วัน
  useEffect(() => {
    if (
      province?.value &&
      district?.value &&
      selectedDay &&
      kc?.value !== undefined &&
      typeof canopyRadius === "number"
    ) {
      const trackingDoc = {
        province: province.value,
        district: district.value,
        canopyRadius: parseFloat(canopyRadius),
        kc: parseFloat(kc.value),
        selectedDay: new Date(selectedDay),
        timestamp: Timestamp.now(),
      };

      if (!hasLoggedInitialInfo.current) {
        hasLoggedInitialInfo.current = true;
        console.log("🚩 บันทึกครั้งแรกหรือค่าที่เปลี่ยน:", trackingDoc);
        addDoc(collection(db, "location_tracking"), trackingDoc).catch((err) =>
          console.error("❌ บันทึก location_tracking ล้มเหลว:", err)
        );
      }
    }
  }, [province, district, selectedDay, canopyRadius, kc]);

  // ✅ 2. เก็บข้อมูลทุก 15 วิ
  useEffect(() => {
    const collectInterval = setInterval(() => {
      if (
        province?.value &&
        district?.value &&
        kc?.value !== undefined &&
        typeof canopyRadius === "number" &&
        totalDailyETo !== null &&
        rainfall !== null &&
        etc !== null &&
        waterNetPerTree !== null &&
        vpd !== null
      ) {
        dataBuffer.current.push({
          province: province.value,
          district: district.value,
          kc: parseFloat(kc.value),
          totalDailyETo: parseFloat(totalDailyETo),
          rainfall: parseFloat(rainfall),
          etc: parseFloat(etc),
          waterNetPerTree: parseFloat(waterNetPerTree),
          vpd: parseFloat(vpd),
          timestamp: new Date(),
        });

        console.log("📥 บัฟเฟอร์ข้อมูลรวม:", dataBuffer.current.length);
      }
    }, 15 * 1000);

    // ✅ 3. สรุปและส่งทุก 1 นาที
    const aggregateInterval = setInterval(async () => {
      const values = dataBuffer.current;
      if (values.length === 0) return;

      const avg = (key) =>
        values.reduce((sum, item) => sum + item[key], 0) / values.length;

      const provinces = Array.from(new Set(values.map((v) => v.province)));

      const now = new Date();

      const combinedSummary = {
        includedProvinces: provinces,
        date: now.toISOString().split("T")[0],
        etc: avg("etc"),
        kc: avg("kc"),
        rainfall: avg("rainfall"),
        totalDailyETo: avg("totalDailyETo"),
        vpd: avg("vpd"),
        waterNetPerTree: avg("waterNetPerTree"),
        timestamp: Timestamp.fromDate(now),
      };

      try {
        await addDoc(collection(db, "weather_combined_summary"), combinedSummary);
        console.log("✅ บันทึกข้อมูลรวมสำเร็จ:", combinedSummary);
      } catch (err) {
        console.error("❌ บันทึกข้อมูลรวมล้มเหลว:", err);
      }

      dataBuffer.current = [];
    }, 60 * 1000);

    return () => {
      clearInterval(collectInterval);
      clearInterval(aggregateInterval);
    };
  }, [
    province,
    district,
    canopyRadius,
    kc,
    totalDailyETo,
    rainfall,
    etc,
    waterNetPerTree,
    vpd,
  ]);
}
