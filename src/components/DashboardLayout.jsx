import React, { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { app } from "../firebase";

export default function DashboardLayout({ children }) {
  const [user, setUser] = useState(null);
  const auth = getAuth(app);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, [auth]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      setUser(result.user);
      console.log("✅ ลงทะเบียนสำเร็จ:", result.user);
    } catch (error) {
      console.error("❌ ลงทะเบียนล้มเหลว:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      console.log("🚪 ออกจากระบบแล้ว");
    } catch (error) {
      console.error("❌ ออกจากระบบล้มเหลว:", error);
    }
  };

  return (
    <div>
      {/* Header */}
      <nav className="navbar navbar-dark bg-primary px-3 d-flex justify-content-between align-items-center">
        <a className="navbar-brand" href="/dashboard">
          Weather Forecast
        </a>

        {/* Login/Profile Icon Button */}
        {user ? (
          <div className="dropdown">
            <button
              className="btn btn-outline-light dropdown-toggle d-flex align-items-center"
              id="userDropdown"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              <img
                src={user.photoURL || "/images/avatar.png"}
                alt="profile"
                className="rounded-circle"
                style={{ width: "28px", height: "28px", marginRight: "8px" }}
              />
              {user.displayName || "User"}
            </button>
            <ul className="dropdown-menu dropdown-menu-end" aria-labelledby="userDropdown">
              <li>
                <button className="dropdown-item" onClick={handleLogout}>
                  Logout
                </button>
              </li>
            </ul>
          </div>
        ) : (
          <button
            onClick={handleLogin}
            className="btn btn-outline-light d-flex align-items-center"
          >
            <img
              src="/images/avatar.png"
              alt="login"
              style={{ width: "20px", marginRight: "6px" }}
            />
            Login
          </button>
        )}
      </nav>

      {/* Layout with Sidebar + Main */}
      <div className="container-fluid">
        <div className="row">
          {/* Sidebar */}
          <nav className="col-md-2 bg-light sidebar py-4 d-block">
            <div className="sidebar-sticky">
              <ul className="nav flex-column">
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
