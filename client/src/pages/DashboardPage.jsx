// src/pages/DashboardPage.jsx
import React from "react";
import WeatherApp from "../components/WeatherApp";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../firebase";
// ✅ เพิ่มบรรทัดนี้
import useFetchProfile from "../hooks/useFetchProfile";

export default function DashboardPage() {
  const [user] = useAuthState(auth); // ✅ เพิ่มการดึงผู้ใช้จาก Firebase Auth
  useFetchProfile(); // ✅ เรียกใช้ Hook

  return (
    <div>
      <WeatherApp user={user} />
    </div>
  );
}
