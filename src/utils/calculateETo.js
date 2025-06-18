// calculateETo.js

/**
 * คำนวณ Reference Evapotranspiration (ETo) รายชั่วโมง
 * อิงสูตร FAO Penman-Monteith แบบรายชั่วโมง (FAO-56)
 * หน่วยผลลัพธ์: mm/hr
 * 
 * @param {Object} params - ข้อมูลสภาพอากาศ
 * @param {number} params.temp - °C
 * @param {number} params.humidity - %
 * @param {number} params.windSpeed - km/h
 * @param {number} params.solarRadiation - MJ/m²/hr
 * @param {number} params.altitude - m
 * @returns {number} ETo (mm/hr)
 */

export function calculateHourlyETo({ temp, humidity, windSpeed, solarRadiation, altitude }) {
  if (
    temp == null || humidity == null || windSpeed == null ||
    solarRadiation == null || altitude == null
  ) return NaN;

  // --- 1. ความดันอากาศ (P) ---
  const P = 101.3 * Math.pow((293 - 0.0065 * altitude) / 293, 5.26); // kPa

  // --- 2. ค่าคงที่ psychrometric constant (γ) ---
  const gamma = 0.000665 * P; // kPa/°C

  // --- 3. ความดันไออิ่มตัว (es) ---
  const es = 0.6108 * Math.exp((17.27 * temp) / (temp + 237.3)); // kPa

  // --- 4. ความดันไอจริง (ea) ---
  const ea = (humidity / 100) * es; // kPa

  // --- 5. ความชันของเส้นโค้งแรงดันไออิ่มตัว (Δ) ---
  const delta = (4098 * es) / Math.pow(temp + 237.3, 2); // kPa/°C

  // --- 6. ความเร็วลม (u2) หน่วย m/s ---
  const u2 = windSpeed / 3.6;

  // --- 7. ความร้อนจากดิน G ---
  const G = 0; // โดยปกติถือว่า G ≈ 0 สำหรับคำนวณรายชั่วโมง

  // --- 8. สูตร FAO Penman-Monteith ---
  const numerator = 0.408 * delta * (solarRadiation - G) +
    gamma * (37 / (temp + 273)) * u2 * (es - ea);
  const denominator = delta + gamma * (1 + 0.34 * u2);

  const eto = numerator / denominator;

  return eto;
}
