import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";

export default function DashboardLayout({ children }) {
  return (
    <div>
      {/* Header */}
      <nav className="navbar navbar-dark bg-primary px-3">
        <a className="navbar-brand" href="/dashboard">
          Weather Forecast
        </a>
      </nav>

      {/* Layout with Sidebar + Main */}
      <div className="container-fluid">
        <div className="row">
          {/* Sidebar */}
          <nav className="col-md-2 bg-light sidebar py-4 d-block">
            <div className="sidebar-sticky">
              <ul className="nav flex-column">
                
                {/* Home */}
                <li className="nav-item">
                  <a className="nav-link" href="/home">
                    <img
                      src="/images/home-button.png"
                      alt="Home"
                      style={{ width: "20px", marginRight: "8px" }}
                    />
                    Home
                  </a>
                </li>

                {/* Dashboard */}
                <li className="nav-item">
                  <a className="nav-link active" href="/dashboard">
                    <img
                      src="/images/speedometer.png"
                      alt="Dashboard"
                      style={{ width: "20px", marginRight: "8px" }}
                    />
                    Dashboard
                  </a>
                </li>

                {/* Data */}
                <li className="nav-item">
                  <a className="nav-link" href="/data">
                    <img
                      src="/images/icons8-firebase-50.png"
                      alt="Data"
                      style={{ width: "20px", marginRight: "8px" }}
                    />
                    Data
                  </a>
                </li>
              </ul>
            </div>
          </nav>

          {/* Main Content Area */}
          <main className="col-md-10 ml-sm-auto px-4 py-4">{children}</main>
        </div>
      </div>
    </div>
  );
}
