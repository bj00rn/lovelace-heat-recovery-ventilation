/* eslint-disable @typescript-eslint/no-explicit-any */
import { LitElement, html, TemplateResult, css, PropertyValues, CSSResultGroup, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators';
import {
  HomeAssistant,
  hasConfigOrEntityChanged,
  hasAction,
  ActionHandlerEvent,
  handleAction,
  LovelaceCardEditor,
  getLovelace,
} from 'custom-card-helpers'; // This is a community maintained npm module with common helper functions/types. https://github.com/custom-cards/custom-card-helpers

import type { BoilerplateCardConfig } from './types';
import { actionHandler } from './action-handler-directive';
import { CARD_VERSION } from './const';
import { localize } from './localize/localize';
import background from './assets/comfoair_heat.png';

/* eslint no-console: 0 */
console.info(
  `%c  BOILERPLATE-CARD \n%c  ${localize('common.version')} ${CARD_VERSION}    `,
  'color: orange; font-weight: bold; background: black',
  'color: white; font-weight: bold; background: dimgray',
);

// This puts your card into the UI card picker dialog
(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: 'boilerplate-card',
  name: 'Boilerplate Card',
  description: 'A template custom card for you to create something awesome',
});

// TODO Name your custom element
@customElement('boilerplate-card')
export class BoilerplateCard extends LitElement {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import('./editor');
    return document.createElement('boilerplate-card-editor');
  }

  public static getStubConfig(): Record<string, unknown> {
    return {};
  }

  // TODO Add any properities that should cause your element to re-render here
  // https://lit.dev/docs/components/properties/
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private config!: BoilerplateCardConfig;

  // https://lit.dev/docs/components/properties/#accessors-custom
  public setConfig(config: BoilerplateCardConfig): void {
    // TODO Check for required fields and that they are of the proper format
    if (!config) {
      throw new Error(localize('common.invalid_configuration'));
    }

    if (config.test_gui) {
      getLovelace().setEditMode(true);
    }
    this.config = {
      name: 'Boilerplate',
      ...config,
    };
  }

  // https://lit.dev/docs/components/lifecycle/#reactive-update-cycle-performing
  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (!this.config) {
      return false;
    }

    return hasConfigOrEntityChanged(this, changedProps, false);
  }

  protected _getData(e, t) {
    return void 0 === e ||
      'object' != typeof e ||
      void 0 === t ||
      'object' == typeof t ||
      void 0 === e[t] ||
      null === e[t]
      ? ''
      : e[t].state;
  }

  protected __getData() {
    const { config } = this
    const states = this.hass.states
    const sensors =  {
      temperature: this._getData(states, config['temperature']),
      temperature_preset: 'Eco',
      fan_preset: 'Home',
      preheat: this._getData(states, config['preheat']),
      air_temperature_intake: this._getData(states, config['air_temperature_intake']),
      air_temperature_extract: this._getData(states, config['air_temperature_extract']),
      air_temperature_supply: this._getData(states, config['air_temperature_supply']),
      air_temperature_exhaust: this._getData(states, config['air_temperature_exhaust']),
      filterstatus: this._getData(states, config['filterstatus']),
      bypass_valve: this._getData(states, config['bypass_valve']),
      summer_mode: this._getData(states, config['summer_mode']),
      fan_speed_supply: this._getData(states, config['fan_speed_supply']),
      fan_speed_exhaust: this._getData(states, config['fan_speed_exhaust']),
      extract_air_level: this._getData(states, config['extract_air_level']),
      supply_air_level: this._getData(states, config['supply_air_level']),
    }

    const fan_presets = config.fan_presets.map(preset => ({ ...preset, state: this._getData(states, preset.sensor) == preset.on_state}))

    return {
      ...sensors,
      fan_presets,
    }
  }


  _getFanPresetTmpl() {
    const data = this.__getData()
    return data.fan_presets.map(preset => html`<ha-icon-button record=${preset} role="button" @action=${this._handleFanAction(preset)}
    .actionHandler=${actionHandler({
      hasHold: hasAction(this.config.hold_action),
      hasDoubleClick: hasAction(this.config.double_tap_action),
    })}><ha-icon icon=${preset.icon}></ha-icon></ha-icon-button>`)
  }


  _handleFanAction = (preset) => (e) => {
    debugger
    console.log('Fan Action'), console.log(e, preset);
    const action = preset.state ? preset.off_action : preset.on_action
    const [domain, service] = action.service.split('.')
    const payload = action.payload
    console.log(this.hass.callService(domain, service, payload));
  }

  _getFanTmpl() {
    return parseInt( this._getData(this.hass.states, this.config.fan_speed_supply).state) > 0
      ? html`<ha-icon icon="mdi:fan"></ha-icon>`
      : html`<ha-icon class="inactive" icon="mdi:fan"></ha-icon>`;
  }
  _getAirFilterTmpl() {
    const {filterstatus} = this.__getData()
    return 'on' != filterstatus
      ? html`<ha-icon class="inactive" icon="mdi:air-filter"></ha-icon>`
      : html`<ha-icon class="warning" icon="mdi:air-filter"></ha-icon>`;
  }
  _getBypassTmpl() {
    const { bypass_valve } = this.__getData()
    return 'on' == bypass_valve
      ? html`<ha-icon icon="mdi:electric-switch"></ha-icon>`
      : html`<ha-icon class="inactive" icon="mdi:electric-switch"></ha-icon>`;
  }
  _getPreHeatTmpl() {
    const { preheat } = this.__getData()
    return 'on' == preheat
      ? html`<ha-icon icon="mdi:radiator"></ha-icon>`
      : html`<ha-icon class="inactive" icon="mdi:radiator"></ha-icon>`;
  }
  _getSummerModeTmpl() {
    const { summer_mode } = this.__getData()
    return 'off' == summer_mode
      ? html`<ha-icon icon="mdi:snowflake"></ha-icon>`
      : html`<ha-icon class="inactive" icon="mdi:weather-sunny"></ha-icon>`;
  }

  // https://lit.dev/docs/components/rendering/
  protected render(): TemplateResult | void {
    // TODO Check for stateObj or other necessary things and render a warning if missing
    if (this.config.show_warning) {
      return this._showWarning(localize('common.show_warning'));
    }

    if (this.config.show_error) {
      return this._showError(localize('common.show_error'));
    }


    const data = this.__getData()

    return html`
      <ha-card
        .header=${this.config.name}
        tabindex="0"
        .label=${`Boilerplate: ${this.config.entity || 'No Entity Defined'}`}
      >
      <div class="container">
          <div class="bg">
              <div class="flex-container">
                  <div class="flex-col-out">
                      <div>${data.air_temperature_intake}°C</div>
                      <div class="fan-state"><ha-icon icon="mdi:speedometer"></ha-icon></ha-icon>${
                        this._getData(this.hass.states, this.config.fan_speed_supply).state
                      } rpm</div>
                      <div>${data.air_temperature_exhaust}°C</div>
                      <div class="fan-state"><ha-icon icon="mdi:speedometer"></ha-icon> ${
                        data.fan_speed_exhaust
                      } rpm</div>
                  </div>
                  <div class="flex-col-main">
                      <div> ${data.temperature} °C</div>
                      <div> ${data.temperature_preset} - ${data.fan_preset}</div>
                      <div>
                        ${this._getFanPresetTmpl()}
                        <ha-icon-button id="ca350_fan3" role="button"
                          @action=${this._handleFanAction}
                          .actionHandler=${actionHandler({
                            hasHold: hasAction(this.config.hold_action),
                            hasDoubleClick: hasAction(this.config.double_tap_action),
                          })}><ha-icon icon="mdi:fan-speed-3"/></ha-icon-button>
                      </div>
                  </div>
                  <div class="flex-col-in">
                      <div>${data.air_temperature_extract}°C</div>
                      <div class="fan-state"><ha-icon icon="mdi:fan" class="spin"></ha-icon> ${
                        data.extract_air_level
                      } %</div>
                      <div>${data.air_temperature_supply}°C</div>
                      <div class="fan-state"><ha-icon icon="mdi:fan" class="spin"></ha-icon> ${
                        data.supply_air_level
                      } %</div>
                  </div>
              </div>
          </div>
        </div>
        <div class="info-row">
          ${this._getFanTmpl()}
          ${this._getAirFilterTmpl()}
          ${this._getBypassTmpl()}
          ${this._getPreHeatTmpl()}
          ${this._getSummerModeTmpl()}
        </div>

    </ha-card>
    `;
  }

  private _handleAction(ev: ActionHandlerEvent): void {
    if (this.hass && this.config && ev.detail.action) {
      handleAction(this, this.hass, this.config, ev.detail.action);
    }
  }

  private _showWarning(warning: string): TemplateResult {
    return html` <hui-warning>${warning}</hui-warning> `;
  }

  private _showError(error: string): TemplateResult {
    const errorCard = document.createElement('hui-error-card');
    errorCard.setConfig({
      type: 'error',
      error,
      origConfig: this.config,
    });

    return html` ${errorCard} `;
  }

  // https://lit.dev/docs/components/styles/
  static get styles(): CSSResultGroup {
    return [css`.container {
      padding: 10px;
    }
      .bg {
        background-image: url(${unsafeCSS(background)});
        height: 200px;
        background-size: contain;
        background-repeat: no-repeat;
        background-position-y: center
      }
      .not-found {
        background-color: yellow;
        font-family: sans-serif;
        font-size: 14px;
        padding: 8px;
      }
      .flex-container {
        display: flex;
        justify-content: space-between;
        height: 100%;
      }
      .flex-col-main {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: 0px;
        font-size: x-large;
        text-align: center;
        font-weight:bold;
      }
      .flex-col-out {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }
      .flex-col-in {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }
      .fan-state {
        padding-top: 15px;
      }
      .spin, .spin ha-svg-icon {
        animation-name: spin;
        animation-duration: 2000ms;
        animation-iteration-count: infinite;
        animation-timing-function: linear;
      }

      .info-row {
        background: rgba(0,0,0,0.2);
        margin-top: 10px;
        padding: 5px;
        border-top: rgba(0,0,0,0.4);
        -webkit-box-shadow: 0px -4px 3px rgba(50, 50, 50, 0.75);
        -moz-box-shadow: 0px -4px 3px rgba(50, 50, 50, 0.75);
        box-shadow: 0px -2.5px 3px rgba(0, 0, 0, 0.4);
        display: flex;
        justify-content: space-around;
      }

      .inactive {
        opacity: 0.7;
      }

      .warning {
        color: #d80707db;
      }

      @keyframes spin {
        from {
          transform:rotate(0deg);
        }
        to {
          transform:rotate(360deg);
        }
      }`];
  }
}
