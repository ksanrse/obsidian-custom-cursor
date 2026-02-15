# Changelog

All notable changes to this project will be documented in this file.

## Unreleased

- Added IME-safe cursor behavior for composition on mobile devices.
- Replaced constant idle polling with event-driven idle scheduling to reduce background CPU usage.
- Adjusted block cursor placement to avoid visual forward offset.
- Limited native caret hiding to editors where the custom cursor is active.
- Added CSS override variables for theme/snippet customization:
  - `--custom-cursor-color-override`
  - `--custom-cursor-width-override`
  - `--custom-cursor-height-override`
  - `--custom-cursor-blink-speed-override`
- Added concise README documentation for power-consumption considerations and CSS variable customization.
- Debounced settings persistence in the settings tab to reduce frequent writes during slider/color changes.
