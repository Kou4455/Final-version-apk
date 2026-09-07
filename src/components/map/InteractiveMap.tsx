import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GeoPoint, SimulatedDriverMarker, ActiveRide, GpsLocationState } from '../../types';
import { calculateBearing, fetchRouteBetweenPoints } from '../../utils/geoUtils';
import { 
  Plus, 
  Minus, 
  Navigation, 
  Zap, 
  LocateFixed, 
  MapPin,
  Compass,
  Layers,
  Sparkles,
  Route
} from 'lucide-react';
import L from 'leaflet';

interface InteractiveMapProps {
  pickup?: GeoPoint | null;
  dropoff?: GeoPoint | null;
  activeRide?: ActiveRide | null;
  drivers?: SimulatedDriverMarker[];
  mode?: 'user' | 'driver' | 'admin' | 'compact';
  userGpsState?: GpsLocationState | null;
  driverGpsState?: GpsLocationState | null;
  onSelectLocation?: (point: GeoPoint, type: 'pickup' | 'dropoff') => void;
  heightClass?: string;
  onCenterGps?: () => void;
  isWatchingGps?: boolean;
  isFullScreen?: boolean;
}

// Optional CARTO API Key if provided in environment
const envCartoKey = ((import.meta as any).env?.VITE_CARTO_API_KEY as string | undefined);
const CARTO_API_KEY = envCartoKey && envCartoKey.trim() !== '' ? envCartoKey.trim() : undefined;

type MapTileStyle = 'voyager' | 'positron' | 'osm';

function getTileLayerConfig(style: MapTileStyle) {
  if (style === 'osm') {
    return {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      options: {
        attribution: '&copy; OpenStreetMap contributors',
        subdomains: 'abc',
        maxZoom: 19,
      }
    };
  }

  const path = style === 'positron' ? 'light_all' : 'rastertiles/voyager';
  const keyParam = CARTO_API_KEY ? `?key=${CARTO_API_KEY}` : '';
  return {
    url: `https://{s}.basemaps.cartocdn.com/${path}/{z}/{x}/{y}{r}.png${keyParam}`,
    options: {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }
  };
}

