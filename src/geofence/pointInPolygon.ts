import { LatLng } from '../types/route';

export function isPointInPolygon(point: LatLng, polygon: LatLng[]): boolean {
  if (polygon.length < 3) {
    return false; // fewer than 3 corners can't form a real shape
  }

  const x = point.longitude; // east position
  const y = point.latitude; // north position
  let inside = false;

  // i = "this corner", j = "the previous corner" — together they describe one edge.
  // Starting j at the last corner means the final edge wraps back to the start, closing the shape.
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].longitude;
    const yi = polygon[i].latitude;
    const xj = polygon[j].longitude;
    const yj = polygon[j].latitude;

    const spansOurNorthPosition = yi > y !== yj > y;
    const crossingIsToOurRight = x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    const crossesThisEdge = spansOurNorthPosition && crossingIsToOurRight;

    if (crossesThisEdge) {
      inside = !inside; // flip the switch, same as walking through one door
    }
  }

  return inside;
}

// Standard haversine formula — real-world distance in metres between two
// GPS points, accounting for the Earth being a sphere rather than a flat grid.
export function distanceMeters(a: LatLng, b: LatLng): number {
  const earthRadiusMeters = 6371000;
  const toRadians = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * earthRadiusMeters * Math.asin(Math.min(1, Math.sqrt(h)));
}
