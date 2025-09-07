# Changelog

## [Unreleased]

### Added
- Telegram Web App integration.
- `useTelegram` hook to interact with the Telegram Web App API.
- `TelegramActions` component for Telegram-specific actions.
- Telegram-specific styles.

### Changed
- Sharing in Telegram now uses the Web Share API to send the image file directly, instead of a link.
- The Telegram action buttons are now displayed in a persistent banner at the bottom of the screen.
- Updated `App.tsx` to integrate Telegram functionality.
- Updated `index.html` to include the Telegram Web App SDK.
- Moved new files to the `lib` directory for better organization.

### Fixed
- The text outline is now correctly rendered behind the text fill.
- The canvas area now resizes to the full dimensions of the base image, preventing the image from being cropped in the UI and in downloaded/shared files.

### Removed
- Removed the "Send to Channel" button from the Telegram actions.
- Removed the unused `/api/upload.ts` endpoint and `@vercel/blob` dependency.

### Known Issues
- `@types/telegram-web-app` could not be installed due to an unsupported platform issue. This might affect development, but the app should still function correctly.