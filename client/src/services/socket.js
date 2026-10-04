import { io } from 'socket.io-client';

let socket = null;

export function getSocket() {
  if (!socket) {
    // In dev or if custom backend URL provided, connect to backend; otherwise fallback to origin
    const isDev = window.location.port && window.location.port !== '5000';
    const socketUrl = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace(/\/$/, '')
      : (isDev ? `${window.location.protocol}//${window.location.hostname}:5000` : window.location.origin);

    socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('⚡ [Socket.IO Client] Connected to PawAlert Real-Time Server:', socket.id);
    });

    socket.on('disconnect', () => {
      console.log('🔌 [Socket.IO Client] Disconnected from server');
    });
  }

  return socket;
}

export function subscribeToLiveEvents(callbacks = {}) {
  const s = getSocket();

  if (callbacks.onNewReport) {
    s.on('NEW_REPORT_SUBMITTED', callbacks.onNewReport);
  }
  if (callbacks.onRescueUpdate) {
    s.on('RESCUE_STATUS_CHANGED', callbacks.onRescueUpdate);
  }
  if (callbacks.onAuthorityAction) {
    s.on('AUTHORITY_ACTION_UPDATED', callbacks.onAuthorityAction);
    s.on('AUTHORITY_ACTION_LOGGED', callbacks.onAuthorityAction);
  }
  if (callbacks.onHotspotUpdate) {
    s.on('HOTSPOT_RECALCULATED', callbacks.onHotspotUpdate);
  }

  return () => {
    if (callbacks.onNewReport) s.off('NEW_REPORT_SUBMITTED', callbacks.onNewReport);
    if (callbacks.onRescueUpdate) s.off('RESCUE_STATUS_CHANGED', callbacks.onRescueUpdate);
    if (callbacks.onAuthorityAction) {
      s.off('AUTHORITY_ACTION_UPDATED', callbacks.onAuthorityAction);
      s.off('AUTHORITY_ACTION_LOGGED', callbacks.onAuthorityAction);
    }
    if (callbacks.onHotspotUpdate) s.off('HOTSPOT_RECALCULATED', callbacks.onHotspotUpdate);
  };
}
