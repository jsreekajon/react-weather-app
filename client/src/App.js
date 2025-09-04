// src/App.js
import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import DashboardLayout from "./components/DashboardLayout";
import HomePage from "./pages/HomePage";
import DataPage from "./pages/DataPage";
import Dashboard from "./pages/DashboardPage";
import { LanguageProvider } from "./contexts/LanguageContext"; // เพิ่ม

function App() {
  return (
    <LanguageProvider>
      <Router>
        <DashboardLayout>
          <Routes>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/data" element={<DataPage />} />
          </Routes>
        </DashboardLayout>
      </Router>
    </LanguageProvider>
  );
}

export default App;
