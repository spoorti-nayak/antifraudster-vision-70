import { useEffect, useCallback, useRef } from 'react';
import webSocketService from '@/services/websocket';

type WebSocketEventType = 
  | 'transaction_created'
  | 'fraud_detected'
  | 'alert_created'
  | 'connection_status'
  | 'error';

export const useWebSocket = () => {
  const isConnectedRef = useRef(false);

  useEffect(() => {
    // Connect on mount if not already connected
    if (!isConnectedRef.current) {
      try {
        webSocketService.connect();
        isConnectedRef.current = true;
      } catch (error) {
        console.warn('Failed to connect WebSocket in useWebSocket hook:', error);
      }
    }

    // Cleanup on unmount
    return () => {
      try {
        webSocketService.disconnect();
        isConnectedRef.current = false;
      } catch (error) {
        console.warn('Error disconnecting WebSocket:', error);
      }
    };
  }, []);

  const subscribe = useCallback((type: WebSocketEventType, callback: (data: any) => void) => {
    return webSocketService.subscribe(type, callback);
  }, []);

  const send = useCallback((type: string, data: any) => {
    webSocketService.send(type, data);
  }, []);

  const getConnectionStatus = useCallback(() => {
    return webSocketService.getConnectionStatus();
  }, []);

  return {
    subscribe,
    send,
    getConnectionStatus,
  };
};