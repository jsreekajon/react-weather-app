export function calculateHourlyETo({ 
  temp, 
  humidity, 
  windSpeed, 
  solarRadiation, 
  altitude = 100 
}) {
  // Constants
  const G = 0; // Soil heat flux = 0 for hourly
  const gamma = 0.066; // psychrometric constant in kPa/°C

  const es = 0.6108 * Math.exp((17.27 * temp) / (temp + 237.3));
  const ea = (humidity / 100) * es;
  const delta = (4098 * es) / Math.pow(temp + 237.3, 2);

  // Rn is net radiation, approximated from Rs
  const Rn = solarRadiation; // already in MJ/m²/hr

  const numerator =
    0.408 * delta * (Rn - G) +
    gamma * (900 / (temp + 273)) * windSpeed * (es - ea);
  const denominator = delta + gamma * (1 + 0.34 * windSpeed);

  const eto = numerator / denominator;

  return parseFloat(eto.toFixed(3));
}
