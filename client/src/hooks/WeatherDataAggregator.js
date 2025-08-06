import { useEffect, useState } from "react";
import { getFirestore, collectionGroup, query, where, getDocs } from "firebase/firestore";
import { app } from "../firebase";

const db = getFirestore(app);

export default function useWeatherDataAggregator(user) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !user.email) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const q = query(
          collectionGroup(db, "weather"),
          where("user", "==", user.email)
        );
        const snapshot = await getDocs(q);
        const docs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setData(docs);
      } catch (err) {
        console.error("เกิดข้อผิดพลาดในการดึงข้อมูล:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user], [user.email]); // ✅ ใส่ dependency ให้ถูกต้อง

  return { data, loading };
}
