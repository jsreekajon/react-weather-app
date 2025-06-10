// src/App.js
import React from "react";
import DashboardLayout from "./components/DashboardLayout";
import WeatherApp from "./components/WeatherApp";

export default function App() {
  return (
    <DashboardLayout>
      <WeatherApp />
    </DashboardLayout>
  );
}