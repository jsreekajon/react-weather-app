import React, { useState, useEffect, useRef } from "react";
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
  const [loading, setLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const auth = getAuth(app);

  const dropdownRef = useRef();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [auth]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
      setDropdownOpen(false);
      console.log("🚪 ออกจากระบบแล้ว");
    } catch (error) {
      console.error("❌ ออกจากระบบล้มเหลว:", error);
    }
  };

  if (loading) return <div className="text-center p-5">Loading...</div>;

  return (
    <div>
      {/* Header */}
      <nav className="navbar navbar-dark bg-primary px-3 d-flex justify-content-between align-items-center">
        <a className="navbar-brand" href="/dashboard">
          Weather Forecast
        </a>

        {user ? (
          <div className="position-relative" ref={dropdownRef}>
            <button
              className="btn btn-outline-light d-flex align-items-center"
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              <img
                src={user.photoURL || "/images/avatar.png"}
                alt="profile icon"
                className="rounded-circle border border-white"
                style={{ width: "32px", height: "32px", marginRight: "8px" }}
              />
              {user.displayName || "User"}
            </button>

            {dropdownOpen && (
              <ul
                className="dropdown-menu dropdown-menu-end show position-absolute mt-2"
                style={{ right: 0 }}
              >
                <li>
                  <span className="dropdown-item-text text-muted small">
                    {user.email}
                  </span>
                </li>
                <li>
                  <hr className="dropdown-divider" />
                </li>
                <li>
                  <button className="dropdown-item" onClick={handleLogout}>
                    Logout
                  </button>
                </li>
              </ul>
            )}
          </div>
        ) : (
          <button
            onClick={handleLogin}
            className="btn btn-outline-light d-flex align-items-center"
          >
            <img
              src="/images/avatar.png"
              alt="login icon"
              style={{ width: "24px", marginRight: "6px" }}
            />
            Login
          </button>
        )}
      </nav>

      {/* Layout */}
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

          {/* Main content */}
          <main className="col-md-10 ml-sm-auto px-4 py-4">{children}</main>
        </div>
      </div>
    </div>
  );
}
