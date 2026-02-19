import type { CSSProperties } from 'react';
import type { NodeVisualPreset } from '../types';
import { darkenHex } from './colorMapping';

const VALID_PRESETS: NodeVisualPreset[] = ['default', 'bold', 'outline', 'minimal', 'striped'];

function normalizePreset(preset: string | undefined): NodeVisualPreset {
  if (preset === 'filled') return 'bold';
  return VALID_PRESETS.includes(preset as NodeVisualPreset) ? (preset as NodeVisualPreset) : 'default';
}

export interface NodePresetStylesResult {
  style: CSSProperties;
  className: string;
  showLeftStrip: boolean;
}

export function getNodePresetStyles(
  preset: string | undefined,
  accentColor: string,
  borderWidth: number = 2
): NodePresetStylesResult {
  const p = normalizePreset(preset);
  const w = borderWidth ?? 2;

  switch (p) {
    case 'bold':
      return {
        style: {
          borderWidth: w,
          borderStyle: 'solid',
          borderColor: accentColor,
          backgroundColor: darkenHex(accentColor, 0.28),
        },
        className: '',
        showLeftStrip: false,
      };
    case 'outline':
      return {
        style: {
          borderWidth: w,
          borderStyle: 'solid',
          borderColor: accentColor,
        },
        className: 'bg-panel-2',
        showLeftStrip: false,
      };
    case 'minimal':
      return {
        style: {
          borderWidth: w,
          borderStyle: 'solid',
        },
        className: 'border-panel-border bg-panel-2',
        showLeftStrip: false,
      };
    case 'striped': {
      const darkBg = darkenHex(accentColor, 0.15);
      const darkerStripe = darkenHex(accentColor, 0.28);
      return {
        style: {
          borderWidth: w,
          borderStyle: 'solid',
          borderColor: accentColor,
          backgroundImage: `repeating-linear-gradient(-45deg, ${darkBg}, ${darkBg} 4px, ${darkerStripe} 4px, ${darkerStripe} 8px)`,
        },
        className: '',
        showLeftStrip: false,
      };
    }
    case 'default':
    default:
      return {
        style: {
          borderWidth: w,
          borderStyle: 'solid',
        },
        className: 'bg-panel-2 border-panel-border hover:border-control-hover-border hover:shadow-panel',
        showLeftStrip: true,
      };
  }
}
