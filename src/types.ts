import { LovelaceCard, LovelaceCardConfig, LovelaceCardEditor } from 'custom-card-helpers';
declare global {
  interface HTMLElementTagNameMap {
    'megadesk-card-editor': LovelaceCardEditor;
    'hui-error-card': LovelaceCard;
  }
  interface Window {
    customCards?: { 
      type: string;
      description: string;
      name: string; 
      preview?: boolean;
    }[];
  }
}

export interface MegadeskCardConfig extends LovelaceCardConfig {
  name?: string;
  desk: string;
  moving_sensor?: string;
  height_sensor: string;
  height_number_entity?: string;
  max_height?: number;
  min_height?: number;
  presets: {
    target: number;
    label: string;
  }[];
}
