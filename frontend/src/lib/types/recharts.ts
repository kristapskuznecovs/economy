/**
 * Type definitions for custom Recharts components
 */

export interface SankeyNodeProps {
  x: number;
  y: number;
  width: number;
  height: number;
  index: number;
  payload: {
    name: string;
    value?: number;
    [key: string]: unknown;
  };
  containerWidth: number;
}

export interface SankeyLinkProps {
  sourceX: number;
  targetX: number;
  sourceY: number;
  targetY: number;
  sourceControlX: number;
  targetControlX: number;
  linkWidth: number;
  index: number;
}

export interface SankeyTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: {
      name?: string;
      value?: number;
      payload?: {
        name?: string;
        [key: string]: unknown;
      };
      [key: string]: unknown;
    };
  }>;
}
