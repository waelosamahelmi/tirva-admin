// Restaurant location in Rauhankatu 19 c, 15110
export const RESTAURANT_LOCATION = {
  lat: 60.905728, // Exact restaurant coordinates
  lng: 27.012103,
  address: "Rauhankatu 19 c, 15110 Rauhankatu 19 c, 15110"
};

// Calculate distance between two coordinates using Haversine formula
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in kilometers
}

// Calculate delivery fee based on distance
export function calculateDeliveryFee(distance: number): number {
  if (distance <= 10) return 3.00; // 0-10km delivery zone
  return 8.00; // Over 10km delivery zone
}

// Get delivery zone description
export function getDeliveryZone(distance: number): { zone: string; description: string } {
  if (distance <= 10) return { 
    zone: "standard", 
    description: "Kuljetusalue 0-10km" 
  };
  return { 
    zone: "extended", 
    description: "Kuljetusalue yli 10km" 
  };
}

// Geocoding using OpenStreetMap Nominatim API (free)
export async function geocodeAddress(address: string): Promise<{lat: number, lng: number} | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&countrycodes=fi&limit=1`
    );
    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

// Reverse geocoding to get address from coordinates
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
    );
    const data = await response.json();
    
    if (data && data.display_name) {
      return data.display_name;
    }
    return null;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
}

// Check if coordinates are within Finland (approximate bounds)
export function isWithinFinland(lat: number, lng: number): boolean {
  return lat >= 59.5 && lat <= 70.1 && lng >= 19.5 && lng <= 31.6;
}


