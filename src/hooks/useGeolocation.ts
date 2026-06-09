import { useState, useEffect, useCallback, useRef } from "react";
import type { TrackPoint, SurveyLocation } from "@/types";

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  maximumAge?: number;
  timeout?: number;
  minDistance?: number;
}

interface UseGeolocationReturn {
  currentPosition: TrackPoint | null;
  isTracking: boolean;
  error: string | null;
  startTracking: () => void;
  stopTracking: () => void;
  getCurrentLocation: () => Promise<SurveyLocation | null>;
  watchId: number | null;
}

export function useGeolocation(
  options: UseGeolocationOptions = {}
): UseGeolocationReturn {
  const {
    enableHighAccuracy = true,
    maximumAge = 0,
    timeout = 10000,
    minDistance = 1,
  } = options;

  const [currentPosition, setCurrentPosition] = useState<TrackPoint | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastPositionRef = useRef<TrackPoint | null>(null);

  const getDistance = (p1: TrackPoint, p2: TrackPoint): number => {
    const R = 6371000;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(p2.lat - p1.lat);
    const dLng = toRad(p2.lng - p1.lng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(p1.lat)) *
        Math.cos(toRad(p2.lat)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handlePosition = useCallback(
    (pos: GeolocationPosition) => {
      const trackPoint: TrackPoint = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        timestamp: pos.timestamp,
        accuracy: pos.coords.accuracy,
        altitude: pos.coords.altitude,
      };

      if (lastPositionRef.current) {
        const distance = getDistance(lastPositionRef.current, trackPoint);
        if (distance < minDistance) {
          return;
        }
      }

      lastPositionRef.current = trackPoint;
      setCurrentPosition(trackPoint);
      setError(null);
    },
    [minDistance]
  );

  const handleError = useCallback((err: GeolocationPositionError) => {
    const messages: Record<number, string> = {
      1: "用户拒绝了定位请求",
      2: "位置信息不可用",
      3: "定位请求超时",
    };
    setError(messages[err.code] || "定位失败");
  }, []);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError("浏览器不支持定位功能");
      return;
    }

    if (watchIdRef.current !== null) {
      return;
    }

    setIsTracking(true);
    setError(null);

    const id = navigator.geolocation.watchPosition(
      handlePosition,
      handleError,
      {
        enableHighAccuracy,
        maximumAge,
        timeout,
      }
    );
    watchIdRef.current = id;
  }, [enableHighAccuracy, maximumAge, timeout, handlePosition, handleError]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
    lastPositionRef.current = null;
  }, []);

  const getCurrentLocation = useCallback((): Promise<SurveyLocation | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setError("浏览器不支持定位功能");
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const location: SurveyLocation = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          setCurrentPosition({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            timestamp: pos.timestamp,
            accuracy: pos.coords.accuracy,
            altitude: pos.coords.altitude,
          });
          setError(null);
          resolve(location);
        },
        (err) => {
          handleError(err);
          resolve(null);
        },
        {
          enableHighAccuracy,
          timeout,
          maximumAge,
        }
      );
    });
  }, [enableHighAccuracy, maximumAge, timeout, handleError]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return {
    currentPosition,
    isTracking,
    error,
    startTracking,
    stopTracking,
    getCurrentLocation,
    watchId: watchIdRef.current,
  };
}
