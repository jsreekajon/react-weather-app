export function calculateHourlyETo({
  temp,            // °C
  humidity,        // %
  windSpeed,       // m/s at 2 meters
  solarRadiation,  // Rn: Net radiation, MJ/m²/hr
  altitude = 100   // meters
}) {
  // 1. ความดันบรรยากาศ (P)
  const P = 101.3 * ((293 - 0.0065 * altitude) / 293) ** 5.26;

  // 2. ค่าคงที่จิตฟิสิกส์ (gamma)
  const gamma = 0.000665 * P;

  // 3. ความดันไออิ่มตัว (es)
  const es = 0.6108 * Math.exp((17.27 * temp) / (temp + 237.3));

  // 4. ความดันไอจริง (ea)
  const ea = (humidity / 100) * es;

  // 5. ความชันของเส้นโค้งไออิ่มตัว (delta)
  const delta = (4098 * es) / ((temp + 237.3) ** 2);

  // 6. ค่าความร้อนในดินโดยประมาณ (G)
  const G = 0.1 * solarRadiation;

  // 7. ตัวเศษ numerator ตามสูตรที่ปรับ: (Rn - G)
  const numerator =
    0.408 * delta * (solarRadiation - G) +
    gamma * (37 / (temp + 273)) * windSpeed * (es - ea);

  // 8. ตัวส่วน denominator
  const denominator = delta + gamma * (1 + 0.34 * windSpeed);

  // 9. คำนวณ ETo
  const ETo = numerator / denominator;

  return +ETo.toFixed(3); // ปัดเศษทศนิยม 3 ตำแหน่ง
}
