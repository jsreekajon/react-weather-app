// functions/app.js
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");
const mqtt = require("mqtt");
const axios = require("axios"); 

// --- 1. SETUP FIREBASE ---
let serviceAccount;
try {
  if (process.env.FIREBASE_CREDENTIALS) {
    serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);
  }
} catch (e) {
  console.warn("FIREBASE_CREDENTIALS invalid/missing, using default credentials.");
}

if (serviceAccount) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
} else {
  admin.initializeApp();
}

const db = admin.firestore();
const app = express();

const frontendUrl = process.env.FRONTEND_URL || "https://weather-31ba2.web.app";

app.use(cors({ origin: frontendUrl }));
app.use(express.json());

app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://apis.google.com https://www.gstatic.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://weather.visualcrossing.com https://*.googleusercontent.com",
      "connect-src 'self' https://weather.visualcrossing.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com https://*.firebaseio.com wss://broker.emqx.io wss://*.hivemq.cloud", // เพิ่ม domain MQTT ที่ปลอดภัย (ตัวอย่าง)
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'none'"
    ].join("; ")
  );
  next();
});

// --- 2. API KEY MANAGEMENT ---
const rawKeys = process.env.WEATHER_API_KEYS || "";
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
    req.user = decodedToken;
    next();
  } catch (error) {
    return res.status(403).send('Unauthorized: Invalid token');
  }
};

// --- 5. ROUTES ---

app.get("/api/weather-hourly", verifyToken, async (req, res) => {
  // [ปรับปรุง] รับค่า altitude จาก query parameter
  const { location, start, end, altitude } = req.query;

  if (!location || !start || !end) {
    return res.status(400).json({ error: "Missing required query parameters" });
  }

  // กำหนดค่า Default altitude เป็น 100 ถ้า Client ไม่ส่งมา
  const altValue = altitude ? parseFloat(altitude) : 100;

  if (API_KEYS.length === 0) {
    return res.status(500).json({ error: "Server configuration error: No API keys." });
  }

  let tries = 0;
  const maxTries = API_KEYS.length;

  while (tries < maxTries) {
    const apiKey = getApiKey();
    const url = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${encodeURIComponent(
      location
    )}/${start}/${end}?unitGroup=metric&include=days%2Chours&key=${apiKey}&contentType=json`;

    try {
      const response = await axios.get(url);
      const json = response.data;

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
                  altitude: altValue, // [ปรับปรุง] ใช้ค่า Dynamic Altitude
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

      return res.json(tableData);

    } catch (err) {
      console.error(`Error with key index ${apiKeyIndex}:`, err.message);
      if (err.response && err.response.status === 429) {
        rotateApiKey();
        tries++;
      } else {
        return res.status(500).json({ error: "Failed to fetch external weather data" });
      }
    }
  }

  return res.status(503).json({ error: "Service unavailable: All API keys exhausted" });
});

const buildPath = path.join(__dirname, "../client/build");
if (fs.existsSync(buildPath)) {
  app.use(express.static(buildPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(buildPath, "index.html"));
  });
}

// --- [ด่วน] MQTT Integration (Secure) ---
// ดึงค่า Config จาก Environment Variable
const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL || "mqtts://broker.emqx.io:8883"; // ควรเปลี่ยน URL เป็น Private
const MQTT_OPTIONS = {
  username: process.env.MQTT_USERNAME, // รับ Username
  password: process.env.MQTT_PASSWORD, // รับ Password
  rejectUnauthorized: false // กรณีใช้ Self-signed cert (ถ้าใช้ Cloud Provider ปรับเป็น true หรือลบออก)
};

const mqttClient = mqtt.connect(MQTT_BROKER_URL, MQTT_OPTIONS);

mqttClient.on("connect", () => {
  console.log("✅ Connected to MQTT Broker");
  // Subscribe topic ที่ซับซ้อนขึ้น หรือใช้ค่าจาก ENV
  const topicData = process.env.MQTT_TOPIC_DATA || "weather/data";
  const topicProcessed = process.env.MQTT_TOPIC_PROCESSED || "weather/processed";
  
  mqttClient.subscribe([topicData, topicProcessed], (err) => {
    if (!err) console.log(`✅ Subscribed to ${topicData}, ${topicProcessed}`);
  });
});

mqttClient.on("error", (err) => {
  console.error("❌ MQTT Connection Error:", err.message);
});

mqttClient.on("message", async (topic, message) => {
  try {
    const payload = JSON.parse(message.toString());
    // ตรวจสอบ topic จาก env ด้วย
    if (topic === (process.env.MQTT_TOPIC_PROCESSED || "weather/processed")) {
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