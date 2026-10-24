import { useCallback, useEffect, useState } from 'react';

// 브라우저 위치 (보고 제출 위치). 권한을 거부하면 위치 없이 제출되고 서버가 '위치 정보 없음'으로 표시한다.
// status: 'loading' | 'ok' | 'denied' | 'unavailable' | 'unsupported'
export function useGeolocation() {
  const [state, setState] = useState({ status: 'loading', coords: null });

  const request = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setState({ status: 'unsupported', coords: null });
      return;
    }
    setState((s) => ({ ...s, status: 'loading' }));
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setState({
          status: 'ok',
          coords: {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy),
          },
        }),
      (err) => setState({ status: err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable', coords: null }),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }, []);

  useEffect(() => {
    request();
  }, [request]);

  return { ...state, request };
}
