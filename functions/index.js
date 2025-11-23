const functions = require("firebase-functions");
const app = require("./app");
const helmet = require("helmet");

// เพิ่มความปลอดภัย Header
app.use(helmet());

// หมายเหตุ: ไม่ต้องกำหนด PORT หรือสั่ง app.listen() เอง
// เพราะ Firebase Functions จะจัดการ environment ให้โดยอัตโนมัติ

// ส่งออก Express app ผ่าน https.onRequest
exports.api = functions.https.onRequest(app);