const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");
const mqtt = require("mqtt");

// โหลด serviceAccount จาก ENV
const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);

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

// Middleware ตรวจสอบ token
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

// Helper
function safeEmailId(email) {
  return email.replace(/[@.]/g, "_");
}

// Mock weather data route
app.get("/api/weather-hourly", (req, res) => {
  const { province, district, start } = req.query;
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

// เพิ่ม routes อื่นๆ ตามต้องการ เช่น /api/weather-result, /api/profile เป็นต้น...

// ให้บริการ React frontend (ถ้ามี build)
const buildPath = path.join(__dirname, "../client/build");
if (fs.existsSync(buildPath)) {
  app.use(express.static(buildPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(buildPath, "index.html"));
  });
}

// MQTT integration (optional)
const mqttClient = mqtt.connect("mqtt://broker.emqx.io:1883");
mqttClient.on("connect", () => {
  mqttClient.subscribe(["weather/data", "weather/processed"], (err) => {
    if (!err) console.log("✅ Subscribed to MQTT topics");
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
    console.error("❌ MQTT error:", e.message);
  }
});

module.exports = app;
