const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const mqtt = require("mqtt");

const app = express();
const port = 3001;

// 🔐 โหลด Firebase service account key
const serviceAccount = require("./serviceAccountKey.json");

// 🔐 เริ่ม Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// 🔧 แปลง email ให้ปลอดภัยเป็นชื่อ doc
function safeEmailId(email) {
  return email.replace(/[@.]/g, "_");
}

// 🌐 Middleware
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src *; img-src * data: blob:;"
  );
  next();
});

// 🔐 Auth Middleware
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
    console.log("🔐 decodedToken:", decodedToken);
    next();
  } catch (error) {
    console.error("Token verification error:", error);
    return res.status(403).json({ error: "Invalid token" });
  }
}

// ✅ API Routes
app.get("/api/profile", verifyToken, async (req, res) => {
  console.log("🔐 User profile request:", req.user);
  res.json({ uid: req.user.uid, email: req.user.email });
  
});

app.get("/api/profile/data", verifyToken, async (req, res) => {
  try {
    const uid = req.user.uid;
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists)
      return res.status(404).json({ message: "User not found" });
    res.json(userDoc.data());
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal error" });
  }
});

app.post("/api/profile", verifyToken, async (req, res) => {
  try {
    const uid = req.user.uid;
    await db.collection("users").doc(uid).set(req.body, { merge: true });
    res.json({ message: "Saved", data: req.body });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to save" });
  }
});

app.post("/api/weather-result", async (req, res) => {
  try {
    const data = req.body;
    console.log("📥 ข้อมูลจาก Node-RED:", data);
    await db.collection("weather_results").add({
      ...data,
      timestamp: admin.firestore.Timestamp.now(),
    });
    res.json({ message: "Saved from Node-RED" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error saving data" });
  }
});

app.post("/api/weather-input", verifyToken, async (req, res) => {
  try {
    const { temp, humidity, solar, wind, province, district, date } = req.body;
    const email = req.user.email;

    console.log("📥 req.body:", req.body);
    console.log("👤 req.user:", req.user);

    if (
      typeof temp !== "number" ||
      typeof humidity !== "number" ||
      typeof solar !== "number" ||
      typeof wind !== "number" ||
      !province ||
      !district ||
      !date
    ) {
      return res.status(400).json({ error: "Missing or invalid fields" });
    }

    const docId = `${safeEmailId(email)}_${Date.now()}`;

    const weatherData = {
      userEmail: email,
      temp: parseFloat(temp),
      humidity: parseFloat(humidity),
      solar: parseFloat(solar),
      wind: parseFloat(wind),
      province,
      district,
      date,
      timestamp: new Date().toISOString(),
    };

    // 1. บันทึกใน Firestore
    await db.collection("user_weather_inputs").doc(docId).set({
      ...weatherData,
      timestamp: admin.firestore.Timestamp.now(), // สำหรับ Firestore
    });

    // 2. ส่งข้อมูลไปยัง Node-RED ผ่าน HTTP
    try {
      const nodeRedResponse = await axios.post(
        "http://localhost:1880/weather-data", // URL Node-RED
        weatherData
      );
      console.log("📤 ส่งไปยัง Node-RED สำเร็จ:", nodeRedResponse.status);
    } catch (error) {
      console.error("⚠️ ไม่สามารถส่งไปยัง Node-RED:", error.message);
    }

    res.json({ message: "ข้อมูลใหม่ถูกบันทึกเรียบร้อยแล้ว" });
  } catch (error) {
    console.error("❌ Error saving weather input:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
  }
});

// ✅ Serve React (CRA build)
const buildPath = path.join(__dirname, "../build");
if (fs.existsSync(buildPath)) {
  app.use(express.static(buildPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(buildPath, "index.html"));
  });
}

// 📡 MQTT Setup
const mqttClient = mqtt.connect("mqtt://localhost:1883");

mqttClient.on("connect", () => {
  console.log("🔗 Connected to MQTT Broker");

  mqttClient.subscribe("weather/processed", (err) => {
    if (err) {
      console.error("❌ MQTT Subscribe error:", err);
    } else {
      console.log("📡 Subscribed to topic: weather/processed");
    }
  });
});

mqttClient.on("message", async (topic, message) => {
  console.log(`📨 [MQTT] Topic: ${topic} | Message: ${message.toString()}`);
  try {
    const data = JSON.parse(message.toString());

    await db.collection("weather_results").add({
      ...data,
      timestamp: admin.firestore.Timestamp.now(),
    });

    console.log("✅ ข้อมูลที่ส่งกลับจาก Node-RED ถูกบันทึกแล้ว");
  } catch (error) {
    console.error("❌ Error handling MQTT message:", error.message);
  }
});

// 🚀 Start server
app.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`);
});
