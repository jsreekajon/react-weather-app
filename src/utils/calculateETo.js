export function calculateETo({ tMax, tMin, tMean, rhMax, rhMin, windSpeed, solarRadiation, altitude }) {
  const esTmax = 0.6108 * Math.exp((17.27 * tMax) / (tMax + 237.3));
  const esTmin = 0.6108 * Math.exp((17.27 * tMin) / (tMin + 237.3));
  const es = (esTmax + esTmin) / 2;

  const ea = (esTmin * (rhMax / 100) + esTmax * (rhMin / 100)) / 2;

  const delta =
    (4098 * (0.6108 * Math.exp((17.27 * tMean) / (tMean + 237.3)))) /
    ((tMean + 237.3) * (tMean + 237.3));

  const P = 101.3 * Math.pow((293 - 0.0065 * altitude) / 293, 5.26);

  const gamma = 0.000665 * P;

  const numerator =
    0.408 * delta * solarRadiation +
    gamma * (900 / (tMean + 273)) * windSpeed * (es - ea);
  const denominator = delta + gamma * (1 + 0.34 * windSpeed);

  const eto = numerator / denominator;

  return eto;
}
