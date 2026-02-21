import { useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { useI18n } from '@/lib/i18n';
import { useAppStore } from '@/lib/store';
import type { LatviaArea } from '@/lib/types';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const IMPACT_COLORS: Record<'increase' | 'decrease' | 'neutral', string> = {
  increase: '#16a34a',
  decrease: '#dc2626',
  neutral: '#6b7280',
};

const REGION_CENTERS: Record<LatviaArea, [number, number]> = {
  Riga: [56.9496, 24.1052],
  Pieriga: [56.86, 24.52],
  Kurzeme: [56.66, 21.54],
  Zemgale: [56.65, 23.72],
  Vidzeme: [57.54, 25.43],
  Latgale: [56.51, 27.33],
};

const AREA_LABELS: Record<LatviaArea, { lv: string; en: string }> = {
  Riga: { lv: 'Rīga', en: 'Riga' },
  Pieriga: { lv: 'Pierīga', en: 'Pieriga' },
  Kurzeme: { lv: 'Kurzeme', en: 'Kurzeme' },
  Zemgale: { lv: 'Zemgale', en: 'Zemgale' },
  Vidzeme: { lv: 'Vidzeme', en: 'Vidzeme' },
  Latgale: { lv: 'Latgale', en: 'Latgale' },
};

const DEFAULT_FISCAL: Record<LatviaArea, { taxes_paid: number; budget_received: number }> = {
  Riga: { taxes_paid: 4200, budget_received: 3100 },
  Pieriga: { taxes_paid: 1800, budget_received: 1400 },
  Kurzeme: { taxes_paid: 1100, budget_received: 1250 },
  Zemgale: { taxes_paid: 850, budget_received: 980 },
  Vidzeme: { taxes_paid: 780, budget_received: 920 },
  Latgale: { taxes_paid: 620, budget_received: 1050 },
};

function nearestArea(lat: number, lng: number): LatviaArea {
  const entries = Object.entries(REGION_CENTERS) as Array<[LatviaArea, [number, number]]>;
  let best: LatviaArea = entries[0][0];
  let minDist = Number.POSITIVE_INFINITY;
  entries.forEach(([area, [aLat, aLng]]) => {
    const d = (aLat - lat) ** 2 + (aLng - lng) ** 2;
    if (d < minDist) {
      minDist = d;
      best = area;
    }
  });
  return best;
}

function toLatLngBoundsCenter(layer: L.Layer): L.LatLng | null {
  const polygon = layer as L.Polygon;
  if (typeof polygon.getBounds === 'function') {
    return polygon.getBounds().getCenter();
  }
  return null;
}

export function InteractiveLatviaMap() {
  const { locale, t } = useI18n();
  const { activeScenario } = useAppStore();
  const [selectedArea, setSelectedArea] = useState<LatviaArea | null>(null);
  const [selectedMunicipality, setSelectedMunicipality] = useState<string | null>(null);
  const [municipalityData, setMunicipalityData] = useState<any>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const municipalityLayerRef = useRef<L.LayerGroup | null>(null);

  const year1Impacts = activeScenario
    ? activeScenario.regional_area_impacts.filter(r => r.year === 1)
    : null;

  const impactByArea = useMemo(() => {
    const entries = (year1Impacts ?? []).map(impact => [impact.area, impact] as const);
    return Object.fromEntries(entries);
  }, [year1Impacts]);

  useEffect(() => {
    let cancelled = false;
    fetch('/latvia-municipalities.geojson')
      .then(res => res.json())
      .then(data => {
        if (!cancelled) setMunicipalityData(data);
      })
      .catch(() => {
        if (!cancelled) setMunicipalityData(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [56.95, 24.25],
      zoom: 7,
      zoomSnap: 0.1,
      zoomDelta: 0.1,
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      touchZoom: false,
      dragging: false,
    });

    municipalityLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      municipalityLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !municipalityLayerRef.current) {
      return;
    }

    municipalityLayerRef.current.clearLayers();

    if (municipalityData?.features && Array.isArray(municipalityData.features)) {
      const municipalities = L.geoJSON(municipalityData, {
        style: (feature) => {
          if (!feature) {
            return { color: '#ffffff', weight: 1, fillColor: IMPACT_COLORS.neutral, fillOpacity: 0.75 };
          }
          const probeLayer = L.geoJSON(feature as any);
          const center = probeLayer.getBounds().getCenter();
          const area = nearestArea(center.lat, center.lng);
          const impact = impactByArea[area];
          return {
            color: '#ffffff',
            weight: 1,
            fillColor: impact ? IMPACT_COLORS[impact.direction] : IMPACT_COLORS.neutral,
            fillOpacity: 0.8,
          };
        },
        onEachFeature: (feature, layer) => {
          const center = toLatLngBoundsCenter(layer);
          if (!center) return;
          const area = nearestArea(center.lat, center.lng);
          const impact = impactByArea[area];
          const municipality = String((feature.properties as any)?.shapeName ?? 'Municipality');
          const areaLabel = locale === 'lv' ? AREA_LABELS[area].lv : AREA_LABELS[area].en;

          const impactText = impact
            ? `${t('horizon.gdp')}: ${impact.gdp_real_pct > 0 ? '+' : ''}${impact.gdp_real_pct}%<br/>${t('regionalMap.jobs')}: ${impact.employment_jobs > 0 ? '+' : ''}${impact.employment_jobs.toLocaleString()}`
            : locale === 'lv'
              ? 'Nav pašvaldību līmeņa scenārija datu'
              : 'No municipality-level scenario data';

          layer.bindPopup(`
            <div style="font-size:12px;line-height:1.45;min-width:180px">
              <strong>${municipality}</strong><br/>
              ${locale === 'lv' ? 'Reģions' : 'Region'}: ${areaLabel}<br/>
              ${t('regionalMap.scenarioImpactYear1')}:<br/>
              ${impactText}
            </div>
          `);

          layer.on('click', () => {
            setSelectedArea(area);
            setSelectedMunicipality(municipality);
          });
        },
      });

      municipalityLayerRef.current.addLayer(municipalities);
      const bounds = municipalities.getBounds();
      if (bounds.isValid()) {
        mapRef.current.fitBounds(bounds, { padding: [12, 12] });
        mapRef.current.setZoom(mapRef.current.getZoom() + 0.6);
      }
    }
  }, [impactByArea, locale, municipalityData, t]);

  return (
    <Card className="p-4 h-full">
      <div className="flex flex-wrap items-end justify-between gap-2 mb-3">
        <div>
          <h3 className="text-sm font-semibold">{t('map.title')}</h3>
          <p className="text-xs text-muted-foreground">{t('map.subtitle')}</p>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden bg-muted/30 mb-4">
        <div ref={mapContainerRef} className="h-[560px] w-full" />
      </div>

      {selectedArea && (
        <Card className="p-3 bg-muted/50 mb-4">
          <p className="text-xs font-semibold mb-2">
            {selectedMunicipality ? `${selectedMunicipality} • ` : ''}
            {t('regionalMap.fiscalDetail', { area: locale === 'lv' ? AREA_LABELS[selectedArea].lv : AREA_LABELS[selectedArea].en })}
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-muted-foreground">{t('regionalMap.taxesPaid')}</p>
              <p className="font-mono font-semibold">€{DEFAULT_FISCAL[selectedArea].taxes_paid}M</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t('regionalMap.budgetReceived')}</p>
              <p className="font-mono font-semibold">€{DEFAULT_FISCAL[selectedArea].budget_received}M</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t('regionalMap.fiscalBalance')}</p>
              <p className="font-mono font-semibold">
                {DEFAULT_FISCAL[selectedArea].budget_received - DEFAULT_FISCAL[selectedArea].taxes_paid >= 0 ? '+' : ''}
                €
                {DEFAULT_FISCAL[selectedArea].budget_received - DEFAULT_FISCAL[selectedArea].taxes_paid}
                M
              </p>
            </div>
            {year1Impacts && (() => {
              const imp = year1Impacts.find(r => r.area === selectedArea);
              if (!imp) return null;
              return (
                <div>
                  <p className="text-muted-foreground">{t('regionalMap.scenarioImpactYear1')}</p>
                  <p className={`font-mono font-semibold ${imp.employment_jobs >= 0 ? 'text-positive' : 'text-negative'}`}>
                    {imp.employment_jobs > 0 ? '+' : ''}{imp.employment_jobs.toLocaleString()} {t('regionalMap.jobs')}
                  </p>
                </div>
              );
            })()}
          </div>
        </Card>
      )}

      <div className="mt-2 flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>{t('map.legend.positive')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span>{t('map.legend.negative')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-gray-500" />
          <span>{t('map.legend.neutral')}</span>
        </div>
      </div>

      <p className="mt-2 text-[11px] text-muted-foreground">
        {t('map.source')}: geoBoundaries (ADM1, Latvia municipalities)
      </p>
    </Card>
  );
}
