import React, { useState, useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useLanguage } from "../contexts/LanguageContext";

export default function GoogleLoginModal() {
  const { lang } = useLanguage();
  const [user, userLoading] = useAuthState(auth);

  const isGoogleUser = !!(
    user &&
    Array.isArray(user.providerData) &&
    user.providerData.some((p) => p?.providerId === "google.com")
  );

  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!userLoading) setShow(!isGoogleUser);
  }, [userLoading, isGoogleUser]);

  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setShow(false);
    } catch (err) {
      console.error("Google sign-in failed:", err);
      alert(lang === "th" ? "การเข้าสู่ระบบล้มเหลว" : "Google sign-in failed");
    }
  };

  if (!show) return null;

  const texts = {
    th: {
      title: "โปรดเข้าสู่ระบบด้วย Gmail",
      message: "โปรดเข้าสู่ระบบด้วยบัญชี Google (Gmail) เพื่อใช้งานหน้านี้",
      loginBtn: "เข้าสู่ระบบด้วย Google",
      homeBtn: "ไปหน้าหลัก",
    },
    en: {
      title: "Please sign in with Google",
      message: "Please sign in with a Google account to use this page",
      loginBtn: "Sign in with Google",
      homeBtn: "Go to Home",
    },
  };

  const t = texts[lang] || texts.th;

  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: 24,
          borderRadius: 8,
          maxWidth: 420,
          width: "90%",
          boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
        }}
      >
        <h3 style={{ marginTop: 0 }}>{t.title}</h3>
        <p>{t.message}</p>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button onClick={handleGoogleSignIn}>{t.loginBtn}</button>
          <button onClick={() => (window.location.href = "/home")}>{t.homeBtn}</button>
        </div>
      </div>
    </div>
  );
}
