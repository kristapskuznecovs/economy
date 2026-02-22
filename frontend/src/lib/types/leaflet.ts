import type { Feature, GeoJsonProperties, Geometry } from 'geojson';

/**
 * Extended GeoJSON feature with Leaflet-specific properties
 */
export interface LeafletGeoJSONFeature extends Feature {
  properties: GeoJsonProperties & {
    shapeName?: string;
    [key: string]: unknown;
  };
}

/**
 * Type guard to check if a feature has the expected shape
 */
export function isLeafletFeature(feature: unknown): feature is LeafletGeoJSONFeature {
  return (
    typeof feature === 'object' &&
    feature !== null &&
    'type' in feature &&
    feature.type === 'Feature' &&
    'properties' in feature
  );
}
