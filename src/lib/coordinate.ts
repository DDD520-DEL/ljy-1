export interface DMS {
  degrees: number;
  minutes: number;
  seconds: number;
  direction: "N" | "S" | "E" | "W";
}

export interface CoordinateDMS {
  lat: DMS;
  lng: DMS;
}

export interface CoordinateDecimal {
  lat: number;
  lng: number;
}

export interface ConversionRecord {
  id: string;
  timestamp: number;
  fromFormat: "decimal" | "dms";
  input: {
    lat: string;
    lng: string;
  };
  output: {
    lat: string;
    lng: string;
  };
}

export function decimalToDMS(decimal: number, isLat: boolean): DMS {
  const abs = Math.abs(decimal);
  let degrees = Math.floor(abs);
  const minutesFloat = (abs - degrees) * 60;
  let minutes = Math.floor(minutesFloat);
  let seconds = Math.round((minutesFloat - minutes) * 60 * 10000) / 10000;

  if (seconds >= 60) {
    seconds -= 60;
    minutes += 1;
  }
  if (minutes >= 60) {
    minutes -= 60;
    degrees += 1;
  }

  let direction: DMS["direction"];
  if (isLat) {
    direction = decimal >= 0 ? "N" : "S";
  } else {
    direction = decimal >= 0 ? "E" : "W";
  }

  return { degrees, minutes, seconds, direction };
}

export function dmsToDecimal(dms: DMS): number {
  let decimal = dms.degrees + dms.minutes / 60 + dms.seconds / 3600;
  if (dms.direction === "S" || dms.direction === "W") {
    decimal = -decimal;
  }
  return decimal;
}

export function formatDMS(dms: DMS): string {
  return `${dms.degrees}°${dms.minutes}'${dms.seconds.toFixed(4)}"${dms.direction}`;
}

export function formatDecimal(value: number, digits: number = 8): string {
  return value.toFixed(digits);
}

export function coordinateDecimalToDMS(coord: CoordinateDecimal): CoordinateDMS {
  return {
    lat: decimalToDMS(coord.lat, true),
    lng: decimalToDMS(coord.lng, false),
  };
}

export function coordinateDMSToDecimal(coord: CoordinateDMS): CoordinateDecimal {
  return {
    lat: dmsToDecimal(coord.lat),
    lng: dmsToDecimal(coord.lng),
  };
}

export function isValidLatitude(lat: number): boolean {
  return lat >= -90 && lat <= 90;
}

export function isValidLongitude(lng: number): boolean {
  return lng >= -180 && lng <= 180;
}

export function parseDMSString(str: string, isLat: boolean): DMS | null {
  const cleaned = str.trim().toUpperCase();

  const regex = /^(\d+(?:\.\d+)?)[°\s]\s*(\d+(?:\.\d+)?)?['′\s]?\s*(\d+(?:\.\d+)?)?["″\s]?\s*([NSEW])?$/;
  const match = cleaned.match(regex);

  if (!match) {
    return null;
  }

  const degrees = parseFloat(match[1]);
  const minutes = match[2] ? parseFloat(match[2]) : 0;
  const seconds = match[3] ? parseFloat(match[3]) : 0;

  let direction: DMS["direction"];
  if (match[4]) {
    direction = match[4] as DMS["direction"];
  } else if (isLat) {
    direction = "N";
  } else {
    direction = "E";
  }

  if (isLat && (direction !== "N" && direction !== "S")) {
    return null;
  }
  if (!isLat && (direction !== "E" && direction !== "W")) {
    return null;
  }

  if (minutes < 0 || minutes >= 60 || seconds < 0 || seconds >= 60) {
    return null;
  }

  if (isLat && degrees > 90) return null;
  if (!isLat && degrees > 180) return null;

  return { degrees, minutes, seconds, direction };
}
