import {
  LitElement,
  html,
  customElement,
  property,
  TemplateResult,
  CSSResult,
  css,
  state,
} from 'lit-element';
import { HomeAssistant, LovelaceCardEditor } from 'custom-card-helpers';
import type { MegadeskCardConfig } from './types';
import { localize } from './localize/localize';

@customElement('megadesk-card-editor')
export class MegadeskCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) 
  public hass?: HomeAssistant;

  @state() 
  private _config!: MegadeskCardConfig;

  @state() 
  private _helpers?: unknown;

  private _initialized = false;

  public setConfig(config: MegadeskCardConfig): void {
    this._config = { 
      presets: [],
      ...config 
    };
    this.loadCardHelpers();
  }

  protected shouldUpdate(): boolean {
    if (!this._initialized) {
      this._initialize();
    }
    return true;
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._helpers) {
      return html`<div>Loading...</div>`;
    }

    const entities = this.hass.states;
    const covers = Object.keys(entities).filter(eid => eid.startsWith('cover.'));
    const binarySensors = Object.keys(entities).filter(eid => eid.startsWith('binary_sensor.'));
    const sensors = Object.keys(entities).filter(eid => eid.startsWith('sensor.'));
    const numbers = Object.keys(entities).filter(eid => eid.startsWith('number.'));

    return html`
      <div class="card-config">
        <div class="option">
          <ha-textfield
            label=${localize('editor.name')}
            .value=${this._config.name || ''}
            .configValue=${'name'}
            @input=${this._valueChanged}
          ></ha-textfield>
        </div>
        
        <div class="option">
          <ha-select
            label=${localize('editor.desk')}
            .value=${this._config.desk || ''}
            .configValue=${'desk'}
            @selected=${this._valueChanged}
            @closed=${(e) => e.stopPropagation()}
          >
            ${covers.map(entity => html`
              <mwc-list-item .value=${entity}>${entity}</mwc-list-item>
            `)}
          </ha-select>
        </div>
        
        <div class="option">
          <ha-select
            label=${localize('editor.height_sensor')}
            .value=${this._config.height_sensor || ''}
            .configValue=${'height_sensor'}
            @selected=${this._valueChanged}
            @closed=${(e) => e.stopPropagation()}
          >
            ${sensors.map(entity => html`
              <mwc-list-item .value=${entity}>${entity}</mwc-list-item>
            `)}
          </ha-select>
        </div>
        
        <div class="option">
          <ha-select
            label=${localize('editor.height_number_entity')}
            .value=${this._config.height_number_entity || ''}
            .configValue=${'height_number_entity'}
            @selected=${this._valueChanged}
            @closed=${(e) => e.stopPropagation()}
          >
            <mwc-list-item .value=${''}>${localize('editor.none')}</mwc-list-item>
            ${numbers.map(entity => html`
              <mwc-list-item .value=${entity}>${entity}</mwc-list-item>
            `)}
          </ha-select>
        </div>
        
        <div class="option">
          <ha-select
            label=${localize('editor.connection_sensor')}
            .value=${this._config.connection_sensor || ''}
            .configValue=${'connection_sensor'}
            @selected=${this._valueChanged}
            @closed=${(e) => e.stopPropagation()}
          >
            <mwc-list-item .value=${''}>${localize('editor.none')}</mwc-list-item>
            ${binarySensors.map(entity => html`
              <mwc-list-item .value=${entity}>${entity}</mwc-list-item>
            `)}
          </ha-select>
        </div>
        
        <div class="option">
          <ha-select
            label=${localize('editor.moving_sensor')}
            .value=${this._config.moving_sensor || ''}
            .configValue=${'moving_sensor'}
            @selected=${this._valueChanged}
            @closed=${(e) => e.stopPropagation()}
          >
            <mwc-list-item .value=${''}>${localize('editor.none')}</mwc-list-item>
            ${binarySensors.map(entity => html`
              <mwc-list-item .value=${entity}>${entity}</mwc-list-item>
            `)}
          </ha-select>
        </div>
        
        <div class="option">
          <ha-textfield
            label="${localize('editor.min_height')} (Default: 58.42)"
            .value=${this._config.min_height?.toString() || '58.42'}
            type="number"
            step="0.1"
            min="30"
            max="200"
            .configType=${'number'}
            .configValue=${'min_height'}
            @input=${this._valueChanged}
          ></ha-textfield>
          <ha-textfield
            label="${localize('editor.max_height')} (Default: 119.38)"
            .value=${this._config.max_height?.toString() || '119.38'}
            type="number"
            step="0.1"
            min="30"
            max="200"
            .configType=${'number'}
            .configValue=${'max_height'}
            @input=${this._valueChanged}
          ></ha-textfield>
        </div>
        
        <h4>${localize('editor.presets')}</h4>
        <div class="option">
          ${(this._config.presets || []).map((preset, index) => html`
            <div class="preset">
              <ha-textfield
                label="Label"
                .value=${preset.label || ''}
                .presetValue=${'label'}
                .presetIndex=${index}
                @input=${this._presetChanged}
              ></ha-textfield>
              <ha-textfield
                label="Height (cm)"
                .value=${preset.target?.toString() || '70'}
                type="number"
                step="0.1"
                min="30"
                max="200"
                .presetValue=${'target'}
                .presetIndex=${index}
                .configType=${'number'}
                @input=${this._presetChanged}
              ></ha-textfield>
              <ha-icon 
                icon="mdi:close" 
                .presetIndex=${index} 
                @click=${this._removePreset}
                class="remove-preset"
              ></ha-icon>  
            </div>
          `)}
          <div class="add-preset" @click=${this._addPreset}>
            <ha-icon icon="mdi:plus"></ha-icon>
            <span>Add Preset</span>
          </div>
        </div>
      </div>
    `;
  }

  private _initialize(): void {
    if (!this.hass || !this._config || !this._helpers) {
      return;
    }
    this._initialized = true;
  }

  private _presetChanged(event: any): void {
    const target = event.target || event.detail?.target;
    if (!target || (!target.presetIndex && target.presetIndex !== 0)) {
      return;
    }

    // Handle input events
    let value = target.value;
    if (event.type === 'input') {
      value = event.target.value;
    }

    value = target.configType === 'number' 
      ? Math.max(30, Math.min(200, parseFloat(value) || 0))
      : value;

    const presets = [...(this._config.presets || [])];
    if (presets[target.presetIndex]) {
      presets[target.presetIndex] = {
        ...presets[target.presetIndex],
        [target.presetValue]: value
      };
      
      this._config = { ...this._config, presets };
      this._fireConfigChangeEvent();
    }
  }

  private _fireConfigChangeEvent(): void {
    this.dispatchEvent(new CustomEvent('config-changed', { 
      detail: { config: this._config },
      bubbles: true,
      composed: true
    }));
  }
  
  private async loadCardHelpers(): Promise<void> {
    try {
      this._helpers = await (window as any).loadCardHelpers();
    } catch (error) {
      console.error('Failed to load card helpers:', error);
    }
  }

  private _valueChanged(event: any): void {
    if (!this._config || !this.hass) {
      return;
    }

    const target = event.target || event.detail?.target;
    const configValue = target?.configValue;
    
    if (!configValue) {
      return;
    }

    let value: string | number = target.value;

    // Handle ha-select selections
    if (event.type === 'selected') {
      value = event.target.value;
    }

    // Handle input events from ha-textfield
    if (event.type === 'input') {
      value = event.target.value;
    }

    // Don't update if value hasn't changed
    if (this._config[configValue as keyof MegadeskCardConfig] === value) {
      return;
    }

    if (target.configType === 'number') {
      const numValue = parseFloat(value as string);
      value = isNaN(numValue) ? 0 : numValue;
      
      // Validate height ranges
      if (configValue === 'min_height' || configValue === 'max_height') {
        value = Math.max(30, Math.min(200, value));
      }
    }

    this._config = { ...this._config, [configValue]: value };
    this._fireConfigChangeEvent();
  }

  private _addPreset(): void {
    const presets = [...(this._config.presets || [])];
    presets.push({ 
      label: `Preset ${presets.length + 1}`, 
      target: 70 
    });
    
    this._config = { ...this._config, presets };
    this._fireConfigChangeEvent();
  }

  private _removePreset(event: Event): void {
    const target = event.target as HTMLElement & { presetIndex: number };
    if (target.presetIndex === undefined) {
      return;
    }
    
    const presets = [...(this._config.presets || [])];
    presets.splice(target.presetIndex, 1);
    
    this._config = { ...this._config, presets };
    this._fireConfigChangeEvent();
  }

  static get styles(): CSSResult {
    return css`
      .card-config {
        padding: 16px;
      }
      
      .option {
        padding: 8px 0;
      }
      
      .option paper-input,
      .option ha-textfield {
        width: 100%;
      }
      
      .option ha-select {
        width: 100%;
      }
      
      h4 {
        margin: 16px 0 8px 0;
        color: var(--primary-text-color);
      }
      
      .preset {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
      }
      
      .preset paper-input,
      .preset ha-textfield {
        flex: 1;
      }
      
      .preset .remove-preset {
        cursor: pointer;
        color: var(--error-color);
        --mdc-icon-size: 20px;
      }
      
      .preset .remove-preset:hover {
        color: var(--error-color);
        opacity: 0.7;
      }
      
      .add-preset {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        color: var(--primary-color);
        margin-top: 8px;
      }
      
      .add-preset:hover {
        opacity: 0.7;
      }
      
      .add-preset ha-icon {
        --mdc-icon-size: 20px;
      }
    `;
  }
}
