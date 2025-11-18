const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");
const mqtt = require("mqtt");
const axios = require("axios"); // แนะนำให้ใช้ axios หรือ node-fetch เพื่อความชัวร์ใน node env

// --- 1. SETUP FIREBASE ---
let serviceAccount;
try {
  // ถ้ามี ENV ให้ใช้จาก ENV (สำหรับ Local/Production)
  if (process.env.FIREBASE_CREDENTIALS) {
    serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);
  }
} catch (e) {
  console.warn("FIREBASE_CREDENTIALS invalid/missing, using default credentials.");
}

// เริ่มต้น Firebase (ถ้าไม่มี serviceAccount จะใช้ Default ของ Server)
if (serviceAccount) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
} else {
  admin.initializeApp();
}

const db = admin.firestore();
const app = express();

// ตัวอย่างการใช้กับ CORS - ดึง Frontend URL จาก Environment Variable
const frontendUrl = process.env.FRONTEND_URL || "https://weather-31ba2.web.app";

app.use(cors({ origin: frontendUrl }));
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader("Content-Security-Policy", "default-src *; img-src * data: blob:;");
  next();
});

// --- 2. API KEY MANAGEMENT ---
// ดึง Key จาก Environment Variable ตามที่คุณเขียนมา
const rawKeys = process.env.WEATHER_API_KEYS || "";
// ถ้าไม่มี ENV ให้ใช้ค่า Default ว่างๆ หรือ Hardcode fallback ไว้เทสต์ (ไม่แนะนำสำหรับ prod)
const API_KEYS = rawKeys.split(",").map(key => key.trim()).filter(key => key !== "");

if (API_KEYS.length === 0) {
  console.warn("⚠️ Warning: No WEATHER_API_KEYS found in environment variables!");
}

let apiKeyIndex = 0;
function getApiKey() { return API_KEYS[apiKeyIndex]; }
function rotateApiKey() {
  if (API_KEYS.length === 0) return null;
  apiKeyIndex = (apiKeyIndex + 1) % API_KEYS.length;
  console.log(`Rotating API Key to index: ${apiKeyIndex}`);
  return getApiKey();
}

// --- 3. UTILS (การคำนวณค่าทางวิทยาศาสตร์) ---
// ต้องมีฟังก์ชันนี้ เพื่อแปลงข้อมูลดิบให้เป็นค่าที่ Frontend ต้องการ
function calculateHourlyETo({ temp, humidity, windSpeed, solarRadiation, altitude }) {
  if (
    temp == null || humidity == null || windSpeed == null ||
    solarRadiation == null || altitude == null
  ) return null;

  const P = 101.3 * Math.pow((293 - 0.0065 * altitude) / 293, 5.26);
  const gamma = 0.000665 * P;
  const es = 0.6108 * Math.exp((17.27 * temp) / (temp + 237.3));
  const ea = (humidity / 100) * es;
  const delta = (4098 * es) / Math.pow(temp + 237.3, 2);
  const u2 = windSpeed / 3.6;
  const G = 0;
  
  const numerator = 0.408 * delta * (solarRadiation - G) +
    gamma * (37 / (temp + 273)) * u2 * (es - ea);
  const denominator = delta + gamma * (1 + 0.34 * u2);

  return numerator / denominator;
}

// --- 4. MIDDLEWARE (ความปลอดภัย) ---
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).send('Unauthorized: No token provided');
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken; // เก็บข้อมูล User ไว้ใช้ต่อ
    next();
  } catch (error) {
    return res.status(403).send('Unauthorized: Invalid token');
  }
};

// --- 5. ROUTES ---

// ใช้ชื่อ route ให้ตรงกับ frontend: /api/weather-hourly
// ใส่ verifyToken เพื่อป้องกันคนอื่นแอบใช้
app.get("/api/weather-hourly", verifyToken, async (req, res) => {
  const { location, start, end } = req.query;

  if (!location || !start || !end) {
    return res.status(400).json({ error: "Missing required query parameters" });
  }

  if (API_KEYS.length === 0) {
    return res.status(500).json({ error: "Server configuration error: No API keys." });
  }

  let tries = 0;
  const maxTries = API_KEYS.length;

  while (tries < maxTries) {
    const apiKey = getApiKey();
    // ใช้ axios แทน fetch เพื่อความเสถียรใน Node.js environment เก่าๆ
    const url = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${encodeURIComponent(
      location
    )}/${start}/${end}?unitGroup=metric&include=days%2Chours&key=${apiKey}&contentType=json`;

    try {
      const response = await axios.get(url);
      const json = response.data;

      // *** จุดสำคัญ: แปลงข้อมูลและคำนวณ ETo ก่อนส่งกลับ ***
      const tableData = [];
      (json.days || []).forEach((day) => {
        (day.hours || []).forEach((row) => {
          const solarMJ =
            row.solarradiation !== undefined
              ? (row.solarradiation * 3600) / 1e6
              : null;
          
          const etoHourly =
            row.temp !== undefined &&
            row.humidity !== undefined &&
            solarMJ !== null
              ? calculateHourlyETo({
                  temp: row.temp,
                  humidity: row.humidity,
                  windSpeed: row.windspeed ?? 2,
                  solarRadiation: solarMJ,
                  altitude: 100, 
                })
              : null;

          const vpd =
            row.temp !== undefined && row.humidity !== undefined
              ? (
                  0.6108 *
                    Math.exp((17.27 * row.temp) / (row.temp + 237.3)) -
                  (row.humidity / 100) *
                    (0.6108 *
                      Math.exp((17.27 * row.temp) / (row.temp + 237.3)))
                ).toFixed(3)
              : "";

          tableData.push({
            date: day.datetime,
            time: row.datetime,
            temp: row.temp ?? 0,
            humidity: row.humidity ?? 0,
            solar: solarMJ !== null ? parseFloat(solarMJ.toFixed(2)) : 0,
            wind: row.windspeed ?? 0,
            vpd: vpd !== "" ? parseFloat(vpd) : null,
            eto: etoHourly !== null ? parseFloat(etoHourly.toFixed(3)) : null,
          });
        });
      });

      // ส่งข้อมูลที่แปรรูปแล้วกลับไป
      return res.json(tableData);

    } catch (err) {
      console.error(`Error with key index ${apiKeyIndex}:`, err.message);
      // ถ้า error เป็น 429 (Too Many Requests) ให้ลอง key ถัดไป
      if (err.response && err.response.status === 429) {
        rotateApiKey();
        tries++;
      } else {
        // Error อื่นๆ เช่น 400 Bad Request ให้หยุดเลย
        return res.status(500).json({ error: "Failed to fetch external weather data" });
      }
    }
  }

  return res.status(503).json({ error: "Service unavailable: All API keys exhausted" });
});

// Serve Frontend (Code เดิมของคุณโอเคแล้ว)
const buildPath = path.join(__dirname, "../client/build");
if (fs.existsSync(buildPath)) {
  app.use(express.static(buildPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(buildPath, "index.html"));
  });
}

// MQTT Integration (Code เดิมของคุณโอเคแล้ว)
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

if (process.env.NODE_ENV !== 'production') {
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', frontend: FRONTEND_URL });
  });
}