const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const mqtt = require("mqtt");

// โหลด serviceAccountKey.json (แก้ path ตามจริง)
const serviceAccount = require("../server/serviceAccountKey.json");

// เริ่ม Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src *; img-src * data: blob:;"
  );
  next();
});

// Auth Middleware
async function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const idToken = authHeader.startsWith("Bearer ")
      ? authHeader.split("Bearer ")[1]
      : null;

    if (!idToken)
      return res.status(401).json({ error: "Unauthorized - no token" });

    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    return res.status(403).json({ error: "Invalid token" });
  }
}

// ฟังก์ชันแปลง email เป็น doc id
function safeEmailId(email) {
  return email.replace(/[@.]/g, "_");
}

// Routes ตัวอย่าง (รวมทั้ง api/weather-hourly ที่มี mock data)
app.get("/api/weather-hourly", (req, res) => {
  const { province, district, start, end } = req.query;
  const data = [];
  for (let h = 0; h < 24; h++) {
    data.push({
      date: start,
      hour: h,
      temp: 25 + Math.random() * 5,
      humidity: 60 + Math.random() * 20,
      solar: 100 + Math.random() * 100,
      wind: 2 + Math.random(),
      vpd: Math.random().toFixed(2),
    });
  }
  res.json(data);
});

// (เพิ่ม route อื่น ๆ จากโค้ดที่คุณให้มา เช่น /api/profile, /api/weather-range, /api/weather-result, /api/weather-input ...)

// Serve React build (ถ้ามี)
const buildPath = path.join(__dirname, "../build");
if (fs.existsSync(buildPath)) {
  app.use(express.static(buildPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(buildPath, "index.html"));
  });
}

// MQTT Setup (ถ้าจะใช้)
const mqttClient = mqtt.connect("mqtt://broker.emqx.io:1883");
mqttClient.on("connect", () => {
  const topics = ["weather/data", "weather/processed"];
  mqttClient.subscribe(topics, (err) => {
    if (!err) console.log("Subscribed to MQTT topics");
  });
});
mqttClient.on("message", async (topic, message) => {
  try {
    const payload = JSON.parse(message.toString());
    if (topic === "weather/processed") {
      await db.collection("weather_results").add({
        ...payload,
        timestamp: admin.firestore.Timestamp.now(),
      });
    }
  } catch (e) {
    console.error("MQTT message parse error:", e.message);
  }
});

module.exports = app;
