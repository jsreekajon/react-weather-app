// backend/weather-cron.js
// Node.js/Express/Firebase Functions: ดึงข้อมูล Visual Crossing ทุกจังหวัด/อำเภอ/วัน แล้วเก็บลง Firestore

const fetch = require('node-fetch');
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

// ตัวอย่าง: provinces = { "กรุงเทพมหานคร": ["เขตพระนคร", ...], ... }
const provinces = require('./provinces.json'); // หรือ import provinces object

async function fetchAndStoreWeatherAll() {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  for (const province in provinces) {
    for (const district of provinces[province]) {
      const location = `${district},${province},TH`;
      const url = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${encodeURIComponent(location)}/${today}/${today}?unitGroup=metric&include=days%2Chours&key=YOUR_API_KEY&contentType=json`;
      try {
        const res = await fetch(url);
        if (!res.ok) {
          console.error('API error', res.status, await res.text());
          continue;
        }
        const data = await res.json();
        // docId ตัวอย่าง: '2025-09-25_กรุงเทพมหานคร_เขตพระนคร'
        const docId = `${today}_${province}_${district}`;
        await db.collection('weather').doc(docId).set({ data, province, district, date: today });
        console.log('Saved', docId);
      } catch (e) {
        console.error('Fetch failed', province, district, e.message);
      }
    }
  }
}

// เรียกใช้ฟังก์ชันนี้ใน cron job หรือ schedule
// fetchAndStoreWeatherAll();

// ตัวอย่าง endpoint API (Express): รับ province, district, date แล้วคืนข้อมูลจาก Firestore
// GET /api/weather?province=...&district=...&date=...
//
// app.get('/api/weather', async (req, res) => {
//   const { province, district, date } = req.query;
//   const docId = `${date}_${province}_${district}`;
//   const doc = await db.collection('weather').doc(docId).get();
//   if (!doc.exists) return res.status(404).json({ error: 'No data' });
//   res.json(doc.data());
// });
