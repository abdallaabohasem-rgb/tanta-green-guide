const radians = Math.PI / 180;
const stepMinutes = 5;

type HourRange = [number, number];

export function estimateSolarAccess(
  latitude: number,
  longitude: number,
  streetWidth: number,
  nearDistance: number,
  nearHeight: number,
  farHeight: number,
  streetBearing: number,
): { summer: HourRange; winter: HourRange } {
  const lat = latitude * radians;
  const bearing = streetBearing * radians;
  const sinLat = Math.sin(lat);
  const cosLat = Math.cos(lat);
  const sinBearing = Math.sin(bearing);
  const cosBearing = Math.cos(bearing);
  const farDistance = streetWidth - nearDistance;

  function reachesPoint(up: number, towardNear: number): boolean {
    // The ray must clear the roof when it first intersects a street facade.
    return towardNear >= 0
      ? up * nearDistance > nearHeight * towardNear
      : up * farDistance > farHeight * -towardNear;
  }

  function estimateDay(dayOfYear: number): HourRange {
    let sideA = 0;
    let sideB = 0;
    for (let minute = stepMinutes / 2; minute < 1440; minute += stepMinutes) {
      // NOAA fractional year, equation of time and solar declination.
      const gamma = 2 * Math.PI / 365 * (dayOfYear - 1 + (minute - 720) / 1440);
      const equationOfTime = 229.18 * (
        0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma)
        - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma)
      );
      const declination = 0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma)
        - 0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma)
        - 0.002697 * Math.cos(3 * gamma) + 0.00148 * Math.sin(3 * gamma);
      const hourAngle = ((minute + equationOfTime + 4 * longitude) / 4 - 180) * radians;
      const sinDeclination = Math.sin(declination);
      const cosDeclination = Math.cos(declination);
      const cosHourAngle = Math.cos(hourAngle);
      const up = sinLat * sinDeclination + cosLat * cosDeclination * cosHourAngle;
      if (up <= 0) continue;

      const east = -cosDeclination * Math.sin(hourAngle);
      const north = cosLat * sinDeclination - sinLat * cosDeclination * cosHourAngle;
      const across = east * cosBearing - north * sinBearing;
      if (reachesPoint(up, across)) sideA += stepMinutes;
      if (reachesPoint(up, -across)) sideB += stepMinutes;
    }
    return [Math.min(sideA, sideB) / 60, Math.max(sideA, sideB) / 60];
  }

  return { summer: estimateDay(172), winter: estimateDay(355) };
}
