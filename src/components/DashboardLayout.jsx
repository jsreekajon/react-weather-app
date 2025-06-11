import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";

export default function DashboardLayout({ children }) {
  return (
    <div>
      {/* Header */}
      <nav className="navbar navbar-dark bg-primary px-3">
        <a className="navbar-brand" href="dashboard">
          Weather forecast
        </a>
      </nav>

      {/* Main Content Area */}
      <main className="container py-4">
        {children}
      </main>
    </div>
  );
}
