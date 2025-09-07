# Changelog

## [Unreleased]

### Added
- Telegram Web App integration.
- `useTelegram` hook to interact with the Telegram Web App API.
- `TelegramActions` component for Telegram-specific actions.
- Telegram-specific styles.

### Changed
- Updated `App.tsx` to integrate Telegram functionality.
- Updated `index.html` to include the Telegram Web App SDK.
- Moved new files to the `lib` directory for better organization.

### Fixed
- N/A

### Known Issues
- `@types/telegram-web-app` could not be installed due to an unsupported platform issue. This might affect development, but the app should still function correctly.
