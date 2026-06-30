import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Issue } from '../types';
import { CATEGORY_COLORS } from './IssueCard';

interface LeafletMapProps {
  issues: Issue[];
  selectedIssueId?: string | null;
  onSelectIssue: (issue: Issue) => void;
  viewMode: 'pins' | 'heatmap';
  categoryFilter: string;
  mapStyle: 'dark' | 'streets' | 'satellite' | 'terrain' | 'hybrid';
  userLocation?: [number, number] | null;
}

export default function LeafletMap({
  issues,
  selectedIssueId,
  onSelectIssue,
  viewMode,
  categoryFilter,
  mapStyle,
  userLocation
}: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Filter issues based on active filter
  const filteredIssues = issues.filter(issue => {
    if (categoryFilter === 'all') return true;
    return issue.category === categoryFilter;
  });

  // Calculate dynamic center
  const getInitialCenter = (): [number, number] => {
    if (selectedIssueId) {
      const selected = issues.find(i => i.id === selectedIssueId);
      if (selected) return [selected.latitude, selected.longitude];
    }
    if (filteredIssues.length > 0) {
      return [filteredIssues[0].latitude, filteredIssues[0].longitude];
    }
    return [13.0418, 80.2337]; // Default Chennai
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const center = getInitialCenter();
    
    // Create Leaflet map instance
    const map = L.map(containerRef.current, {
      center: center,
      zoom: 13,
      zoomControl: false, // Custom position Zoom below
      attributionControl: false
    });

    // Initialize chosen basemap layer
    const BASEMAPS = {
      dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      streets: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      terrain: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      hybrid: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_all/{z}/{x}/{y}{r}.png'
    };

    const initialLayer = L.tileLayer(BASEMAPS[mapStyle] || BASEMAPS.dark, {
      maxZoom: 20,
    }).addTo(map);
    tileLayerRef.current = initialLayer;

    L.control.zoom({
      position: 'bottomright'
    }).addTo(map);

    mapInstanceRef.current = map;
    
    // Layer group for pins
    const layerGroup = L.layerGroup().addTo(map);
    layerGroupRef.current = layerGroup;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Dynamic Basemap switcher effect
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const BASEMAPS = {
      dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      streets: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      terrain: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      hybrid: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_all/{z}/{x}/{y}{r}.png'
    };

    const newLayer = L.tileLayer(BASEMAPS[mapStyle] || BASEMAPS.dark, {
      maxZoom: 20,
    }).addTo(map);
    tileLayerRef.current = newLayer;
  }, [mapStyle]);

  // Update map center when selectedIssueId changes
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedIssueId) return;
    const selected = issues.find(i => i.id === selectedIssueId);
    if (selected) {
      mapInstanceRef.current.setView([selected.latitude, selected.longitude], 15, {
        animate: true,
        duration: 0.8
      });
    }
  }, [selectedIssueId, issues]);

  // Center map on user location when userLocation detected
  useEffect(() => {
    if (userLocation && mapInstanceRef.current) {
      mapInstanceRef.current.setView(userLocation, 16, {
        animate: true,
        duration: 1.0
      });
    }
  }, [userLocation]);

  // Update markers on issue changes / filters / viewMode
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    // Clear existing markers
    layerGroup.clearLayers();

    // Draw user location marker if available
    if (userLocation) {
      // Outer translucent glowing circle
      const pulseCircle = L.circleMarker(userLocation, {
        radius: 18,
        fillColor: '#3b82f6',
        color: '#3b82f6',
        weight: 0,
        fillOpacity: 0.2,
        interactive: false
      });

      // Core bright blue locator dot
      const coreCircle = L.circleMarker(userLocation, {
        radius: 7,
        fillColor: '#3b82f6',
        color: '#ffffff',
        weight: 2,
        fillOpacity: 1,
        interactive: true
      });

      coreCircle.bindTooltip('<b>Your Current Location</b>', {
        direction: 'top',
        className: 'bg-blue-600 border border-blue-400 text-white text-xs rounded-lg px-2 py-1 font-sans'
      });

      pulseCircle.addTo(layerGroup);
      coreCircle.addTo(layerGroup);
    }

    filteredIssues.forEach(issue => {
      const colors = CATEGORY_COLORS[issue.category] || CATEGORY_COLORS.other;

      if (viewMode === 'pins') {
        // Draw solid circular category pin
        const marker = L.circleMarker([issue.latitude, issue.longitude], {
          radius: issue.id === selectedIssueId ? 12 : 9,
          fillColor: colors.hex,
          color: '#ffffff',
          weight: issue.id === selectedIssueId ? 3 : 1.5,
          opacity: 0.9,
          fillOpacity: 0.85
        });

        // Interactive Popup & Bindings
        marker.on('click', () => {
          onSelectIssue(issue);
        });

        // Add tooltip showing title
        marker.bindTooltip(`<b>${issue.title}</b><br/>${issue.category.toUpperCase()} • Upvotes: ${issue.upvotes}`, {
          direction: 'top',
          offset: [0, -10],
          className: 'custom-map-tooltip bg-slate-900 border border-slate-700 text-slate-100 text-xs rounded-lg px-2 py-1 font-sans'
        });

        marker.addTo(layerGroup);
      } else {
        // Draw Heatmap radiating circle
        // Intensity/Radius based on upvote weight
        const intensity = Math.min(issue.upvotes || 1, 50); 
        const heatRadius = 25 + intensity * 2;
        const heatOpacity = 0.15 + (intensity / 50) * 0.25;

        const heatCircle = L.circle([issue.latitude, issue.longitude], {
          radius: heatRadius,
          fillColor: colors.hex,
          fillOpacity: heatOpacity,
          stroke: false,
          interactive: true
        });

        // Core center indicator
        const centerCircle = L.circleMarker([issue.latitude, issue.longitude], {
          radius: 3,
          fillColor: '#ffffff',
          color: colors.hex,
          weight: 2,
          opacity: 0.8,
          fillOpacity: 1,
          interactive: false
        });

        heatCircle.on('click', () => {
          onSelectIssue(issue);
        });

        heatCircle.addTo(layerGroup);
        centerCircle.addTo(layerGroup);
      }
    });
  }, [filteredIssues, viewMode, selectedIssueId, userLocation]);

  return (
    <div className="w-full h-full relative" id="map-wrapper">
      <div ref={containerRef} className="w-full h-full" id="leaflet-map-element" />
    </div>
  );
}
