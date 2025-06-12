export function calculateHourlyETo({
  temp,            // °C
  humidity,        // %
  windSpeed,       // m/s at 2m
  solarRadiation,  // MJ/m²/hr
  altitude = 100   // meters
}) {
  const G = 0; // Soil heat flux density [MJ/m²/hr]

  // Calculate atmospheric pressure from altitude
  const P = 101.3 * Math.pow((293 - 0.0065 * altitude) / 293, 5.26); // kPa

  const gamma = 0.000665 * P; // psychrometric constant [kPa/°C]

  const es = 0.6108 * Math.exp((17.27 * temp) / (temp + 237.3)); // saturation vapor pressure [kPa]
  const ea = (humidity / 100) * es; // actual vapor pressure [kPa]
  const delta = (4098 * es) / Math.pow(temp + 237.3, 2); // slope of vapor pressure curve [kPa/°C]

  const Rn = solarRadiation; // net radiation [MJ/m²/hr]

  const numerator =
    0.408 * delta * (Rn - G) +
    gamma * (37 / (temp + 273)) * windSpeed * (es - ea);

  const denominator = delta + gamma * (1 + 0.34 * windSpeed);

  const eto = numerator / denominator;

  return parseFloat(eto.toFixed(3)); // ETo [mm/hr]
}
