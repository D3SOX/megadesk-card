# Megadesk Card

Based on [linak-desk-card](https://github.com/IhorSyerkov/linak-desk-card) by [@IhorSyerkov](https://github.com/IhorSyerkov)

[![hacs][hacs-image]][hacs-url]

> [Home Assistant][home-assistant] Lovelace Card for controlling desks based on megadesk controller.

![megadesk-card_preview](https://github.com/user-attachments/assets/ab75eaca-7cb0-4890-98dd-7231965522a1)

Designed to work with [Megadesk Companion](https://github.com/gcormier/megadesk_companion/)

> [!TIP]
> I provide an [enhanced ESPHome configuration](https://github.com/D3SOX/megadesk/blob/master/esphome%2Fmegadesk-companion-enhanced.yaml)
>
> I did not test it again with the stock config. Please open an issue if it doesn't work.

## Installation

This card is not yet available in the [HACS][hacs] default store, but you can install it via HACS as a custom repository.

### Install via HACS (recommended)

1. In Home Assistant, go to HACS → three‑dot menu → Custom repositories
2. Add repository URL: `https://github.com/D3SOX/megadesk-card`
3. Set Category: `Dashboard (plugin)`
4. Search for "Megadesk Card" under HACS → Frontend and install
5. The resource should be added automatically. If not, add it manually: `Settings` → `Dashboards` → `Resources` → `Add resource`
   - URL: `/hacsfiles/megadesk-card/megadesk-card.js`
   - Type: `JavaScript module`

### Manual installation (alternative)

1. Download `megadesk-card.js` from [Releases](https://github.com/D3SOX/megadesk-card/releases)
2. Copy it to `www/community/megadesk-card/megadesk-card.js` in your Home Assistant config folder
3. Add a Lovelace resource: `Settings` → `Dashboards` → `Resources` → `Add resource`
   - URL: `/local/community/megadesk-card/megadesk-card.js`
   - Type: `JavaScript module`

## Configuration

This is an example config using the default entity IDs from [my ESPHome config](https://github.com/D3SOX/megadesk/blob/master/esphome%2Fmegadesk-companion-enhanced.yaml). You might wanna check if out to get the most functionality out of this

```yaml
type: 'custom:megadesk-card'
name: 'Megadesk Controller'
desk: cover.megadesk_controls
height_sensor: sensor.megadesk_current_height
height_number_entity: number.megadesk_height_cm  # Optional - for direct height control
connection_sensor: binary_sensor.megadesk_in_network  # Optional - for connection status (For example with the Ping integration)
moving_sensor: binary_sensor.megadesk_moving  # Optional
min_height: 58.42  # Optional, default: 58.42
max_height: 119.38  # Optional, default: 119.38
presets:
  - label: Standing
    target: 108.5
  - label: Sitting
    target: 76.2
```

## Features

- **Continuous Movement**: Hold the up/down buttons for continuous desk movement - no need to repeatedly press buttons
- **Direct Height Control**: Optionally use a number entity for precise height control via presets
- **Visual Height Display**: Real-time height display with animated desk visualization
- **Preset Buttons**: Quick access to your favorite desk positions
- **Touch & Mouse Support**: Works with both touch devices and desktop browsers

## Options

| Name               | Type    | Requirement  | Description                                 | Default             |
| ------------------ | ------- | ------------ | ------------------------------------------- | ------------------- |
| `type`             | `string`| **Required** | `custom:megadesk-card`                      |                     |
| `name`             | `string`| **Optional** | Card name                                   | `` .                |
| `desk`             | `string`| **Required** | Home Assistant entity ID (cover).           | `none`              |
| `height_sensor`    | `string`| **Required** | Home Assistant entity ID (sensor) - absolute height in cm. | `none`              |
| `height_number_entity` | `string`| **Optional** | Home Assistant number entity ID for direct height control. | `none`              |
| `connection_sensor`    | `string`| **Optional** | Home Assistant entity ID (binary_sensor) for connection status. If provided, the card will show a connection indicator and display an error if the desk is not connected. | `none`              |
| `moving_sensor`    | `string`| **Optional** | Home Assistant entity ID (binary_sensor).   | `none`              |
| `min_height`       | `number`| **Optional** | Desk height in minimum position (cm).       | `58.42`             |
| `max_height`       | `number`| **Optional** | Desk height in maximum position (cm).       | `119.38`            |
| `presets`          | `Array` | **Optional** | Predefined presets                          | `[]`                |

### `preset` object

| Name        |   Type   | Description             |
| ----------- | :------: | ----------------------- |
| `label`     | `string` | Preset label.           |
| `target`    | `number` | Absolute height in cm   |

## Key Differences from Linak Desk Card

This card is specifically designed for Megadesk controllers and differs from the original Linak desk card in several important ways:

- **Absolute Height Sensors**: Uses absolute height values in centimeters directly from the sensor, instead of relative height calculations
- **Optional Sensors**: Connection and moving sensors are optional, making the card work even with minimal sensor configurations
- **Default Heights**: Comes with sensible defaults for Megadesk height ranges (58.42cm - 119.38cm)
- **Simplified Configuration**: No need to calculate relative heights or manage complex sensor dependencies

## Supported languages

This card supports translations. Please, help to add more translations and improve existing ones. Here's a list of supported languages:

- English

## Supported models

- Any desk with Megadesk controller
- Compatible with [my ESPHome Megadesk companion configuration](https://github.com/D3SOX/megadesk/blob/master/esphome%2Fmegadesk-companion-enhanced.yaml)

## References

- Based on [linak-desk-card](https://github.com/IhorSyerkov/linak-desk-card)
- Designed for [Megadesk Companion](https://github.com/gcormier/megadesk_companion/)

## License

MIT ©

[home-assistant]: https://www.home-assistant.io/
[hacs]: https://hacs.xyz
[hacs-url]: https://github.com/hacs/integration
[hacs-image]: https://img.shields.io/badge/hacs-default-orange.svg?style=flat-square
