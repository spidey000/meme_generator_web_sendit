# Changelog

## [Unreleased]

### Added
- Telegram Web App integration.
- `useTelegram` hook to interact with the Telegram Web App API.
- `TelegramActions` component for Telegram-specific actions.
- Telegram-specific styles.
- `measureText` utility for dynamic text dimension calculation.

### Changed
- Sharing in Telegram now uses the Web Share API to send the image file directly, instead of a link.
- The Telegram action buttons are now displayed in a persistent banner at the bottom of the screen.
- Updated `App.tsx` to integrate Telegram functionality.
- Updated `index.html` to include the Telegram Web App SDK.
- Moved new files to the `lib` directory for better organization.
- The "Download" button inside Telegram now uses the Web Share API for native sharing/saving.
- The text layer dimensions now dynamically adjust to fit the text content, preventing cropping.
- Implemented dynamic sizing for text and sticker layers to accommodate advanced effects (outline, glow, shadow) and prevent cropping in the final image.

### Fixed
- The text outline is now correctly rendered behind the text fill.
- The canvas area now resizes to the full dimensions of the base image, preventing the image from being cropped in the UI and in downloaded/shared files.
- Ensured all Telegram-specific UI elements are correctly hidden when not in Telegram's browser.

### Removed
- Removed the "Send to Channel" button from the Telegram actions.
- Removed the unused `/api/upload.ts` endpoint and `@vercel/blob` dependency.

### Known Issues
- `@types/telegram-web-app` could not be installed due to an unsupported platform issue. This might affect development, but the app should still function correctly.
- **Sticker Effects in Exported Image**: Advanced effects (outline, glow, shadow) on stickers might not be fully visible in the final exported image. This is a limitation of the `html2canvas` library's rendering of complex CSS filters (`filter: drop-shadow()`). To ensure these effects are visible, they would need to be pre-rendered or a different image capture solution (e.g., server-side rendering) would be required.
- **Telegram Feature Detection**: The detection of the Telegram browser relies on the presence of `window.Telegram.WebApp`. If Telegram features are visible outside of the Telegram in-app browser, it might be due to a mocked development environment, browser extensions, or caching issues. The detection logic itself is standard.
