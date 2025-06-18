const functions = require("firebase-functions");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

exports.aggregateHourlyWeather = functions.pubsub
  .schedule("every 60 minutes")
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();
    const oneHourAgo = admin.firestore.Timestamp.fromMillis(now.toMillis() - 60 * 60 * 1000);

    const snapshot = await admin.firestore().collection('raw_weather')
      .where('timestamp', '>=', oneHourAgo)
      .get();

    if (snapshot.empty) {
      console.log("No raw data found for past 1 hour");
      return null;
    }

    const records = snapshot.docs.map(doc => doc.data());

    const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;

    const result = {
      timestamp: now.toDate(),
      province: records[0].province,
      district: records[0].district,
      avgETo: avg(records.map(r => r.totalDailyETo)),
      avgETc: avg(records.map(r => r.etc)),
      avgRainfall: avg(records.map(r => r.rainfall)),
      avgWaterNetPerTree: avg(records.map(r => r.waterNetPerTree)),
      avgVPD: avg(records.map(r => r.vpd)),
    };

    await admin.firestore().collection('weather_hourly_avg').add(result);
    console.log("✅ บันทึกค่าเฉลี่ยรายชั่วโมงสำเร็จ");

    // ลบ raw data เก่า
    const batch = admin.firestore().batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    return null;
});
