import { db } from "../firebase";
import {
  doc,
  setDoc,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

/**
 * บันทึกการเข้าชมหน้าไปยัง Firestore
 * @param {User} user - อ็อบเจ็กต์ user จาก useAuthState
 * @param {string} pageName - ชื่อหน้า (เช่น 'HomePage', 'DashboardPage')
 * @param {object} context - ข้อมูลเพิ่มเติม (เช่น จังหวัด, อำเภอ)
 */
export const logPageView = async (user, pageName, context = {}) => {
  if (!user) return; // ไม่ต้องบันทึกถ้า user ยังไม่ล็อกอิน

  try {
    await addDoc(collection(db, "page_views"), {
      userId: user.uid,
      userEmail: user.email,
      pageName: pageName,
      timestamp: serverTimestamp(),
      ...context, // เช่น province, district
    });
    console.log(`Page view logged for: ${pageName}`);
  } catch (error) {
    console.error("Error logging page view:", error);
  }
};

/**
 * บันทึกข้อมูลสรุป Dashboard ลง Firestore
 * @param {User} user - อ็อบเจ็กต์ user จาก useAuthState
 * @param {object} data - ข้อมูลที่ต้องการบันทึก {province, district, startDate, endDate, yAxis}
 */
export const logDashboardSummary = async (user, data = {}) => {
  if (!user) return;

  try {
    await addDoc(collection(db, "dashboard_summaries"), {
      userId: user.uid,
      userEmail: user.email,
      province: data.province || "",
      district: data.district || "",
      startDate: data.startDate || "",
      endDate: data.endDate || "",
      yAxis: data.yAxis || "",
      timestamp: serverTimestamp(),
    });
    console.log("Dashboard summary logged");
  } catch (error) {
    console.error("Error logging dashboard summary:", error);
  }
};

/**
 * บันทึกข้อมูลค้นหา Data Page ลง Firestore (สร้าง document ใหม่ทุกครั้ง)
 * @param {User} user - อ็อบเจ็กต์ user จาก useAuthState
 * @param {object} data - ข้อมูลที่ต้องการบันทึก {province, district, plantType, kc, startDate, endDate}
 */
export const logDataPageSearch = async (user, data = {}) => {
  console.log("[logDataPageSearch] called with:", { user, data });
  if (!user || !user.email) {
    console.error("[logDataPageSearch] No user or user.email", { uid: user?.uid, email: user?.email });
    return;
  }

  try {
    // Create a new random ID, then combine with the user's email to form the document ID
    const newDocRef = doc(collection(db, "DataPage"));
    const randomId = newDocRef.id;
    const compositeId = `${user.email}_${randomId}`;
    const finalDocRef = doc(db, "DataPage", compositeId);
    console.log("[logDataPageSearch] Generated composite ID:", compositeId);

    const docData = {
      userId: user.uid,
      userEmail: user.email,
      province: data.province || "",
      district: data.district || "",
      plantType: data.plantType || "",
      kc: data.kc || "",
      startDate: data.startDate || "",
      endDate: data.endDate || "",
      timestamp: serverTimestamp(),
    };
    console.log("[logDataPageSearch] Document data:", docData);

    await setDoc(finalDocRef, docData);
    console.log("[logDataPageSearch] ✅ Document successfully written!");
  } catch (error) {
    console.error("[logDataPageSearch] ❌ Error logging DataPage search:", error);
    throw error;
  }
};

/**
 * บันทึกข้อมูลสรุป Weather Minute ลง Firestore
 * @param {User} user - อ็อบเจ็กต์ user จาก useAuthState
 * @param {object} data - ข้อมูลที่ต้องการบันทึก
 */
export const logMinuteSummary = async (user, data = {}) => {
  if (!user) return;

  try {
    await addDoc(collection(db, "weather_minute_summary"), {
      userId: user.uid,
      userEmail: user.email,
      province: data.province || "",
      district: data.district || "",
      canopyRadius: data.canopyRadius || 0,
      kc: data.kc || 0,
      selectedDay: data.selectedDay || "",
      totalDailyETo: data.totalDailyETo || 0,
      rainfall: data.rainfall || 0,
      etc: data.etc || 0,
      waterNetPerTree: data.waterNetPerTree || 0,
      vpd: data.vpd || 0,
      timestamp: serverTimestamp(),
    });
    console.log("Weather minute summary logged");
  } catch (error) {
    console.error("Error logging weather minute summary:", error);
  }
};

/**
 * บันทึกข้อมูลสรุป HomePage ลง Firestore (ID = email + _ + randomId)
 * @param {User} user - อ็อบเจ็กต์ user จาก useAuthState
 * @param {object} data - ข้อมูลที่ต้องการบันทึก
 */
export const logHomePageSummary = async (user, data = {}) => {
  if (!user || !user.email) return;

  try {
    // 1. สร้าง Reference เอกสารใหม่เพื่อให้ได้ ID สุ่ม (ยังไม่สร้างเอกสารจริง)
    const newDocRef = doc(collection(db, "HomePage"));
    const randomId = newDocRef.id; // ดึง ID สุ่มออกมา

    // 2. ประกอบ ID ใหม่ตามที่คุณต้องการ (Email + _ + IDสุ่ม)
    const compositeId = `${user.email}_${randomId}`;

    // 3. สร้าง Reference ไปยัง ID ที่เราประกอบขึ้นมาเอง
    const finalDocRef = doc(db, "HomePage", compositeId);

    // 4. ใช้ setDoc เพื่อสร้างเอกสารด้วย ID ที่เรากำหนดเอง
    await setDoc(finalDocRef, {
      userId: user.uid,
      userEmail: user.email,
      province: data.province || "",
      district: data.district || "",
      canopyRadius: data.canopyRadius || 0,
      plantType: data.plantType || "",
      kc: data.kc || 0,
      selectedDate: data.selectedDate || "",
      totalDailyETo: data.totalDailyETo || 0,
      rainfall: data.rainfall || 0,
      etc: data.etc || 0,
      waterNetPerTree: data.waterNetPerTree || 0,
      climateTempDelta: data.climateTempDelta || 0,
      climateHumidityDelta: data.climateHumidityDelta || 0,
      timestamp: serverTimestamp(),
    });

    console.log("HomePage summary logged with composite ID:", compositeId);
  } catch (error) {
    console.error("Error logging HomePage summary:", error);
  }
};

/**
 * บันทึกข้อมูลสรุป DashboardPage ลง Firestore (สร้าง document ใหม่ทุกครั้ง)
 * @param {User} user - อ็อบเจ็กต์ user จาก useAuthState
 * @param {object} data - ข้อมูลที่ต้องการบันทึก {province, district, startDate, endDate, yAxis}
 */
export const logDashboardPageSummary = async (user, data = {}) => {
  console.log("[logDashboardPageSummary] called with:", { user, data });
  if (!user || !user.email) {
    console.error("[logDashboardPageSummary] No user or user.email", { uid: user?.uid, email: user?.email });
    return;
  }

  try {
    // Create a new random ID, then combine with the user's email to form the document ID
    const newDocRef = doc(collection(db, "DashboardPage"));
    const randomId = newDocRef.id;
    const compositeId = `${user.email}_${randomId}`;
    const finalDocRef = doc(db, "DashboardPage", compositeId);
    console.log("[logDashboardPageSummary] Generated composite ID:", compositeId);

    const docData = {
      userId: user.uid,
      userEmail: user.email,
      province: data.province || "",
      district: data.district || "",
      startDate: data.startDate || "",
      endDate: data.endDate || "",
      yAxis: data.yAxis || "",
      timestamp: serverTimestamp(),
    };
    console.log("[logDashboardPageSummary] Document data:", docData);

    await setDoc(finalDocRef, docData);
    console.log("[logDashboardPageSummary] ✅ Document successfully written!");
  } catch (error) {
    console.error("[logDashboardPageSummary] ❌ Error logging DashboardPage summary:", error);
    throw error;
  }
};

/**
 * บันทึกข้อมูลสรุป DataPage ลง Firestore (สร้าง document ใหม่ทุกครั้ง)
 * @param {User} user - อ็อบเจ็กต์ user จาก useAuthState
 * @param {object} data - ข้อมูลที่ต้องการบันทึก {province, district, plantType, kc, startDate, endDate}
 */
export const logDataPageSummary = async (user, data = {}) => {
  if (!user || !user.email) return;

  try {
    await addDoc(collection(db, "data"), {
      userId: user.uid,
      userEmail: user.email,
      province: data.province || "",
      district: data.district || "",
      plantType: data.plantType || "",
      kc: data.kc || "",
      startDate: data.startDate || "",
      endDate: data.endDate || "",
      timestamp: serverTimestamp(),
    });
    console.log("DataPage summary logged for:", user.email);
  } catch (error) {
    console.error("Error logging DataPage summary:", error);
  }
};