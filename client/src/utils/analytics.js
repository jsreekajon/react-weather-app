// client/src/utils/analytics.js
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp, setDoc, doc } from "firebase/firestore";

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
 * บันทึกข้อมูลค้นหา Data Page ลง Firestore
 * @param {User} user - อ็อบเจ็กต์ user จาก useAuthState
 * @param {object} data - ข้อมูลที่ต้องการบันทึก {province, district, plantType, kc, startDate, endDate}
 */
export const logDataPageSearch = async (user, data = {}) => {
  if (!user) return;

  try {
    await addDoc(collection(db, "data_searches"), {
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
    console.log("Data page search logged");
  } catch (error) {
    console.error("Error logging data page search:", error);
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
 * บันทึกข้อมูลสรุป HomePage ลง Firestore (Document ID = email)
 * @param {User} user - อ็อบเจ็กต์ user จาก useAuthState
 * @param {object} data - ข้อมูลที่ต้องการบันทึก
 */
export const logHomePageSummary = async (user, data = {}) => {
  if (!user || !user.email) return;

  try {
    await setDoc(
      doc(db, "HomePage", user.email),
      {
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
      },
      { merge: true }
    );
    console.log("HomePage summary logged for:", user.email);
  } catch (error) {
    console.error("Error logging HomePage summary:", error);
  }
};

/**
 * บันทึกข้อมูลสรุป DashboardPage ลง Firestore (Document ID = email)
 * @param {User} user - อ็อบเจ็กต์ user จาก useAuthState
 * @param {object} data - ข้อมูลที่ต้องการบันทึก {province, district, startDate, endDate, yAxis}
 */
export const logDashboardPageSummary = async (user, data = {}) => {
  if (!user || !user.email) return;

  try {
    await setDoc(
      doc(db, "DashboardPage", user.email),
      {
        userId: user.uid,
        userEmail: user.email,
        province: data.province || "",
        district: data.district || "",
        startDate: data.startDate || "",
        endDate: data.endDate || "",
        yAxis: data.yAxis || "",
        timestamp: serverTimestamp(),
      },
      { merge: true }
    );
    console.log("DashboardPage summary logged for:", user.email);
  } catch (error) {
    console.error("Error logging DashboardPage summary:", error);
  }
};

/**
 * บันทึกข้อมูลสรุป DataPage ลง Firestore (Document ID = email)
 * @param {User} user - อ็อบเจ็กต์ user จาก useAuthState
 * @param {object} data - ข้อมูลที่ต้องการบันทึก {province, district, plantType, kc, startDate, endDate}
 */
export const logDataPageSummary = async (user, data = {}) => {
  if (!user || !user.email) return;

  try {
    await setDoc(
      doc(db, "data", user.email),
      {
        userId: user.uid,
        userEmail: user.email,
        province: data.province || "",
        district: data.district || "",
        plantType: data.plantType || "",
        kc: data.kc || "",
        startDate: data.startDate || "",
        endDate: data.endDate || "",
        timestamp: serverTimestamp(),
      },
      { merge: true }
    );
    console.log("DataPage summary logged for:", user.email);
  } catch (error) {
    console.error("Error logging DataPage summary:", error);
  }
};