// Generate realistic E-Rickshaw (Toto) SVG marker HTML
function createTotoSvgIcon(heading = 0, isAvailable = true, label = 'Toto', isAssigned = false) {
  const accentColor = isAssigned ? '#10B981' : (isAvailable ? '#FF6B2C' : '#6B7280');
  const bgBadge = isAssigned ? 'bg-emerald-600' : 'bg-[#181818]';

  return `
    <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 select-none group cursor-pointer" style="width: 44px; height: 44px;">
      ${isAvailable ? `
        <div class="absolute inset-0 rounded-full animate-ping opacity-30" style="background-color: ${accentColor}; animation-duration: 2.5s;"></div>
      ` : ''}
      
      <!-- Vehicle Body with heading rotation -->
      <div class="relative w-10 h-10 flex items-center justify-center transition-transform duration-500 ease-out drop-shadow-md" style="transform: rotate(${heading}deg);">
        <svg viewBox="0 0 64 64" class="w-10 h-10" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- Shadow Base -->
          <ellipse cx="32" cy="34" rx="20" ry="15" fill="black" fill-opacity="0.18"/>
          <!-- Chassis Underbody -->
          <rect x="21" y="14" width="22" height="36" rx="9" fill="#1F2937" stroke="#374151" stroke-width="1.5"/>
          <!-- Rear Wheels -->
          <rect x="17" y="36" width="4" height="11" rx="2" fill="#111827"/>
          <rect x="43" y="36" width="4" height="11" rx="2" fill="#111827"/>
          <!-- Front Wheel -->
          <rect x="30" y="8" width="4" height="10" rx="2" fill="#111827"/>
          <!-- Front Canopy / Hood -->
          <path d="M22 22 L32 12 L42 22 Z" fill="${accentColor}"/>
          <!-- Main Canopy Roof -->
          <rect x="22" y="20" width="20" height="26" rx="5" fill="${accentColor}" stroke="#FFFFFF" stroke-width="1.2"/>
          <!-- Roof Solar / Eco Stripe -->
          <rect x="25" y="24" width="14" height="18" rx="3" fill="#FFFFFF" fill-opacity="0.25"/>
          <line x1="32" y1="24" x2="32" y2="42" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round"/>
          <!-- Windshield Glass -->
          <rect x="24" y="16" width="16" height="5" rx="1.5" fill="#93C5FD" fill-opacity="0.85"/>
          <!-- Dual Headlights -->
          <circle cx="26" cy="11" r="2.2" fill="#FEF08A" stroke="#CA8A04" stroke-width="0.5"/>
          <circle cx="38" cy="11" r="2.2" fill="#FEF08A" stroke="#CA8A04" stroke-width="0.5"/>
        </svg>
      </div>

      <!-- Driver Tag Pill (always upright) -->
      <div class="absolute -bottom-4 z-20 ${bgBadge} text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full whitespace-nowrap shadow-sm border border-white/20 flex items-center gap-1">
        <span class="w-1.5 h-1.5 rounded-full ${isAssigned ? 'bg-emerald-300' : 'bg-amber-400'}"></span>
        <span class="tracking-tight">${label}</span>
      </div>
    </div>
  `;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  pickup,
  dropoff,
  activeRide,
  drivers = [],
  mode = 'user',
  userGpsState,
  driverGpsState,
  onSelectLocation,
  heightClass = 'h-[360px] sm:h-[420px] md:h-[480px]',
  onCenterGps,
  isWatchingGps = true,
  isFullScreen = false,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  
  // Track existing driver marker instances for smooth position interpolation
  const driverMarkersRef = useRef<Map<string, { marker: L.Marker; currentLat: number; currentLng: number; heading: number }>>(new Map());

  const [mapStyle, setMapStyle] = useState<MapTileStyle>('voyager');
  const [autoFollow, setAutoFollow] = useState(true);
  const [pinMode, setPinMode] = useState<'pickup' | 'dropoff' | null>(null);
  const [tapHint, setTapHint] = useState<string | null>(null);
  const [liveRoadCoords, setLiveRoadCoords] = useState<[number, number][]>([]);

  // Compute primary center based on available positions
  const getCenterCoordinates = useCallback((): [number, number] => {
    if (mode === 'driver' && driverGpsState?.lat && driverGpsState?.lng) {
      return [driverGpsState.lat, driverGpsState.lng];
    }
    if (mode === 'driver' && activeRide?.driverLocation) {
      return [activeRide.driverLocation.lat, activeRide.driverLocation.lng];
    }
    if (userGpsState?.lat && userGpsState?.lng) {
      return [userGpsState.lat, userGpsState.lng];
    }
    if (pickup?.lat && pickup?.lng) {
      return [pickup.lat, pickup.lng];
    }
    return [22.5804, 88.4378]; // Default city hub (Sector V / Kolkata)
  }, [mode, driverGpsState, activeRide, userGpsState, pickup]);

  // Fetch real road routing when pickup & dropoff exist or active ride updates
  useEffect(() => {
    let isMounted = true;

    async function loadRoute() {
      // If active ride already has persisted road coordinates, use them
      if (activeRide?.routeCoordinates && activeRide.routeCoordinates.length > 1) {
        const normalized: [number, number][] = activeRide.routeCoordinates.map((pt: any) =>
          Array.isArray(pt) ? [pt[0], pt[1]] : [pt.lat, pt.lng]
        );
        setLiveRoadCoords(normalized);
        return;
      }

      // Determine routing start and end
      let startPoint = pickup ? { lat: pickup.lat, lng: pickup.lng } : null;
      let endPoint = dropoff ? { lat: dropoff.lat, lng: dropoff.lng } : null;

      // In driver mode while picking up passenger, route from driver GPS to pickup!
      if (mode === 'driver' && activeRide?.status === 'driver_assigned' && driverGpsState?.lat && pickup?.lat) {
        startPoint = { lat: driverGpsState.lat, lng: driverGpsState.lng };
        endPoint = { lat: pickup.lat, lng: pickup.lng };
      } else if (mode === 'driver' && activeRide?.status === 'in_progress' && driverGpsState?.lat && dropoff?.lat) {
        startPoint = { lat: driverGpsState.lat, lng: driverGpsState.lng };
        endPoint = { lat: dropoff.lat, lng: dropoff.lng };
      }

      if (startPoint && endPoint) {
        try {
          const route = await fetchRouteBetweenPoints(startPoint, endPoint);
          if (isMounted && route.coordinates && route.coordinates.length > 0) {
            setLiveRoadCoords(route.coordinates);
          }
        } catch {
          // Keep previous or fallback
        }
      } else {
        if (isMounted) setLiveRoadCoords([]);
      }
    }

    loadRoute();

    return () => {
      isMounted = false;
    };
  }, [pickup?.lat, pickup?.lng, dropoff?.lat, dropoff?.lng, activeRide?.status, activeRide?.routeCoordinates, mode, driverGpsState?.lat, driverGpsState?.lng]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const initialCenter = getCenterCoordinates();

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 15,
      zoomControl: false,
      attributionControl: true,
      fadeAnimation: true,
      zoomAnimation: true,
    });

    // High quality CartoDB Voyager tiles with user API key
    const initialConfig = getTileLayerConfig('voyager');
    const tileLayer = L.tileLayer(initialConfig.url, initialConfig.options).addTo(map);

    const markersGroup = L.layerGroup().addTo(map);
    markersGroupRef.current = markersGroup;
    mapInstanceRef.current = map;

    // Handle user tapping on map to select or adjust location
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (onSelectLocation) {
        const targetType = pinMode || (dropoff ? 'pickup' : 'dropoff');
        const point: GeoPoint = {
          lat: Number(e.latlng.lat.toFixed(5)),
          lng: Number(e.latlng.lng.toFixed(5)),
          name: `Pinned ${targetType === 'pickup' ? 'Pickup' : 'Drop-off'} (${e.latlng.lat.toFixed(3)}, ${e.latlng.lng.toFixed(3)})`,
          address: `Lat: ${e.latlng.lat.toFixed(4)}, Lng: ${e.latlng.lng.toFixed(4)}`,
          zone: 'Map Pin'
        };
        onSelectLocation(point, targetType);
        setTapHint(`Selected ${targetType === 'pickup' ? 'Pickup' : 'Destination'} spot!`);
        setTimeout(() => setTapHint(null), 2500);
      }
    });

    // Disable auto-follow when user manually drags the map
    map.on('dragstart', () => {
      setAutoFollow(false);
    });

    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
      driverMarkersRef.current.clear();
    };
  }, []);

  // Invalidate map size when full-screen mode toggles
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 120);
    return () => clearTimeout(timer);
  }, [isFullScreen]);

  // Update map layer tiles when mapStyle changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        layer.remove();
      }
    });

    const config = getTileLayerConfig(mapStyle);
    L.tileLayer(config.url, config.options).addTo(map);
  }, [mapStyle]);

  // Render & Update Markers and Overlays
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersGroupRef.current;
    if (!map || !markersGroup) return;

    // Clear non-retained layers
    markersGroup.clearLayers();
    if (routeLayerRef.current) {
      routeLayerRef.current.remove();
      routeLayerRef.current = null;
    }
    if (accuracyCircleRef.current) {
      accuracyCircleRef.current.remove();
      accuracyCircleRef.current = null;
    }

    const bounds = L.latLngBounds([]);

    // 1. User / Passenger GPS Marker
    const userLat = userGpsState?.lat || pickup?.lat;
    const userLng = userGpsState?.lng || pickup?.lng;

    if (userLat && userLng) {
      const userLatLng = L.latLng(userLat, userLng);
      bounds.extend(userLatLng);

      // Accuracy ring if real GPS
      if (userGpsState?.accuracy && userGpsState.accuracy < 200) {
        const circle = L.circle(userLatLng, {
          radius: userGpsState.accuracy,
          color: '#FF6B2C',
          fillColor: '#FF6B2C',
          fillOpacity: 0.12,
          weight: 1,
          dashArray: '4, 4'
        }).addTo(markersGroup);
        accuracyCircleRef.current = circle;
      }

      // Passenger Pin
      const userIconHtml = `
        <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 select-none">
          <div class="absolute w-12 h-12 rounded-full bg-orange-500/20 animate-pulse pointer-events-none"></div>
          <div class="w-9 h-9 rounded-full bg-gradient-to-tr from-[#FF6B2C] to-[#FFA066] text-white flex items-center justify-center shadow-lg border-2 border-white ring-2 ring-orange-500/30">
            <svg class="w-4 h-4 text-white fill-white" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z"/>
            </svg>
          </div>
          <div class="absolute -bottom-5 bg-[#181818] text-white text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shadow-md border border-white/20 flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>${mode === 'user' ? 'YOU (PICKUP)' : 'Passenger'}</span>
          </div>
        </div>
      `;

      const userIcon = L.divIcon({
        html: userIconHtml,
        className: 'custom-user-gps-marker',
        iconSize: [0, 0],
      });

      const userMarker = L.marker(userLatLng, { icon: userIcon }).addTo(markersGroup);
      userMarker.bindTooltip(
        `<b>${pickup?.name || userGpsState?.name || 'Pickup Point'}</b><br/><span style="font-size:10px; color:#666;">${userGpsState?.address || ''}</span>`,
        { direction: 'top', offset: [0, -20] }
      );
    }

    // 2. Drop-off Destination Marker
    if (dropoff?.lat && dropoff?.lng) {
      const dropLatLng = L.latLng(dropoff.lat, dropoff.lng);
      bounds.extend(dropLatLng);

      const dropIconHtml = `
        <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 select-none">
          <div class="w-8 h-8 rounded-full bg-[#181818] text-white flex items-center justify-center shadow-lg border-2 border-white">
            <svg class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
              <line x1="4" y1="22" x2="4" y2="15"></line>
            </svg>
          </div>
          <div class="absolute -bottom-5 bg-white text-[#181818] text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shadow-md border border-[#EDE8E0]">
            ${dropoff.name ? dropoff.name.slice(0, 18) : 'Destination'}
          </div>
        </div>
      `;

      const dropIcon = L.divIcon({
        html: dropIconHtml,
        className: 'custom-dropoff-marker',
        iconSize: [0, 0],
      });

      const dropMarker = L.marker(dropLatLng, { icon: dropIcon }).addTo(markersGroup);
      dropMarker.bindTooltip(`<b>Drop-off:</b> ${dropoff.name}<br/>${dropoff.address}`, {
        direction: 'top',
        offset: [0, -18],
      });
    }

    // 3. Driver / Assigned Toto Partner Live GPS Marker with Heading
    const driverLat = driverGpsState?.lat || activeRide?.driverLocation?.lat;
    const driverLng = driverGpsState?.lng || activeRide?.driverLocation?.lng;
    const driverHeading = driverGpsState?.heading || activeRide?.driverLocation?.heading || 0;

    if (driverLat && driverLng) {
      const driverLatLng = L.latLng(driverLat, driverLng);
      bounds.extend(driverLatLng);

      const isLivePartner = mode === 'driver';
      const driverLabel = isLivePartner ? 'YOU (DRIVER)' : (activeRide?.driverName ? activeRide.driverName.split(' ')[0] : 'Toto Captain');

      const driverIconHtml = createTotoSvgIcon(driverHeading, true, driverLabel, true);
      const driverIcon = L.divIcon({
        html: driverIconHtml,
        className: 'custom-active-driver-marker',
        iconSize: [0, 0],
      });

      const driverMarker = L.marker(driverLatLng, { icon: driverIcon }).addTo(markersGroup);
      driverMarker.bindTooltip(
        `<b>${activeRide?.driverName || 'Toto Partner'}</b><br/>${activeRide?.vehicleModel || 'E-Rickshaw'} · ${activeRide?.vehicleNumber || 'WB-08-2048'}`,
        { direction: 'top', offset: [0, -22] }
      );
    }

    // 4. Nearby Available Drivers on Live Map
    if ((!activeRide || activeRide.status === 'idle' || activeRide.status === 'searching') && drivers && drivers.length > 0) {
      drivers.forEach((d) => {
        // Don't duplicate active ride driver
        if (activeRide?.driverId && d.id === activeRide.driverId) return;

        const dLatLng = L.latLng(d.lat, d.lng);
        const heading = d.heading || 0;
        const iconHtml = createTotoSvgIcon(heading, d.isAvailable, d.name.split(' ')[0], false);

        const icon = L.divIcon({
          html: iconHtml,
          className: 'custom-nearby-toto-marker',
          iconSize: [0, 0],
        });

        const m = L.marker(dLatLng, { icon }).addTo(markersGroup);
        m.bindTooltip(
          `<b>${d.name}</b><br/>${d.vehicleNumber} · ${d.rating ? `★ ${d.rating}` : 'Available'}`,
          { direction: 'top', offset: [0, -18] }
        );
      });
    }

    // 5. Connect Real Road Route Polyline
    if (liveRoadCoords.length > 1) {
      // Draw road polyline with background glow & main stroke
      const bgLine = L.polyline(liveRoadCoords, {
        color: '#FFFFFF',
        weight: 7,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(markersGroup);

      const mainLine = L.polyline(liveRoadCoords, {
        color: '#FF6B2C',
        weight: 4.5,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
        dashArray: activeRide?.status === 'in_progress' ? undefined : '5, 8',
      }).addTo(markersGroup);

      routeLayerRef.current = mainLine;

      // Extend bounds to include entire route
      liveRoadCoords.forEach((pt) => {
        bounds.extend(L.latLng(pt[0], pt[1]));
      });
    }

    // Camera Auto-Follow & Auto-Fit Bounds
    if (autoFollow) {
      if (bounds.isValid() && bounds.getNorthEast().distanceTo(bounds.getSouthWest()) > 100) {
        map.fitBounds(bounds, { padding: [48, 48], maxZoom: 16 });
      } else {
        const center = getCenterCoordinates();
        map.panTo(center, { animate: true });
      }
    }
  }, [
    pickup,
    dropoff,
    activeRide,
    drivers,
    mode,
    userGpsState,
    driverGpsState,
    autoFollow,
    liveRoadCoords,
    getCenterCoordinates,
  ]);

  const handleCenterGpsClick = () => {
    setAutoFollow(true);
    const map = mapInstanceRef.current;
    if (map) {
      const center = getCenterCoordinates();
      map.flyTo(center, 16, { animate: true, duration: 1 });
    }
    if (onCenterGps) {
      onCenterGps();
    }
  };

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    mapInstanceRef.current?.zoomIn();
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    mapInstanceRef.current?.zoomOut();
  };

  const currentSpeed = mode === 'driver' ? driverGpsState?.speedKmH || 0 : userGpsState?.speedKmH || 0;
  const currentAccuracy = mode === 'driver' ? driverGpsState?.accuracy : userGpsState?.accuracy;

  return (
    <div 
      id="interactive-map-container"
      className={
        isFullScreen
          ? "fixed inset-0 w-full h-full z-0 overflow-hidden select-none border-0 rounded-none shadow-none transition-all"
          : `relative w-full ${heightClass} bg-[#EFEAE2] rounded-3xl overflow-hidden select-none border border-[#E5DFD4] shadow-xs transition-all`
      }
    >
      {/* Real Leaflet Map Viewport */}
      <div 
        ref={mapContainerRef} 
        className="w-full h-full absolute inset-0 z-0" 
        style={{ background: '#FAF8F5' }}
      />

      {/* Speedometer and route info if active */}
      {(currentSpeed > 0 || liveRoadCoords.length > 0) && (
        <div 
          className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-2 max-w-[85%]"
        >
          {/* Speedometer Badge */}
          {currentSpeed > 0 && (
            <div className="px-2.5 py-1 bg-[#181818] text-white rounded-full text-[11px] font-bold shadow-sm flex items-center gap-1 font-mono animate-in fade-in">
              <Zap className="w-3 h-3 text-[#FF6B2C] fill-[#FF6B2C]" />
              <span>{currentSpeed} km/h</span>
            </div>
          )}

          {/* Route distance indicator if active */}
          {liveRoadCoords.length > 0 && (
            <div className="hidden sm:flex px-2.5 py-1 bg-[#FF6B2C] text-white rounded-full text-[11px] font-bold shadow-sm items-center gap-1">
              <Route className="w-3 h-3 text-white" />
              <span>Real Road Path</span>
            </div>
          )}
        </div>
      )}

      {/* Tap hint notification */}
      {tapHint && (
        <div className="absolute top-36 left-1/2 -translate-x-1/2 z-30 px-3 py-1 bg-[#181818] text-white text-xs font-bold rounded-full shadow-lg border border-white/20 animate-bounce pointer-events-none">
          {tapHint}
        </div>
      )}

      {/* Controls: Recenter + Zoom + Tile Style */}
      <div 
        className="absolute bottom-3 right-3 z-10 flex flex-col gap-2"
      >
        {/* Pan to Mobile GPS */}
        <button
          type="button"
          onClick={handleCenterGpsClick}
          className="w-9 h-9 rounded-full bg-white text-[#FF6B2C] shadow-md border border-[#E5DFD4] flex items-center justify-center hover:bg-orange-50 active:scale-90 transition-all cursor-pointer"
          title="Pan to My Mobile GPS Location"
        >
          <Navigation className="w-4 h-4 fill-[#FF6B2C] text-[#FF6B2C] -rotate-45" />
        </button>

        {/* Map Tile Style Toggle */}
        <button
          type="button"
          onClick={() => setMapStyle((prev) => (prev === 'voyager' ? 'positron' : prev === 'positron' ? 'osm' : 'voyager'))}
          className="w-9 h-9 rounded-full bg-white text-[#181818] shadow-md border border-[#E5DFD4] flex items-center justify-center hover:bg-gray-50 active:scale-90 transition-all cursor-pointer"
          title={`Toggle Map Style (Current: ${mapStyle.toUpperCase()})`}
        >
          <Layers className="w-4 h-4 text-gray-700" />
        </button>

        {/* Zoom In/Out */}
        <div className="flex flex-col bg-white/95 backdrop-blur-md rounded-2xl shadow-md border border-[#E5DFD4] overflow-hidden">
          <button
            type="button"
            onClick={handleZoomIn}
            className="w-9 h-8 flex items-center justify-center text-[#181818] hover:bg-gray-100 active:bg-gray-200 transition-colors border-b border-[#EDE8E0] cursor-pointer"
            title="Zoom In"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="w-9 h-8 flex items-center justify-center text-[#181818] hover:bg-gray-100 active:bg-gray-200 transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
