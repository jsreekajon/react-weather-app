import { useEffect } from "react";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export default function useWeatherAggregator({
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
}) {
  useEffect(() => {
    const interval = setInterval(async () => {
      if (
        vpd !== null &&
        province?.value &&
        district?.value &&
        selectedDay &&
        typeof canopyRadius === "number" &&
        kc?.value !== undefined &&
        totalDailyETo !== null &&
        rainfall !== null &&
        etc !== null &&
        !isNaN(parseFloat(etc)) &&
        waterNetPerTree !== null
      ) {
        const locationKey = `${province.value}_${district.value}`;
        const metaDocRef = doc(db, "locations_meta", "active_areas");

        const locationDoc = {
          province: province.value,
          district: district.value,
          canopyRadius: parseFloat(canopyRadius),
          kc: parseFloat(kc.value),
          totalDailyETo: parseFloat(totalDailyETo),
          rainfall: parseFloat(rainfall),
          etc: parseFloat(etc.toFixed(3)),
          waterNetPerTree: parseFloat(waterNetPerTree),
          selectedDay: new Date(selectedDay),
          timestamp: new Date(),
        };

        try {
          const snapshot = await getDoc(metaDocRef);

          if (snapshot.exists()) {
            const existingData = snapshot.data();
            const currentKeys = existingData.locationKeys || [];
            const currentDetails = existingData.locationDetails || [];

            // เพิ่ม locationKey ถ้ายังไม่มี
            const newKeys = currentKeys.includes(locationKey)
              ? currentKeys
              : [...currentKeys, locationKey];

            // เพิ่ม locationDoc เข้า array ทุกครั้ง
            const newDetails = [...currentDetails, locationDoc];

            await setDoc(metaDocRef, {
              locationKeys: newKeys,
              locationDetails: newDetails,
            });
          } else {
            await setDoc(metaDocRef, {
              locationKeys: [locationKey],
              locationDetails: [locationDoc],
            });
          }

          console.log("✅ บันทึก locationDetails แล้ว");
        } catch (err) {
          console.error("❌ บันทึก locationDetails ล้มเหลว", err);
        }
      }
    }, 15 * 1000);

    return () => clearInterval(interval);
  }, [
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
  ]);
}
