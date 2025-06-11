// src/debug/validateWeatherData.js
import { calculateETo } from "../utils/calculateETo.js";
import promptSync from "prompt-sync";

const prompt = promptSync();

// รับค่าจากผู้ใช้
const temp = parseFloat(prompt("อุณหภูมิเฉลี่ย (°C): "));
const humidity = parseFloat(prompt("ความชื้นสัมพัทธ์ (%): "));
const vpdExpected = parseFloat(prompt("VPD ที่แสดง (kPa): "));

const tMax = parseFloat(prompt("อุณหภูมิสูงสุด (°C): "));
const tMin = parseFloat(prompt("อุณหภูมิต่ำสุด (°C): "));
const tMean = parseFloat(prompt("อุณหภูมิเฉลี่ย (°C): "));
const rhMax = parseFloat(prompt("ความชื้นสัมพัทธ์สูงสุด (%): "));
const rhMin = parseFloat(prompt("ความชื้นสัมพัทธ์ต่ำสุด (%): "));
const windSpeed = parseFloat(prompt("ความเร็วลมที่ 2 เมตร (m/s): "));
const solarRadiation = parseFloat(prompt("รังสีสุริยะสุทธิ (MJ/m²/day): "));
const altitude = parseFloat(prompt("ความสูงเหนือระดับน้ำทะเล (เมตร): "));

// === คำนวณ VPD ===
const svp = 0.6108 * Math.exp((17.27 * temp) / (temp + 237.3));
const avp = (humidity / 100) * svp;
const vpd = parseFloat((svp - avp).toFixed(3));

console.log("\n✅ VPD ที่คำนวณได้:", vpd, "kPa");
console.log("🧪 ตรงกับที่แสดงไหม:", vpd === vpdExpected);

// === คำนวณ ETo ===
const eto = calculateETo({
  tMax,
  tMin,
  tMean,
  rhMax,
  rhMin,
  windSpeed,
  solarRadiation,
  altitude,
});

console.log("\n✅ ETo ที่คำนวณได้:", eto.toFixed(3), "mm/day");
