// backend/weather-cron.js
require('dotenv').config();
const fetch = require('node-fetch');
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();
const provinces = require('./provinces.json');

// 1. ดึงค่ามาและแยกด้วยเครื่องหมายจุลภาค (,) ให้กลายเป็น Array
const rawKeys = process.env.WEATHER_API_KEYS || "";
const API_KEYS = rawKeys.split(',').map(k => k.trim()).filter(k => k);

if (API_KEYS.length === 0) {
  console.error("❌ Error: No WEATHER_API_KEYS found in .env");
  process.exit(1);
}

// ตัวแปรนับจำนวนเพื่อใช้ในการวนใช้ Key (Round Robin)
let requestCount = 0;

// ฟังก์ชันช่วยเลือก Key: จะวนไปเรื่อยๆ key1 -> key2 -> ... -> key1
function getNextApiKey() {
  const key = API_KEYS[requestCount % API_KEYS.length];
  requestCount++;
  return key;
}

async function fetchAndStoreWeatherAll() {
  const today = new Date().toISOString().slice(0, 10);

  for (const province in provinces) {
    for (const district of provinces[province]) {
      const location = `${district},${province},TH`;
      
      // 2. เรียกใช้ฟังก์ชัน getNextApiKey() เพื่อเอา Key มาใช้ทีละตัว
      const currentKey = getNextApiKey();
      
      const url = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${encodeURIComponent(location)}/${today}/${today}?unitGroup=metric&include=days%2Chours&key=${currentKey}&contentType=json`;

      try {
        const res = await fetch(url);
        
        // เพิ่มการเช็คกรณี Quota เต็ม (Error 429)
        if (res.status === 429) {
             console.error(`Key ${currentKey} quota exceeded!`);
             // ในระบบจริงอาจจะเขียน logic ให้ลอง key ถัดไปทันทีตรงนี้ได้
        }

        if (!res.ok) {
          console.error('API error', res.status, await res.text());
          continue;
        }
        const data = await res.json();
        const docId = `${today}_${province}_${district}`;
        await db.collection('weather_results').doc(docId).set({ data, province, district, date: today });        console.log(`Saved ${docId} (used key: ...${currentKey.slice(-4)})`); // log ดูว่าใช้ key ไหน
      } catch (e) {
        console.error('Fetch failed', province, district, e.message);
      }
    }
  }
}