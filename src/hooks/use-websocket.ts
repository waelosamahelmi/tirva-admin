import { useEffect, useRef, useState } from 'react';

interface UseWebSocketOptions {
  onMessage?: (data: any) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  reconnectInterval?: number;
}

// Helper function to get WebSocket URL (matches API base URL logic)
const getWebSocketUrl = () => {
  // Check for cloud/production WebSocket URL first
  const cloudWsUrl = import.meta.env.VITE_WS_URL;
  if (cloudWsUrl) {
    const wsUrl = cloudWsUrl + '/ws';
    console.log('🌐 WebSocket using cloud WS URL:', wsUrl);
    return wsUrl;
  }

  // Check for cloud/production API URL and convert to WebSocket
  const cloudApiUrl = import.meta.env.VITE_API_URL;
  if (cloudApiUrl) {
    // Convert HTTP(S) URL to WebSocket URL
    const wsUrl = cloudApiUrl.replace(/^http/, 'ws') + '/ws';
    console.log('🌐 WebSocket using converted cloud API URL:', wsUrl);
    return wsUrl;
  }

  // Fall back to local development
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // For Android/mobile app, try to connect to local network IP
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      // Try to get the actual network IP from Android context if available
      if (typeof (window as any).Android !== 'undefined') {
        console.log('📱 WebSocket detected Android WebView, using network IP');
        // You might need to configure this based on your network setup
        const networkIp = '192.168.1.233'; // Replace with your computer's IP
        const wsUrl = `${protocol}//${networkIp}:5000/ws`;
        console.log('📱 WebSocket using Android network URL:', wsUrl);
        return wsUrl;
      }
      const wsUrl = `${protocol}//localhost:5000/ws`;
      console.log('🏠 WebSocket using local development URL:', wsUrl);
      return wsUrl;
    } else {
      // Use the same hostname as the frontend but port 5000
      const wsUrl = `${protocol}//${hostname}:5000/ws`;
      console.log('🏠 WebSocket using local network URL:', wsUrl);
      return wsUrl;
    }
  }
  
  // Default fallback
  const wsUrl = `${protocol}//localhost:5000/ws`;
  console.log('🏠 WebSocket using default local URL:', wsUrl);
  return wsUrl;
};

export function useWebSocket(url: string, options: UseWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { onMessage, onConnect, onDisconnect, reconnectInterval = 3000 } = options;

  const connect = () => {
    try {
      const wsUrl = getWebSocketUrl();
      
      console.log('🔌 Connecting to WebSocket:', wsUrl);
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('✅ WebSocket connected successfully');
        setIsConnected(true);
        onConnect?.();
        
        // Send admin connection message
        const message = { type: 'admin_connect' };
        console.log('📤 Sending admin connect message:', message);
        ws.current?.send(JSON.stringify(message));
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 WebSocket message received:', data);
          setLastMessage(data);
          onMessage?.(data);
        } catch (error) {
          console.error('❌ Failed to parse WebSocket message:', error);
        }
      };

      ws.current.onclose = (event) => {
        console.log('🔌 WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        onDisconnect?.();
        
        // Attempt to reconnect
        console.log(`🔄 Attempting to reconnect in ${reconnectInterval}ms...`);
        reconnectTimeoutRef.current = setTimeout(connect, reconnectInterval);
      };

      ws.current.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
      };
    } catch (error) {
      console.error('❌ Failed to connect to WebSocket:', error);
      // Retry connection
      console.log(`🔄 Retrying connection in ${reconnectInterval}ms...`);
      reconnectTimeoutRef.current = setTimeout(connect, reconnectInterval);
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (ws.current) {
      ws.current.close();
    }
  };

  const sendMessage = (message: any) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  };

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [url]);

  return {
    isConnected,
    lastMessage,
    sendMessage,
    disconnect
  };
}


