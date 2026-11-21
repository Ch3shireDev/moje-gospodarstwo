import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

// Darmowe kafelki bez klucza.
const STYLE = 'https://tiles.openfreemap.org/styles/liberty';
const POLAND_CENTER = [19.3, 52.0];
const POLAND_MAX_BOUNDS = [[11.5, 47.8], [26.5, 56.2]];

// Warstwy GUGiK przez WMS. Nazwy warstw do potwierdzenia w GetCapabilities, jeśli coś nie wyświetla.
const wms = (base, layers, format, transparent = false) =>
  `${base}?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=${layers}&STYLES=&FORMAT=${format}` +
  `${transparent ? '&TRANSPARENT=TRUE' : ''}&CRS=EPSG:3857&BBOX={bbox-epsg-3857}&WIDTH=256&HEIGHT=256`;
const ORTO = wms('https://mapy.geoportal.gov.pl/wss/service/PZGIK/ORTO/WMS/StandardResolution', 'Raster', 'image/jpeg');
const DZIALKI = wms('https://integracja.gugik.gov.pl/cgi-bin/KrajowaIntegracjaEwidencjiGruntow', 'dzialki,numery_dzialek', 'image/png', true);

const EMPTY = { type: 'FeatureCollection', features: [] };

export default function MapView({ point, parcelGeometry, markers = [], onPick, focus, visible = true, hint, interactive = true }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const extraRef = useRef([]);
  const parcelRef = useRef(null);
  const fitPendingRef = useRef(false);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  const [ready, setReady] = useState(false);
  const [orto, setOrto] = useState(false);
  const [dzialki, setDzialki] = useState(false);
  // Ładowanie kafli i warstw – żeby było widać, że coś się dzieje (np. po włączeniu zdjęć lotniczych).
  const [busy, setBusy] = useState(true);
  const [zoom, setZoom] = useState(5);

  useEffect(() => {
    const map = new maplibregl.Map({
      container: containerRef.current,
      interactive,
      style: STYLE,
      center: POLAND_CENTER,
      zoom: 5.2,
      maxBounds: POLAND_MAX_BOUNDS,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
    });
    map.touchZoomRotate.disableRotation();
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    let busyTimer;
    map.on('dataloading', () => {
      clearTimeout(busyTimer);
      // Krótkie doładowania kafli nie migają wskaźnikiem – pokazujemy go po 250 ms.
      busyTimer = setTimeout(() => setBusy(true), 250);
    });
    map.on('idle', () => {
      clearTimeout(busyTimer);
      setBusy(false);
    });
    map.on('zoomend', () => setZoom(map.getZoom()));
    map.on('load', () => {
      const firstLabel = map.getStyle().layers.find((l) => l.type === 'symbol')?.id;
      map.addSource('orto', { type: 'raster', tiles: [ORTO], tileSize: 256, attribution: 'Ortofotomapa © GUGiK' });
      map.addLayer({ id: 'orto', type: 'raster', source: 'orto', layout: { visibility: 'none' } }, firstLabel);
      map.addSource('dzialki', { type: 'raster', tiles: [DZIALKI], tileSize: 256, attribution: 'Działki © GUGiK (KIEG)' });
      map.addLayer({ id: 'dzialki', type: 'raster', source: 'dzialki', minzoom: 14, layout: { visibility: 'none' } });
      map.addSource('parcel', { type: 'geojson', data: EMPTY });
      map.addLayer({ id: 'parcel-fill', type: 'fill', source: 'parcel', paint: { 'fill-color': '#5fa8d3', 'fill-opacity': 0.28 } });
      map.addLayer({ id: 'parcel-line', type: 'line', source: 'parcel', paint: { 'line-color': '#0f2a1c', 'line-width': 2.5 } });
      setReady(true);
    });

    map.on('click', (e) => {
      if (!onPickRef.current) return;
      const { lat, lng } = e.lngLat;
      // Przy małym przybliżeniu klik tylko przybliża – inaczej trafilibyśmy w przypadkową działkę.
      if (map.getZoom() < 13) {
        map.flyTo({ center: [lng, lat], zoom: Math.min(16, map.getZoom() + 4), speed: 1.6 });
        return;
      }
      onPickRef.current({ lat, lon: lng });
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const fitParcel = () => {
    const g = parcelRef.current;
    const map = mapRef.current;
    if (!g || !map) return;
    const pts = (g.type === 'Polygon' ? [g.coordinates] : g.coordinates).flat(2);
    const lons = pts.map((p) => p[0]);
    const lats = pts.map((p) => p[1]);
    map.fitBounds([[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]], { padding: 80, maxZoom: 17, duration: 600 });
  };

  // Po powrocie z ekranu raportu kontener znów ma rozmiar – MapLibre musi go przeliczyć.
  useEffect(() => {
    if (!visible || !mapRef.current) return;
    requestAnimationFrame(() => {
      mapRef.current?.resize();
      if (parcelRef.current && fitPendingRef.current) {
        fitParcel();
        fitPendingRef.current = false;
      }
    });
  }, [visible]);

  // Pinezka.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!point) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }
    if (!markerRef.current) markerRef.current = new maplibregl.Marker({ color: '#c2410c' });
    markerRef.current.setLngLat([point.lon, point.lat]).addTo(map);
  }, [point]);

  // Miejsca wskazane w rekomendacjach (np. obniżenie terenu do retencji).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    extraRef.current.forEach((m) => m.remove());
    extraRef.current = markers.map((m) =>
      new maplibregl.Marker({ color: '#2a6f97', scale: 0.8 }).setLngLat([m.lon, m.lat]).setPopup(new maplibregl.Popup({ offset: 20 }).setText(m.title)).addTo(map),
    );
  }, [markers]);

  // Obrys działki z ULDK.
  useEffect(() => {
    if (!ready) return;
    const data = parcelGeometry ? { type: 'Feature', geometry: parcelGeometry, properties: {} } : EMPTY;
    mapRef.current.getSource('parcel')?.setData(data);
    parcelRef.current = parcelGeometry;
    if (parcelGeometry) {
      // Ukryta mapa ma rozmiar 0×0 – dopasujemy widok, gdy znów będzie widoczna.
      if (visible) fitParcel();
      else fitPendingRef.current = true;
    }
  }, [ready, parcelGeometry]);

  // Przelot (np. po geolokalizacji).
  useEffect(() => {
    if (focus && mapRef.current && visible && !parcelRef.current) mapRef.current.flyTo({ center: [focus.lon, focus.lat], zoom: focus.zoom ?? 13, speed: 1.6 });
  }, [focus]);

  useEffect(() => {
    if (!ready) return;
    mapRef.current.setLayoutProperty('orto', 'visibility', orto ? 'visible' : 'none');
    mapRef.current.setLayoutProperty('dzialki', 'visibility', dzialki ? 'visible' : 'none');
  }, [ready, orto, dzialki]);

  return (
    <div className="map-wrap">
      <div ref={containerRef} className="map" />
      <div className="map-layers" role="group" aria-label="Warstwy mapy">
        <button
          type="button"
          className={orto ? 'on' : ''}
          aria-pressed={orto}
          title={orto ? 'Ukryj zdjęcia lotnicze' : 'Pokaż zdjęcia lotnicze (ortofotomapa GUGiK)'}
          onClick={() => setOrto((v) => !v)}
        >
          {orto ? '✓ ' : ''}Zdjęcia lotnicze
        </button>
        <button
          type="button"
          className={dzialki ? 'on' : ''}
          aria-pressed={dzialki}
          title={dzialki ? 'Ukryj granice i numery działek' : 'Pokaż granice i numery działek ewidencyjnych (GUGiK)'}
          onClick={() => setDzialki((v) => !v)}
        >
          {dzialki ? '✓ ' : ''}Granice działek
        </button>
        {dzialki && zoom < 14 && <span className="layer-note">przybliż mapę, aby je zobaczyć</span>}
      </div>
      {interactive && <div className="map-hint">{hint ?? 'Kliknij swoją działkę'}</div>}
      {(busy || !ready) && (
        <div className="map-busy" role="status">
          <span className="spinner-small" aria-hidden="true" /> {ready ? 'Wczytuję mapę…' : 'Uruchamiam mapę…'}
        </div>
      )}
    </div>
  );
}
