import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Helper function to determine the API base URL (same as in auth-context)
const getApiBaseUrl = () => {
  // Check for cloud/production API URL first
  const cloudApiUrl = import.meta.env.VITE_API_URL;
  if (cloudApiUrl) {
    console.log('🌐 QueryClient using cloud API URL:', cloudApiUrl);
    return cloudApiUrl;
  }

  // Fall back to local development
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // For Android/mobile app, try to connect to local network IP
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      // Try to get the actual network IP from Android context if available
      if (typeof (window as any).Android !== 'undefined') {
        console.log('📱 QueryClient detected Android WebView, using network IP');
        // You might need to configure this based on your network setup
        const networkIp = '192.168.1.233'; // Replace with your computer's IP
        return `http://${networkIp}:5000`;
      }
      console.log('🏠 QueryClient using local development API URL');
      return 'https://tirva-admin.fly.dev/';
    } else {
      // Use the same hostname as the frontend but port 5000
      const localUrl = `http://${hostname}:5000`;
      console.log('🏠 QueryClient using local network API URL:', localUrl);
      return localUrl;
    }
  }
  
  // Default fallback
  console.log('🏠 QueryClient using default local API URL');
  return 'https://tirva-admin.fly.dev/';
};

// Helper to build full URL
const buildApiUrl = (endpoint: string) => {
  const baseUrl = getApiBaseUrl();
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${baseUrl}/${cleanEndpoint}`;
};

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Convert relative URLs to absolute URLs
  const fullUrl = url.startsWith('http') ? url : buildApiUrl(url);
  
  const res = await fetch(fullUrl, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Convert relative URLs to absolute URLs
    const endpoint = queryKey[0] as string;
    const fullUrl = endpoint.startsWith('http') ? endpoint : buildApiUrl(endpoint);
    
    const res = await fetch(fullUrl, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});



