const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const mqtt = require("mqtt");
const functions = require("firebase-functions");

const app = express();

// 🔐 โหลด Firebase service account key
const serviceAccount = require("../server/serviceAccountKey.json"); // เปลี่ยน path

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

app.get("/api/weather-range", async (req, res) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) {
      return res.status(400).json({ error: "Missing date range" });
    }

    const snapshot = await db
      .collection("weather_results")
      .where("date", ">=", start)
      .where("date", "<=", end)
      .orderBy("date", "asc")
      .get();

    const data = snapshot.docs.map((doc) => doc.data());
    res.json(data);
  } catch (err) {
    console.error("❌ Failed to fetch weather range:", err);
    res.status(500).json({ error: "Server error" });
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

// POST จาก Node-RED (ถ้ายังใช้ HTTP)
app.post("/api/weather-result", async (req, res) => {
  try {
    const data = req.body;
    console.log("📥 ข้อมูลจาก Node-RED:", data);
    await db.collection("weather_results").add({
      ...data,
      date: data.date || new Date().toISOString().split("T")[0],
      timestamp: admin.firestore.Timestamp.now(),
    });

    res.json({ message: "Saved from Node-RED" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error saving data" });
  }
});

// POST จาก frontend → Node-RED → HTTP
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

    // 1. บันทึก Firestore
    await db
      .collection("user_weather_inputs")
      .doc(docId)
      .set({
        ...weatherData,
        timestamp: admin.firestore.Timestamp.now(),
      });

    // 2. ส่งไปยัง Node-RED (ถ้ายังใช้ HTTP)
    try {
      const nodeRedResponse = await axios.post(
        "http://localhost:1880/weather-data",
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

// ✅ Serve React App (CRA Build)
const buildPath = path.join(__dirname, "../build");
if (fs.existsSync(buildPath)) {
  app.use(express.static(buildPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(buildPath, "index.html"));
  });
}

// 📡 MQTT Setup
const mqttClient = mqtt.connect("mqtt://broker.emqx.io:1883");

mqttClient.on("connect", () => {
  console.log("🔗 Connected to MQTT Broker");

  const topics = ["weather/data", "weather/processed"];
  mqttClient.subscribe(topics, (err) => {
    if (err) {
      console.error("❌ MQTT Subscribe error:", err);
    } else {
      console.log("📡 Subscribed to topics:", topics.join(", "));
    }
  });
});

mqttClient.on("message", async (topic, message) => {
  console.log("mqtt message:", message);
  try {
    const payload = message.toString();
    console.log("📨 MQTT message received");
    console.log(`🔸 Topic: ${topic}`);
    console.log(`🔸 Raw message: ${payload}`);

    const data = JSON.parse(payload);

    if (topic === "weather/data") {
      console.log("✅ ข้อมูลจาก Node-RED (weather/data):", data);
    }

    if (topic === "weather/processed") {
      await db.collection("weather_results").add({
        ...data,
        timestamp: admin.firestore.Timestamp.now(),
      });
      console.log("✅ ข้อมูล weather_results ถูกบันทึกแล้ว");
    }
  } catch (error) {
    console.error("❌ Error parsing MQTT message:", error.message);
  }
});

app.get("/api/weather-hourly", (req, res) => {
  // ตัวอย่าง mock data
  const { province, district, start, end } = req.query;
  // สร้างข้อมูลจำลอง 24 ชั่วโมง
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

exports.api = functions.https.onRequest(app);