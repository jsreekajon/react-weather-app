import { useEffect } from "react";
import { getAuth } from "firebase/auth";
import { app } from "../firebase"; // ต้อง export app จาก firebase.js

export default function useFetchProfile() {
  useEffect(() => {
    const fetchProfile = async () => {
      const auth = getAuth(app);
      const user = auth.currentUser;

      if (!user) {
        console.log("User not signed in");
        return;
      }

      const token = await user.getIdToken();
      console.log("🔐 User Token:", token);

      // ✅ เปลี่ยน URL ตรงนี้
      const res = await fetch("/api/profile", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      console.log("✅ Profile Data:", data);
    };

    fetchProfile();
  }, []);
}
