import { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/lib/language-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, Calculator, AlertCircle, Check } from "lucide-react";
import { 
  RESTAURANT_LOCATION, 
  calculateDistance, 
  calculateDeliveryFee, 
  getDeliveryZone,
  geocodeAddress,
  reverseGeocode,
  isWithinFinland
} from "@/lib/map-utils";

interface DeliveryMapProps {
  onDeliveryCalculated: (fee: number, distance: number, address: string) => void;
  initialAddress?: string;
}

export function DeliveryMap({ onDeliveryCalculated, initialAddress = "" }: DeliveryMapProps) {
  const { t } = useLanguage();
  const mapRef = useRef<HTMLDivElement>(null);
  const [address, setAddress] = useState(initialAddress);
  const [isLoading, setIsLoading] = useState(false);
  const [deliveryInfo, setDeliveryInfo] = useState<{
    distance: number;
    fee: number;
    zone: string;
    coordinates: { lat: number; lng: number };
  } | null>(null);
  const [error, setError] = useState<string>("");
  const [mapInitialized, setMapInitialized] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{
    display_name: string;
    lat: string;
    lon: string;
  }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Initialize real OpenStreetMap
  useEffect(() => {
    if (!mapRef.current || mapInitialized) return;

    const mapContainer = mapRef.current;
    const mapId = `map-${Date.now()}`;
    
    // Add Leaflet CSS and JS
    const linkElement = document.createElement('link');
    linkElement.rel = 'stylesheet';
    linkElement.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    linkElement.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
    linkElement.crossOrigin = '';
    document.head.appendChild(linkElement);

    const scriptElement = document.createElement('script');
    scriptElement.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    scriptElement.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
    scriptElement.crossOrigin = '';
    
    scriptElement.onload = () => {
      mapContainer.innerHTML = `<div id="${mapId}" style="width: 100%; height: 300px; border-radius: 8px; z-index: 1;"></div>`;
      
      // Initialize Leaflet map
      const L = (window as any).L;
      const map = L.map(mapId).setView([RESTAURANT_LOCATION.lat, RESTAURANT_LOCATION.lng], 13);
      
      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);
      
      // Add restaurant marker
      const restaurantIcon = L.divIcon({
        html: `<div style="background: #ef4444; color: white; padding: 6px 10px; border-radius: 6px; font-size: 11px; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.3); white-space: nowrap;">?? ${t("Tirvan Kahvila", "Tirvan Kahvila")}</div>`,
        className: 'custom-marker',
        iconSize: [120, 30],
        iconAnchor: [60, 30]
      });
      
      L.marker([RESTAURANT_LOCATION.lat, RESTAURANT_LOCATION.lng], { icon: restaurantIcon })
        .addTo(map)
        .bindPopup(`
          <div style="text-align: center;">
            <strong>${t("Tirvan Kahvila", "Tirvan Kahvila")}</strong><br>
            <small>Pasintie 2, 45410 Utti</small><br>
            <small>+358 41 3152619</small>
          </div>
        `);
      
      // Store map reference for later use
      (mapRef.current as any).leafletMap = map;
    };
    
    document.head.appendChild(scriptElement);
    setMapInitialized(true);
  }, [mapInitialized, t]);

  // Address suggestions with debouncing
  useEffect(() => {
    const searchAddresses = async () => {
      if (address.length < 3) {
        setSuggestions([]);
        return;
      }

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&countrycodes=fi&limit=5&addressdetails=1`
        );
        const data = await response.json();
        setSuggestions(data);
      } catch (error) {
        console.error('Address search error:', error);
      }
    };

    const timeoutId = setTimeout(searchAddresses, 300);
    return () => clearTimeout(timeoutId);
  }, [address]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mapRef.current && !mapRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSuggestions]);

  const handleCalculateDeliveryForCoordinates = async (lat: number, lng: number, addressName: string) => {
    setIsLoading(true);
    setError("");
    setShowSuggestions(false);

    try {
      if (!isWithinFinland(lat, lng)) {
        setError(t("Toimitus vain Suomessa", "Delivery only in Finland"));
        setIsLoading(false);
        return;
      }

      const distance = calculateDistance(
        RESTAURANT_LOCATION.lat,
        RESTAURANT_LOCATION.lng,
        lat,
        lng
      );

      const fee = calculateDeliveryFee(distance);
      const zone = getDeliveryZone(distance);

      if (fee === -1) {
        setError(t("Virhe toimitusmaksun laskennassa", "Error calculating delivery fee"));
        setIsLoading(false);
        return;
      }

      const info = {
        distance: Math.round(distance * 10) / 10,
        fee,
        zone: zone.description,
        coordinates: { lat, lng }
      };

      setDeliveryInfo(info);
      onDeliveryCalculated(fee, info.distance, addressName);
      updateMapWithRoute(info.distance, addressName);

    } catch (error) {
      setError(t("Virhe laskettaessa toimitusta", "Error calculating delivery"));
    }

    setIsLoading(false);
  };

  const handleCalculateDelivery = async () => {
    if (!address.trim()) {
      setError(t("Syötä toimitusosoite", "Enter delivery address"));
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const coordinates = await geocodeAddress(address);
      if (!coordinates) {
        setError(t("Osoitetta ei löytynyt. Kokeile tarkentaa osoitetta.", "Address not found. Try to be more specific."));
        setIsLoading(false);
        return;
      }

      await handleCalculateDeliveryForCoordinates(coordinates.lat, coordinates.lng, address);
    } catch (error) {
      setError(t("Virhe laskettaessa toimitusta", "Error calculating delivery"));
      setIsLoading(false);
    }
  };

  const updateMapWithRoute = (distance: number, customerAddress: string) => {
    const leafletMap = (mapRef.current as any)?.leafletMap;
    if (!leafletMap || !deliveryInfo) return;

    const L = (window as any).L;
    
    // Clear existing markers except restaurant
    leafletMap.eachLayer((layer: any) => {
      if (layer instanceof L.Marker && !layer.options.isRestaurant) {
        leafletMap.removeLayer(layer);
      }
      if (layer instanceof L.Polyline) {
        leafletMap.removeLayer(layer);
      }
    });

    // Add customer marker
    const customerIcon = L.divIcon({
      html: `<div style="background: #10b981; color: white; padding: 6px 10px; border-radius: 6px; font-size: 11px; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.3); white-space: nowrap;">?? ${t("Sinun osoite", "Your address")}</div>`,
      className: 'custom-marker',
      iconSize: [120, 30],
      iconAnchor: [60, 30]
    });

    const customerMarker = L.marker([deliveryInfo.coordinates.lat, deliveryInfo.coordinates.lng], { 
      icon: customerIcon,
      isRestaurant: false 
    }).addTo(leafletMap);

    customerMarker.bindPopup(`
      <div style="text-align: center;">
        <strong>${t("Toimitusosoite", "Delivery Address")}</strong><br>
        <small>${customerAddress}</small><br>
        <small>${t("Etäisyys", "Distance")}: ${distance} km</small>
      </div>
    `);

    // Add route line
    const routeLine = L.polyline([
      [RESTAURANT_LOCATION.lat, RESTAURANT_LOCATION.lng],
      [deliveryInfo.coordinates.lat, deliveryInfo.coordinates.lng]
    ], {
      color: '#4f46e5',
      weight: 3,
      opacity: 0.8,
      dashArray: '10, 5'
    }).addTo(leafletMap);

    // Fit map to show both markers
    const group = L.featureGroup([
      L.marker([RESTAURANT_LOCATION.lat, RESTAURANT_LOCATION.lng]),
      customerMarker,
      routeLine
    ]);
    
    leafletMap.fitBounds(group.getBounds(), { padding: [20, 20] });
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError(t("Paikannusta ei tueta", "Geolocation not supported"));
      return;
    }

    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const addressFromCoords = await reverseGeocode(latitude, longitude);
          
          if (addressFromCoords) {
            setAddress(addressFromCoords);
          }
          
          const distance = calculateDistance(
            RESTAURANT_LOCATION.lat,
            RESTAURANT_LOCATION.lng,
            latitude,
            longitude
          );

          const fee = calculateDeliveryFee(distance);
          const zone = getDeliveryZone(distance);

          if (fee === -1) {
            setError(t("Virhe toimitusmaksun laskennassa", "Error calculating delivery fee"));
            setIsLoading(false);
            return;
          }

          const info = {
            distance: Math.round(distance * 10) / 10,
            fee,
            zone: zone.description,
            coordinates: { lat: latitude, lng: longitude }
          };

          setDeliveryInfo(info);
          onDeliveryCalculated(fee, info.distance, addressFromCoords || "Nykyinen sijainti");
        } catch (error) {
          setError(t("Virhe paikannuksessa", "Error in location"));
        }
        setIsLoading(false);
      },
      () => {
        setError(t("Paikannusta ei voitu hakea", "Could not get location"));
        setIsLoading(false);
      }
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MapPin className="w-5 h-5 text-red-600" />
            <span>{t("Toimituskustannuslaskuri", "Delivery Cost Calculator")}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Map display */}
          <div ref={mapRef} className="w-full h-[300px] border border-gray-200 rounded-lg" />

          {/* Address input with suggestions */}
          <div className="relative">
            <div className="flex space-x-2">
              <div className="flex-1 relative">
                <Input
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    setShowSuggestions(true);
                    setError("");
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder={t("Syötä toimitusosoite Suomessa...", "Enter delivery address in Finland...")}
                  className="w-full"
                />
                
                {/* Address suggestions dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                    {suggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-600 last:border-b-0"
                        onClick={async () => {
                          setAddress(suggestion.display_name);
                          setShowSuggestions(false);
                          await handleCalculateDeliveryForCoordinates(
                            parseFloat(suggestion.lat),
                            parseFloat(suggestion.lon),
                            suggestion.display_name
                          );
                        }}
                      >
                        <div className="flex items-start space-x-2">
                          <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div className="text-sm">
                            <div className="font-medium text-gray-900 dark:text-white">
                              {suggestion.display_name.split(',')[0]}
                            </div>
                            <div className="text-gray-500 dark:text-gray-400 text-xs">
                              {suggestion.display_name}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <Button
                onClick={handleGetCurrentLocation}
                variant="outline"
                size="sm"
                disabled={isLoading}
                title={t("Käytä nykyistä sijaintia", "Use current location")}
              >
                <Navigation className="w-4 h-4" />
              </Button>
              
              <Button
                onClick={handleCalculateDelivery}
                disabled={isLoading || !address.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Calculator className="w-4 h-4 mr-2" />
                {isLoading ? t("Laskee...", "Calculating...") : t("Laske", "Calculate")}
              </Button>
            </div>
          </div>

          {/* Error display */}
          {error && (
            <div className="flex items-center space-x-2 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          {/* Delivery info */}
          {deliveryInfo && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{deliveryInfo.distance} km</div>
                <div className="text-sm text-gray-600">{t("Etäisyys", "Distance")}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{deliveryInfo.fee.toFixed(2)}€</div>
                <div className="text-sm text-gray-600">{t("Toimitusmaksu", "Delivery Fee")}</div>
              </div>
              <div className="text-center">
                <Badge variant="outline" className="text-sm">
                  {deliveryInfo.zone}
                </Badge>
                <div className="text-sm text-gray-600 mt-1">{t("Toimitus-alue", "Delivery Zone")}</div>
              </div>
            </div>
          )}

          {/* Delivery zones info */}
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h4 className="font-semibold mb-2">{t("Toimitusalueet", "Delivery Zones")}</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>{t("Kuljetusalue 0 - 10km", "Delivery zone 0 - 10km")}</span>
                <span className="font-medium">{t("3,00 €", "3.00 €")}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("Kuljetusalue yli 10km", "Delivery zone over 10km")}</span>
                <span className="font-medium">{t("8,00 €", "8.00 €")}</span>
              </div>
            </div>
            <div className="text-xs text-gray-600 mt-2">
              {t("* Yli 10km toimituksissa minimitilaus 20,00 €", "* For deliveries over 10km, minimum order €20.00")}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}