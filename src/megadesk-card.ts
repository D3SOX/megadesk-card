import {
  LitElement,
  html,
  customElement,
  property,
  CSSResult,
  TemplateResult,
  css,
  PropertyValues,
  internalProperty,
} from 'lit-element';
import { HomeAssistant, LovelaceCardEditor } from 'custom-card-helpers';
import type { MegadeskCardConfig } from './types';
import { localize } from './localize/localize';
import { HassEntity } from 'home-assistant-js-websocket';
import tableBottomImg from './table_bottom.png';
import tableMiddleImg from './table_middle.png';
import tableTopImg from './table_top.png';
import './editor';

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

  public static getStubConfig(_: HomeAssistant, entities: string[]): Partial<MegadeskCardConfig> {
      const [desk] = entities.filter((eid) => eid.substr(0, eid.indexOf('.')) === 'cover' && eid.includes('desk'));
      const [height_sensor] = entities.filter((eid) => eid.substr(0, eid.indexOf('.')) === 'sensor' && (eid.includes('height') || eid.includes('desk')));
      const [moving_sensor] = entities.filter((eid) => eid.substr(0, eid.indexOf('.')) === 'binary_sensor' && eid.includes('moving'));
    return {
      desk,
      height_sensor,
      moving_sensor,
      min_height: 58.42,
      max_height: 119.38,
      presets: []
    };
  }

  @property({ attribute: false }) public hass!: HomeAssistant;
  @internalProperty() private config!: MegadeskCardConfig;
  private moveTimer?: number;
  private isMoving = false;

  public setConfig(config: MegadeskCardConfig): void {
    if (!config.desk || !config.height_sensor) {
      throw new Error(localize('common.desk_and_height_required'));
    }

    // Set default min/max heights if not provided (based on our megadesk configuration)
    const defaultConfig = {
      min_height: 58.42,
      max_height: 119.38,
      ...config
    };

    this.config = { ...defaultConfig };
  }

  get desk(): HassEntity {
    return this.hass.states[this.config.desk];
  }

  get height(): number {
    // For megadesk, we get absolute height directly from the sensor
    return parseFloat(this.hass.states[this.config.height_sensor]?.state) || 0;
  }

  get moving(): boolean {
    return this.config.moving_sensor ? 
      this.hass.states[this.config.moving_sensor]?.state === 'on' : false;
  }
  
  get alpha(): number {
    // Calculate position as percentage between min and max height
    const minHeight = this.config.min_height || 58.42;
    const maxHeight = this.config.max_height || 119.38;
    return Math.max(0, Math.min(1, (this.height - minHeight) / (maxHeight - minHeight)));
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (!this.config) {
      return false;
    }

    if (changedProps.has('config')) {
      return true;
    }

    const newHass = changedProps.get('hass') as HomeAssistant | undefined;
    if (newHass) {
      return (
        newHass.states[this.config?.desk] !== this.hass?.states[this.config?.desk]
        || newHass.states[this.config?.height_sensor]?.state !== this.hass?.states[this.config?.height_sensor]?.state
        || (this.config.moving_sensor ? newHass.states[this.config.moving_sensor]?.state !== this.hass?.states[this.config.moving_sensor]?.state : false)
      );
    }
    return true;
  }

  protected render(): TemplateResult | void {
    return html`
      <ha-card .header=${this.config.name}>
        <div class="preview">
          <img src="${tableTopImg}" style="transform: translateY(${this.calculateOffset(90)}px);" />
          <img src="${tableMiddleImg}" style="transform: translateY(${this.calculateOffset(60)}px);" />
          <img src="${tableBottomImg}" />
          <div class="height" style="transform: translateY(${this.calculateOffset(90)}px);">
            ${this.height.toFixed(1)}
            <span>cm</span>
          </div>
          <div class="knob">
            <div class="knob-button" 
                  @touchstart='${this.goUp}' 
                  @mousedown='${this.goUp}' 
                  @touchend='${this.stop}'
                  @mouseup='${this.stop}'>
              <ha-icon icon="mdi:chevron-up"></ha-icon>
            </div>
            <div class="knob-button" 
                  @touchstart=${this.goDown} 
                  @mousedown=${this.goDown} 
                  @touchend=${this.stop}
                  @mouseup=${this.stop}>
              <ha-icon icon="mdi:chevron-down"></ha-icon>
            </div>
          </div>
          ${this.renderPresets()}
        </div>
      </ha-card>
    `;
  }

  calculateOffset(maxValue: number): number {
    return Math.round(maxValue * (1.0 - this.alpha))
  }

  renderPresets(): TemplateResult {
    const presets = this.config.presets || [];

    return html`
        <div class="presets">
          ${presets.map(item => html`
            <paper-button @click="${() => this.handlePreset(item.target)}">
              ${item.label}
            </paper-button>`)} 
        </div>
      `;
  }

  handlePreset(target: number): void {
    const minHeight = this.config.min_height || 58.42;
    const maxHeight = this.config.max_height || 119.38;
    
    if (target > maxHeight || target < minHeight) {
      return;
    }

    // If height_number_entity is configured, set it directly
    if (this.config.height_number_entity) {
      this.hass.callService('number', 'set_value', {
        entity_id: this.config.height_number_entity,
        value: target
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

  private goUp(): void {
    if (this.isMoving) return;
    
    this.isMoving = true;
    this.callService('open_cover');
    
    // Start continuous movement after initial delay
    this.moveTimer = window.setTimeout(() => {
      this.moveTimer = window.setInterval(() => {
        this.callService('open_cover');
      }, 100); // Send command every 100ms while held
    }, 500); // Initial delay of 500ms before continuous movement
  }

  private goDown(): void {
    if (this.isMoving) return;
    
    this.isMoving = true;
    this.callService('close_cover');
    
    // Start continuous movement after initial delay
    this.moveTimer = window.setTimeout(() => {
      this.moveTimer = window.setInterval(() => {
        this.callService('close_cover');
      }, 100); // Send command every 100ms while held
    }, 500); // Initial delay of 500ms before continuous movement
  }

  private stop(): void {
    if (this.moveTimer) {
      clearTimeout(this.moveTimer);
      clearInterval(this.moveTimer);
      this.moveTimer = undefined;
    }
    
    if (this.isMoving) {
      this.callService('stop_cover');
      this.isMoving = false;
    }
  }

  private callService(service, options = {}): void {
    this.hass.callService('cover', service, {
      entity_id: this.config.desk,
      ...options
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
      }
      .preview .knob .knob-button ha-icon {
        color: #030303;
        cursor: pointer;
      }
      .preview .knob .knob-button:active {
        background: rgba(0, 0, 0, 0.06);
      }
      .height {
        position: absolute;
        left: 30px;
        top: 60px;
        font-size: 32px;
        font-weight: bold;
        transition: all 0.2s linear;
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
      }
    `;
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.stop(); // Clean up any active timers
  }
}
