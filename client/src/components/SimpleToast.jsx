import React, { useEffect } from "react";

export default function SimpleToast({ show, message, duration = 3000, onClose }) {
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => {
      onClose && onClose();
    }, duration);
    return () => clearTimeout(t);
  }, [show, duration, onClose]);

  if (!show) return null;

  const boxStyle = {
    position: "fixed",
    right: 20,
    bottom: 20,
    background: "rgba(0,0,0,0.85)",
    color: "#fff",
    padding: "12px 16px",
    borderRadius: 6,
    boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
    zIndex: 9999,
    maxWidth: 320,
  };

  return (
    <div role="status" aria-live="polite" style={boxStyle}>
      {message}
    </div>
  );
}
