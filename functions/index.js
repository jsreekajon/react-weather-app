const functions = require("firebase-functions");
const { setGlobalOptions } = require("firebase-functions");
const app = require("./app");

// ตั้งค่า maxInstances เพื่อควบคุมค่าใช้จ่าย
setGlobalOptions({ maxInstances: 10 });

// Export Firebase function ให้ตรงกับ firebase.json
exports.api = functions.https.onRequest(app);
