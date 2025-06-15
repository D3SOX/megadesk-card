import {
  LitElement,
  html,
  customElement,
  property,
  CSSResult,
  TemplateResult,
  css,
  PropertyValues,
  state,
} from 'lit-element';
import { HomeAssistant, LovelaceCardEditor } from 'custom-card-helpers';
import type { 
  MegadeskCardConfig, 
  PresetConfig
} from './types';
import { 
  DEFAULT_MIN_HEIGHT,
  DEFAULT_MAX_HEIGHT,
  MOVEMENT_COMMAND_INTERVAL,
  MOVEMENT_INITIAL_DELAY
} from './types';
import { localize } from './localize/localize';
import { HassEntity } from 'home-assistant-js-websocket';
import tableBottomImg from './table_bottom.png';
import tableMiddleImg from './table_middle.png';
import tableTopImg from './table_top.png';
import './editor';

// Global registration
window.customCards = window.customCards || [];
window.customCards.push({
  preview: true,
  type: 'megadesk-card',
  name: localize('common.name'),
  description: localize('common.description'),
});

@customElement('megadesk-card')
export class MegadeskCard extends LitElement {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    return document.createElement('megadesk-card-editor');
  }

  public static getStubConfig(
    _: HomeAssistant, 
    entities: string[]
  ): Partial<MegadeskCardConfig> {
    const [desk] = entities.filter(
      (eid) => eid.startsWith('cover.') && eid.includes('desk')
    );
    const [height_sensor] = entities.filter(
      (eid) => eid.startsWith('sensor.') && (eid.includes('height') || eid.includes('desk'))
    );
    const [moving_sensor] = entities.filter(
      (eid) => eid.startsWith('binary_sensor.') && eid.includes('moving')
    );

    return {
      desk,
      height_sensor,
      moving_sensor,
      min_height: DEFAULT_MIN_HEIGHT,
      max_height: DEFAULT_MAX_HEIGHT,
      presets: []
    };
  }

  @property({ attribute: false }) 
  public hass!: HomeAssistant;

  @state() 
  private config!: MegadeskCardConfig;

  @state()
  private isMoving = false;

  private moveTimer?: number;

  public setConfig(config: MegadeskCardConfig): void {
    if (!config.desk || !config.height_sensor) {
      throw new Error(localize('common.desk_and_height_required'));
    }

    // Validate height range
    const minHeight = config.min_height ?? DEFAULT_MIN_HEIGHT;
    const maxHeight = config.max_height ?? DEFAULT_MAX_HEIGHT;
    
    if (minHeight >= maxHeight) {
      throw new Error('min_height must be less than max_height');
    }

    // Set default values and validate configuration
    this.config = {
      min_height: minHeight,
      max_height: maxHeight,
      presets: [],
      ...config
    };
  }

  get desk(): HassEntity | undefined {
    return this.hass?.states?.[this.config?.desk];
  }

  get heightEntity(): HassEntity | undefined {
    return this.hass?.states?.[this.config?.height_sensor];
  }

  get height(): number {
    const state = this.heightEntity?.state;
    if (!state || state === 'unavailable' || state === 'unknown') {
      return 0;
    }
    const height = parseFloat(state);
    return isNaN(height) ? 0 : height;
  }

  get moving(): boolean {
    if (!this.config?.moving_sensor) {
      return this.isMoving;
    }
    return this.hass?.states?.[this.config.moving_sensor]?.state === 'on';
  }
  
  get alpha(): number {
    // Calculate position as percentage between min and max height
    const minHeight = this.config?.min_height ?? DEFAULT_MIN_HEIGHT;
    const maxHeight = this.config?.max_height ?? DEFAULT_MAX_HEIGHT;
    return Math.max(0, Math.min(1, (this.height - minHeight) / (maxHeight - minHeight)));
  }

  get isConnected(): boolean {
    if (!this.config?.connection_sensor) {
      return true; // Assume connected if no sensor configured
    }
    return this.hass?.states?.[this.config.connection_sensor]?.state === 'on';
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (!this.config) {
      return false;
    }

    if (changedProps.has('config')) {
      return true;
    }

    const oldHass = changedProps.get('hass') as HomeAssistant | undefined;
    if (!oldHass || oldHass === this.hass) {
      return false;
    }

    // Check if relevant entities have changed
    const relevantEntities = [
      this.config.desk,
      this.config.height_sensor,
      this.config.moving_sensor,
      this.config.connection_sensor
    ].filter((entityId): entityId is string => !!entityId);

    return relevantEntities.some(entityId => 
      oldHass.states[entityId] !== this.hass.states[entityId]
    );
  }

  protected render(): TemplateResult {
    if (!this.config || !this.hass) {
      return html`
        <ha-card>
          <div class="error">
            ${localize('common.invalid_configuration')}
          </div>
        </ha-card>
      `;
    }

    if (!this.isConnected) {
      return html`
        <ha-card .header=${this.config.name}>
          <div class="error">
            Desk not connected
          </div>
        </ha-card>
      `;
    }

    return html`
      <ha-card .header=${this.config.name}>
        ${this.config.connection_sensor ? html`
          <div class="connection">
            ${localize(this.isConnected ? 'status.connected' : 'status.disconnected')}
            <div class="indicator ${this.isConnected ? 'connected' : 'disconnected'}"></div>
          </div>
        ` : html``}
        <div class="preview">
          <img 
            src="${tableTopImg}" 
            alt="Table top"
            style="transform: translateY(${this.calculateOffset(90)}px);" 
          />
          <img 
            src="${tableMiddleImg}" 
            alt="Table middle"
            style="transform: translateY(${this.calculateOffset(60)}px);" 
          />
          <img 
            src="${tableBottomImg}" 
            alt="Table bottom"
          />
          <div 
            class="height" 
            style="transform: translateY(${this.calculateOffset(90)}px);"
          >
            ${this.height.toFixed(1)}
            <span>cm</span>
          </div>
          ${this.renderControls()}
          ${this.renderPresets()}
        </div>
      </ha-card>
    `;
  }

  private renderControls(): TemplateResult {
    const isDisabled = this.moving || !this.desk;
    
    return html`
      <div class="knob">
        <div 
          class="knob-button ${isDisabled ? 'disabled' : ''}" 
          @touchstart=${isDisabled ? undefined : this.goUp}
          @mousedown=${isDisabled ? undefined : this.goUp}
          @touchend=${this.stop}
          @mouseup=${this.stop}
          @touchcancel=${this.stop}
          @mouseleave=${this.stop}
          ?disabled=${isDisabled}
        >
          <ha-icon icon="mdi:chevron-up"></ha-icon>
        </div>
        <div 
          class="knob-button ${isDisabled ? 'disabled' : ''}" 
          @touchstart=${isDisabled ? undefined : this.goDown}
          @mousedown=${isDisabled ? undefined : this.goDown}
          @touchend=${this.stop}
          @mouseup=${this.stop}
          @touchcancel=${this.stop}
          @mouseleave=${this.stop}
          ?disabled=${isDisabled}
        >
          <ha-icon icon="mdi:chevron-down"></ha-icon>
        </div>
      </div>
    `;
  }

  private calculateOffset(maxValue: number): number {
    return Math.round(maxValue * (1.0 - this.alpha));
  }

  private renderPresets(): TemplateResult {
    const presets = this.config?.presets || [];
    if (presets.length === 0) {
      return html``;
    }

    return html`
      <div class="presets">
        ${presets.map(preset => html`
          <paper-button 
            @click="${() => this.handlePreset(preset.target)}"
            ?disabled=${this.moving || !this.desk}
          >
            ${preset.label}
          </paper-button>
        `)} 
      </div>
    `;
  }

  private handlePreset(target: number): void {
    if (!this.config || this.moving || !this.desk) {
      return;
    }

    const minHeight = this.config.min_height ?? DEFAULT_MIN_HEIGHT;
    const maxHeight = this.config.max_height ?? DEFAULT_MAX_HEIGHT;
    
    if (target > maxHeight || target < minHeight) {
      console.warn(`Preset target ${target} is outside valid range [${minHeight}, ${maxHeight}]`);
      return;
    }

    // If height_number_entity is configured, set it directly
    if (this.config.height_number_entity) {
      this.hass.callService('number', 'set_value', {
        entity_id: this.config.height_number_entity,
        value: target
      }).catch(error => {
        console.error('Failed to set height number entity:', error);
      });
      return;
    }

    // Otherwise, use the cover position calculation (original behavior)
    const travelDist = maxHeight - minHeight;
    const positionInPercent = Math.round(((target - minHeight) / travelDist) * 100);

    if (Number.isInteger(positionInPercent)) {
      this.callService('set_cover_position', { position: positionInPercent });
    }
  }

  private goUp = (): void => {
    if (this.isMoving || !this.desk) return;
    
    this.isMoving = true;
    this.callService('open_cover');
    
    // Start continuous movement after initial delay
    this.moveTimer = window.setTimeout(() => {
      this.moveTimer = window.setInterval(() => {
        this.callService('open_cover');
      }, MOVEMENT_COMMAND_INTERVAL);
    }, MOVEMENT_INITIAL_DELAY);
  };

  private goDown = (): void => {
    if (this.isMoving || !this.desk) return;
    
    this.isMoving = true;
    this.callService('close_cover');
    
    // Start continuous movement after initial delay
    this.moveTimer = window.setTimeout(() => {
      this.moveTimer = window.setInterval(() => {
        this.callService('close_cover');
      }, MOVEMENT_COMMAND_INTERVAL);
    }, MOVEMENT_INITIAL_DELAY);
  };

  private stop = (): void => {
    if (this.moveTimer) {
      clearTimeout(this.moveTimer);
      clearInterval(this.moveTimer);
      this.moveTimer = undefined;
    }
    
    if (this.isMoving) {
      this.callService('stop_cover');
      this.isMoving = false;
    }
  };

  private callService(service: string, options: Record<string, unknown> = {}): void {
    if (!this.config?.desk) {
      console.error('No desk entity configured');
      return;
    }

    this.hass.callService('cover', service, {
      entity_id: this.config.desk,
      ...options
    }).catch(error => {
      console.error(`Failed to call service ${service}:`, error);
    });
  }

  static get styles(): CSSResult {
    return css`
      :host {
        display: flex;
        flex: 1;
        flex-direction: column;
      }
      
      ha-card {
        flex-direction: column;
        flex: 1;
        position: relative;
        padding: 0px;
        border-radius: 4px;
        overflow: hidden;
      }
      
      .error {
        padding: 16px;
        text-align: center;
        color: var(--error-color);
        font-weight: bold;
      }
      
      .preview {
        background: linear-gradient(to bottom, var(--primary-color), var(--dark-primary-color));
        overflow: hidden;
        position: relative;
        min-height: 365px;
      }
      
      .preview img {
        position: absolute;
        bottom: 0px;
        transition: all 0.2s linear;
        user-select: none;
        pointer-events: none;
      }
      
      .preview .knob {
        background: #fff;
        position: absolute;
        display: flex;
        flex-direction: column;
        left: 20px;
        bottom: 12px;
        border-radius: 35px;
        width: 50px;
        overflow: hidden;
        height: 120px;
        box-shadow: 0px 0px 36px darkslategrey;
      }
      
      .preview .knob .knob-button {
        display: flex;
        justify-content: center;
        align-items: center;
        flex: 1;
        transition: background-color 0.2s ease;
      }
      
      .preview .knob .knob-button:not(.disabled) {
        cursor: pointer;
      }
      
      .preview .knob .knob-button.disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .preview .knob .knob-button ha-icon {
        color: #030303;
      }
      
      .preview .knob .knob-button:not(.disabled):active {
        background: rgba(0, 0, 0, 0.06);
      }
      
      .height {
        position: absolute;
        left: 30px;
        top: 60px;
        font-size: 32px;
        font-weight: bold;
        transition: all 0.2s linear;
        user-select: none;
      }
      
      .height span {
        opacity: 0.6;
      }
      
      .presets {
        position: absolute;
        display: flex;
        flex-direction: column;
        justify-content: space-around;
        width: 36%;
        min-width: 120px;
        height: 80%;
        right: 5%;
        top: 10%;
      }

      .presets > paper-button {
        height: 40px;
        margin-bottom: 5px;
        background-color: white;
        border-radius: 20px;
        box-shadow: darkslategrey 0px 0px 36px;
        display: flex;
        justify-content: center;
        align-items: center;
        cursor: pointer;
        color: rgb(3, 3, 3);
        font-size: 18px;
        font-weight: 500;
        transition: opacity 0.2s ease;
      }

      .presets > paper-button[disabled] {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .connection {
        position: absolute;
        display: flex;
        align-items: center;
        right: 12px;
        top: 10px;
        color: var(--text-primary-color, #222);
        z-index: 1;
      }
      .connection .indicator {
        margin-left: 10px;
        height: 10px;
        width: 10px;
        border-radius: 50%;
      }
      .indicator.connected {
        background-color: green;
      }
      .indicator.disconnected {
        background-color: red;
      }
    `;
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.stop(); // Clean up any active timers
  }
}
