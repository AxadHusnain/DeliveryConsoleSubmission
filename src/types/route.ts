export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface Stop {
  id: string;
  sequence: number;
  customerName: string;
  address: string;
  parcelCount: number;
  windowEnd: string; 
  templateId: string;
  dropZone: LatLng[]; 
}

export interface Route {
  routeId: string;
  stops: Stop[];
}
