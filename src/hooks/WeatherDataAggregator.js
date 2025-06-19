import { useEffect, useRef } from "react";
import { db } from "../firebase";
import { doc, setDoc, collection, addDoc, Timestamp } from "firebase/firestore";

export default function useWeatherAggregator({
  user, // 👈 เพิ่มตรงนี้
  province,
  district,
  canopyRadius,
  kc,
  totalDailyETo,
  rainfall,
  etc,
  waterNetPerTree,
  vpd,
  selectedDay,
}) {
  const dataBuffer = useRef([]);
  const latestParams = useRef({});

  // 🔁 อัปเดตค่าพารามิเตอร์ล่าสุดใน useRef
  useEffect(() => {
    latestParams.current = {
      province,
      district,
      canopyRadius,
      kc,
      totalDailyETo,
      rainfall,
      etc,
      waterNetPerTree,
      vpd,
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

  // ✅ 2. ตั้ง interval ครั้งเดียวตอน mount เท่านั้น
  useEffect(() => {
    const collectInterval = setInterval(() => {
      const {
        province,
        district,
        kc,
        totalDailyETo,
        rainfall,
        etc,
        waterNetPerTree,
        vpd,
        canopyRadius,
      } = latestParams.current;

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
    }, 1 * 1000);

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
        if (user?.email) {
          const docRef = doc(
            db,
            "weather_combined_summary",
            `${user.email}_${now.toISOString().split("T")[0]}`
          );
          await setDoc(docRef, combinedSummary);
          console.log("✅ บันทึกข้อมูลของ:", user.email);
        }

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
  }, []); // 👈 สำคัญมาก! ไม่มี dependency เพื่อให้รันครั้งเดียว
}
