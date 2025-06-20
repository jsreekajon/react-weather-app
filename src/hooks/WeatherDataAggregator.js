import { useEffect, useRef } from "react";
import { db } from "../firebase";
import { doc, setDoc, getDoc, Timestamp } from "firebase/firestore";

export default function useWeatherAggregator({
  user,
  province,
  district,
  canopyRadius,
  kc,
  totalDailyETo,
  rainfall,
  etc,
  waterNetPerTree,
  vpd,
}) {
  const dataBuffer = useRef([]);
  const latestParams = useRef({});

  const joinUniqueList = (arr) =>
    [...new Set(
      arr
        .map((e) => e.trim())
        .filter((e) => e !== "" && e !== "จังหวัด" && e !== "อำเภอ")
    )];

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
    }, 1000);

    const aggregateInterval = setInterval(async () => {
      const values = dataBuffer.current;
      if (values.length === 0) return;

      const now = new Date();
      const today = now.toISOString().split("T")[0];
      const docId = user?.uid || `anon_${now.getTime()}`;
      const docRef = doc(db, "weather_combined_summary", docId);

      try {
        const provinceVal = province?.value;
        const districtVal = district?.value;

        if (!provinceVal || !districtVal) {
          console.warn("⛔️ จังหวัดหรืออำเภอไม่ถูกต้อง");
          dataBuffer.current = [];
          return;
        }

        const docSnap = await getDoc(docRef);
        let existingEntries = docSnap.exists() ? docSnap.data().entries || [] : [];

        const avg = (key) =>
          parseFloat(
            (
              values.reduce((sum, item) => sum + item[key], 0) / values.length
            ).toFixed(2)
          );

        const entryIndex = existingEntries.findIndex((e) => e.date === today);

        if (entryIndex !== -1) {
          let existingEntry = existingEntries[entryIndex];

          const provList = existingEntry.province || [];
          const distList = existingEntry.district || [];

          const newProvList = joinUniqueList([...provList, provinceVal]);
          const newDistList = joinUniqueList([...distList, districtVal]);

          const isProvinceAdded = !provList.includes(provinceVal);
          const isDistrictAdded = !distList.includes(districtVal);

          if (isProvinceAdded || isDistrictAdded) {
            existingEntries[entryIndex] = {
              ...existingEntry,
              province: newProvList,
              district: newDistList,
              etc: avg("etc"),
              kc: avg("kc"),
              rainfall: avg("rainfall"),
              totalDailyETo: avg("totalDailyETo"),
              vpd: avg("vpd"),
              waterNetPerTree: avg("waterNetPerTree"),
              timestamp: Timestamp.fromDate(now),
            };
            console.log("✅ อัปเดตข้อมูลจังหวัด/อำเภอใหม่ใน entry เดิม:", existingEntries[entryIndex]);
          } else {
            console.log("⏩ ข้าม: จังหวัด/อำเภอนี้ถูกบันทึกไปแล้วในวันนี้");
          }
        } else {
          const newEntry = {
            date: today,
            province: [provinceVal],
            district: [districtVal],
            etc: avg("etc"),
            kc: avg("kc"),
            rainfall: avg("rainfall"),
            totalDailyETo: avg("totalDailyETo"),
            vpd: avg("vpd"),
            waterNetPerTree: avg("waterNetPerTree"),
            timestamp: Timestamp.fromDate(now),
          };

          existingEntries.push(newEntry);
          console.log("✅ เพิ่ม entry ใหม่:", newEntry);
        }

        const summaryAvg = {
          avgEtc: parseFloat(
            (existingEntries.reduce((sum, e) => sum + e.etc, 0) / existingEntries.length).toFixed(2)
          ),
          avgKc: parseFloat(
            (existingEntries.reduce((sum, e) => sum + e.kc, 0) / existingEntries.length).toFixed(2)
          ),
          avgRainfall: parseFloat(
            (existingEntries.reduce((sum, e) => sum + e.rainfall, 0) / existingEntries.length).toFixed(2)
          ),
          avgTotalDailyETo: parseFloat(
            (existingEntries.reduce((sum, e) => sum + e.totalDailyETo, 0) / existingEntries.length).toFixed(2)
          ),
          avgVpd: parseFloat(
            (existingEntries.reduce((sum, e) => sum + e.vpd, 0) / existingEntries.length).toFixed(2)
          ),
          avgWaterNetPerTree: parseFloat(
            (existingEntries.reduce((sum, e) => sum + e.waterNetPerTree, 0) / existingEntries.length).toFixed(2)
          ),
        };

        await setDoc(
          docRef,
          {
            entries: existingEntries,
            summaryAvg,
          },
          { merge: true }
        );

        console.log("✅ บันทึกสำเร็จ");
      } catch (err) {
        console.error("❌ เกิดข้อผิดพลาดในการบันทึก:", err);
      }

      dataBuffer.current = [];
    }, 60000);

    return () => {
      clearInterval(collectInterval);
      clearInterval(aggregateInterval);
    };
  }, [user?.uid, province?.value, district?.value]);
}
