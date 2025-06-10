import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";

export default function DashboardLayout({ children }) {
  return (
    <div>
      {/* Header */}
      <nav className="navbar navbar-dark bg-primary px-3">
        <a className="navbar-brand" href="#">
          Weather Dashboard
        </a>
      </nav>

      {/* Layout with Sidebar and Main Content */}
      <div className="container-fluid">
        <div className="row">
          {/* Sidebar */}
          <nav
            id="sidebarMenu"
            className="col-md-3 col-lg-2 d-md-block bg-light sidebar collapse"
            style={{ minHeight: "100vh" }}
          >
            <div className="position-sticky pt-3">
              <ul className="nav flex-column">
                <li className="nav-item">
                  <a className="nav-link active" href="#">
                    <span data-feather="home"></span>
                    Dashboard
                  </a>
                </li>
                <li className="nav-item">
                  <a className="nav-link" href="#">
                    <span data-feather="map"></span>
                    Weather Map
                  </a>
                </li>
                <li className="nav-item">
                  <a className="nav-link" href="#">
                    <span data-feather="file-text"></span>
                    Reports
                  </a>
                </li>
                {/* เพิ่มเมนูอื่นๆ ได้ที่นี่ */}
              </ul>
            </div>
          </nav>

          {/* Main Content Area */}
          <main className="col-md-9 ms-sm-auto col-lg-10 px-md-4 py-4">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
