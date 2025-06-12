export function calculateHourlyETo({
  temp,            // °C
  humidity,        // %
  windSpeed,       // m/s
  solarRadiation,  // MJ/m²/hr
  altitude = 100   // meters
}) {
  const P = 101.3 * ((293 - 0.0065 * altitude) / 293) ** 5.26;
  const gamma = 0.000665 * P;
  const es = 0.6108 * Math.exp((17.27 * temp) / (temp + 237.3));
  const ea = (humidity / 100) * es;
  const delta = (4098 * es) / ((temp + 237.3) ** 2);

  const numerator =
    0.408 * delta * solarRadiation +
    gamma * (37 / (temp + 273)) * windSpeed * (es - ea);

  const denominator = delta + gamma * (1 + 0.34 * windSpeed);

  return +(numerator / denominator).toFixed(3);
}
