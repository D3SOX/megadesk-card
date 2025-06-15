import { LovelaceCard, LovelaceCardConfig, LovelaceCardEditor } from 'custom-card-helpers';

declare global {
  interface HTMLElementTagNameMap {
    'megadesk-card-editor': LovelaceCardEditor;
    'hui-error-card': LovelaceCard;
  }
  interface Window {
    customCards?: CustomCardInfo[];
  }
}

export interface CustomCardInfo {
  type: string;
  description: string;
  name: string;
  preview?: boolean;
}

export interface PresetConfig {
  target: number;
  label: string;
}

export interface MegadeskCardConfig extends LovelaceCardConfig {
  name?: string;
  desk: string;
  moving_sensor?: string;
  height_sensor: string;
  height_number_entity?: string;
  connection_sensor?: string;
  max_height?: number;
  min_height?: number;
  presets?: PresetConfig[];
}

// Event types for better type safety
export interface ConfigChangedEvent extends CustomEvent {
  detail: {
    config: MegadeskCardConfig;
  };
}

export interface ValueChangedEvent extends CustomEvent {
  detail: {
    value: string | number;
  };
  target: HTMLElement & {
    configValue?: string;
    configType?: string;
    value: string;
  };
}

export interface PresetChangedEvent extends CustomEvent {
  target: HTMLElement & {
    configType?: string;
    value: string;
    presetIndex: number;
    presetValue: string;
  };
}

// Constants
export const DEFAULT_MIN_HEIGHT = 58.42;
export const DEFAULT_MAX_HEIGHT = 119.38;
export const MOVEMENT_COMMAND_INTERVAL = 100;
export const MOVEMENT_INITIAL_DELAY = 500;
