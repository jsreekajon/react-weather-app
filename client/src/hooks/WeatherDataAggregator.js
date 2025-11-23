import { useEffect, useState } from "react";
import {
  getFirestore,
  collection,
  query,
  limit,
  orderBy,
  where,
  getDocs,
  startAfter
} from "firebase/firestore";
import { app } from "../firebase";

const db = getFirestore(app);

// ปรับปรุงฟังก์ชันให้รองรับ selectedProvince และการ Pagination
export default function useWeatherDataAggregator(user, selectedProvince = null) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false); // สำหรับตอนโหลดเพิ่ม
  const [lastVisible, setLastVisible] = useState(null); // เก็บตำแหน่งเอกสารสุดท้ายที่โหลด
  const [hasMore, setHasMore] = useState(true); // เช็คว่ามีข้อมูลเหลือไหม

  const PAGE_SIZE = 20; // จำกัดจำนวนต่อหน้า (ตามข้อ 2)

  // ฟังก์ชันสำหรับดึงข้อมูล (ใช้ร่วมกันทั้งโหลดครั้งแรกและโหลดเพิ่ม)
  const fetchData = async (isLoadMore = false) => {
    if (!user) return;

    // ถ้าเป็นการโหลดเพิ่ม ให้ใช้ loadingMore, ถ้าโหลดใหม่ใช้ loading ปกติ
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      // 1. อ้างอิงไปที่ Collection ที่ถูกต้อง (weather_results)
      const weatherRef = collection(db, "weather_results");

      let q;
      const constraints = [];

      // 2. & 3. สร้าง Query Conditions
      if (selectedProvince) {
        // ถ้ามีการเลือกจังหวัด ให้กรองตามจังหวัด
        constraints.push(where("province", "==", selectedProvince));
        // หมายเหตุ: การใช้ where ร่วมกับ orderBy อาจต้องสร้าง Index ใน Firestore Console
        constraints.push(orderBy("date", "desc")); 
      } else {
        // ถ้าไม่เลือกจังหวัด ให้เรียงตามวันที่ล่าสุด
        constraints.push(orderBy("date", "desc"));
      }

      // 4. Pagination: ถ้าเป็นการโหลดเพิ่ม ให้เริ่มต่อจากตัวสุดท้าย
      if (isLoadMore && lastVisible) {
        constraints.push(startAfter(lastVisible));
      }

      // จำกัดจำนวนการอ่าน (ข้อ 2 และ 3)
      constraints.push(limit(PAGE_SIZE));

      // ประกอบ Query
      q = query(weatherRef, ...constraints);

      // ดึงข้อมูล
      const snapshot = await getDocs(q);

      // เก็บตำแหน่งเอกสารสุดท้ายสำหรับรอบถัดไป
      const lastDoc = snapshot.docs[snapshot.docs.length - 1];
      if (snapshot.docs.length < PAGE_SIZE) {
        setHasMore(false); // ข้อมูลหมดแล้ว
      } else {
        setLastVisible(lastDoc);
        setHasMore(true);
      }

      const newDocs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      if (isLoadMore) {
        setData((prev) => [...prev, ...newDocs]); // ต่อข้อมูลท้ายเดิม
      } else {
        setData(newDocs); // ทับข้อมูลเดิม (รีเซ็ต)
      }

    } catch (err) {
      console.error("เกิดข้อผิดพลาดในการดึงข้อมูล:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Effect สำหรับโหลดข้อมูลครั้งแรก หรือเมื่อเปลี่ยนจังหวัด/User
  useEffect(() => {
    // รีเซ็ตค่าต่างๆ เมื่อเงื่อนไขเปลี่ยน
    setData([]);
    setLastVisible(null);
    setHasMore(true);
    
    fetchData(false); // โหลดครั้งแรก
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, selectedProvince]);

  // ฟังก์ชันสำหรับปุ่ม "โหลดเพิ่มเติม"
  const loadMore = () => {
    if (!loading && !loadingMore && hasMore) {
      fetchData(true);
    }
  };

  return { data, loading, loadingMore, hasMore, loadMore };
}