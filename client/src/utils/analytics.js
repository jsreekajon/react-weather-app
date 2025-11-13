// client/src/utils/analytics.js
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

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