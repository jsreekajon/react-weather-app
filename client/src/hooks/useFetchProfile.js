import { useEffect, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

export default function useFetchProfile() {
  const [user] = useAuthState(auth);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const updateUserProfile = async () => {
      if (user) {
        // 1. สร้าง Reference ไปยังเอกสาร User ใน Firestore
        const userRef = doc(db, "users", user.uid);
        
        // 2. เตรียมข้อมูลที่จะบันทึก
        const userData = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          lastLogin: serverTimestamp(), // อัปเดตเวลาล็อกอินล่าสุด
        };

        try {
          // 3. ใช้ setDoc + { merge: true }
          // นี่คือส่วนที่ "สร้างถ้าไม่มี หรือ อัปเดตถ้ามี"
          await setDoc(userRef, userData, { merge: true });
          
          // ตั้งค่าโปรไฟล์ (เผื่อคุณอยากใช้ข้อมูลนี้ในแอป)
          setProfile(userData);
          console.log("User profile created/updated in Firestore.");

        } catch (error) {
          console.error("Error updating user profile:", error);
        }
      }
    };

    updateUserProfile();
  }, [user]); // Hook นี้จะทำงานทุกครั้งที่สถานะ user เปลี่ยน (เช่น เพิ่งล็อกอิน)

  return profile;
}