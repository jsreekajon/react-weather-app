// src/pages/DashboardPage.jsx
import React from "react";
import WeatherApp from "../components/WeatherApp";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../firebase";

export default function DashboardPage() {
  const [user] = useAuthState(auth);

  return (
    <div>
      <WeatherApp user={user} />
    </div>
  );
}
