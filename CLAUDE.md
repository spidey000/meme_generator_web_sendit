# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production (uses Vite with special flags for CJS compatibility)
- `npm run preview` - Preview production build

## Project Architecture

This is a React-based meme generator application with Telegram Web App integration. The core architecture follows a component-based structure with centralized state management in the main App component.

### Key Architecture Patterns

**State Management**: All application state is managed in `App.tsx` including:
- Base image and dimensions
- Layers (text and stickers) with full positioning, styling, and z-index
- User interactions (move, resize, rotate)
- Telegram Web App state

**Layer System**: The application uses a sophisticated layer system where:
- Text layers support extensive styling (fonts, colors, outlines, shadows, glow effects)
- Sticker layers support aspect ratio locking and similar effects
- All layers are positionable, resizable, rotatable, and reorderable
- Dynamic layer sizing prevents cropping of text/sticker effects

**Component Structure**:
- `App.tsx` - Main component with all state and business logic
- `MemeCanvas.tsx` - Canvas area that renders base image and layers
- `LayerRenderer.tsx` - Individual layer rendering with react-rnd for manipulation
- `Toolbar.tsx` - Main sidebar with layer editing controls
- Various editor components (`TextLayerEditor.tsx`, `StickerLayerEditor.tsx`)
- Gallery components for templates and stickers

**Telegram Integration**: 
- `useTelegram` hook provides Telegram Web App API access
- `TelegramActions` component handles Telegram-specific UI
- Web Share API integration for direct file sharing in Telegram

### Important Technical Details

**Build Configuration**: 
- Uses Vite with path aliases (`@` points to project root)
- Special build flags for CommonJS compatibility (`NPM_CONFIG_OPTIONAL=false`, `VITE_CJS_IGNORE_WARNINGS=true`)
- Environment variables for API keys (GEMINI_API_KEY)

**Dynamic Text Measurement**: The `measureText` utility in `lib/utils/textMeasurement.ts` calculates text dimensions for dynamic layer sizing to prevent effect cropping.

**Layer Effects**: Text and stickers support outline, shadow, and glow effects that require padding calculations. The application uses constants like `TEXT_EFFECTS_HORIZONTAL_PADDING` to ensure proper spacing.

**Rotation System**: Custom rotation implementation using mouse event tracking with `Math.atan2` for angle calculations. Rotation is applied to an inner div to avoid conflicts with react-rnd positioning transforms.

**Image Export**: Uses `html2canvas` to capture the final meme canvas, with special handling for Telegram sharing via Web Share API.

### File Structure

```
/
├── components/           # React components
│   ├── common/          # Reusable UI elements
│   ├── TelegramActions.tsx
│   └── [Component].tsx  # Main feature components
├── lib/                 # Utility libraries
│   ├── hooks/           # Custom React hooks
│   ├── types/           # TypeScript definitions
│   └── utils/           # Utility functions
├── styles/              # CSS files (including telegram.css)
├── App.tsx             # Main application component
├── constants.ts        # App constants and defaults
├── types.ts            # Core TypeScript types
└── vite.config.ts      # Vite configuration
```

### Known Issues

- Sticker effects may not render fully in exported images due to html2canvas limitations with CSS filters
- Telegram types (`@types/telegram-web-app`) cannot be installed on the current platform
- Dynamic layer sizing adds padding to prevent effect cropping
- dont test the website in local. it will be tested in vercel