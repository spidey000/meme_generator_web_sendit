# Sendit Meme Generator

## Overview

The Sendit Meme Generator is a dynamic React-based web application that empowers users to create engaging memes. Users can upload a base image, choose from a gallery of popular meme templates, and then enhance their selection by adding customizable text elements and vibrant stickers. The application offers a rich set of tools for manipulating these layers, including moving, resizing, rotating, and managing their order. Styled with a sleek dark theme and neon green accents using Tailwind CSS, it provides an intuitive and visually appealing user experience.

## Features

*   **Base Image Options**:
    *   **Upload Image**: Users can upload any image to serve as the canvas for their meme.
    *   **Meme Template Gallery**: Select from a predefined gallery of popular meme templates.
*   **Text Layers**:
    *   Add multiple text elements.
    *   Customize font family, size, and color.
    *   Apply text outline with adjustable width and color.
    *   Add text shadow with configurable color, blur, and offset.
    *   Include a neon-style glow effect.
*   **Sticker Layers**:
    *   Add stickers from a predefined gallery.
    *   Upload custom sticker images.
*   **Layer Manipulation**:
    *   **Select**: Click to select any layer for editing.
    *   **Move**: Drag layers to any position on the canvas.
    *   **Resize**: Resize layers, with aspect ratio lock for stickers.
    *   **Rotate**: Visually rotate layers using a dedicated handle.
    *   **Ordering**: Bring layers to the front or send them to the back (z-index management).
    *   **Delete**: Remove unwanted layers.
*   **Responsive Design**: Adapts to different screen sizes for a consistent experience.
*   **Meme Export**: Download the final created meme as a JPEG image.
*   **Interactive Toolbar**: Centralized controls for adding and editing layers.
*   **Layer List**: View and select from a list of all active layers.

## Tech Stack

*   **React 19**: For building the user interface.
*   **TypeScript**: For static typing and improved code quality.
*   **Tailwind CSS**: For utility-first styling and rapid UI development.
*   **`react-rnd`**: A library for resizable and draggable components, used for layer manipulation.
*   **`html2canvas` (mocked/used conceptually)**: For capturing the meme canvas as an image for export.

## Getting Started

To run this project locally:

1.  **Clone the repository (if applicable)**
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Run the development server**:
    ```bash
    npm run dev
    ```
    This will typically start the application on `http://localhost:5173` (or another port if specified by Vite).

## Core Functionality & Implementation

### 1. Base Image Setup

Users can either upload their own image or select a template from a gallery.

*   **Uploading an Image (`App.tsx`)**:
    ```typescript
    const [baseImage, setBaseImage] = useState<string | null>(null);
    // ...
    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.files && event.target.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setBaseImage(e.target?.result as string);
          // Reset layers, etc.
        };
        reader.readAsDataURL(event.target.files[0]);
      }
    };
    ```

*   **Choosing from Meme Template Gallery (`App.tsx`, `MemeTemplateGallery.tsx`)**:
    A button opens a modal (`MemeTemplateGallery`) displaying predefined templates.
    ```typescript
    // App.tsx
    const [showMemeTemplateGallery, setShowMemeTemplateGallery] = useState<boolean>(false);
    // ...
    const handleSelectMemeTemplate = (template: MemeTemplateOption) => {
      setBaseImage(template.src);
      // Reset layers, etc.
      setShowMemeTemplateGallery(false);
    };
    // ...
    {showMemeTemplateGallery && (
      <MemeTemplateGallery 
        templates={DEFAULT_MEME_TEMPLATES}
        onSelectTemplate={handleSelectMemeTemplate}
        onClose={() => setShowMemeTemplateGallery(false)}
      />
    )}
    // Button to open gallery:
    <button onClick={() => setShowMemeTemplateGallery(true)}>Templates</button>
    ```
    The `MemeTemplateGallery` component lists `MemeTemplateOption` items from `constants.ts`.

### 2. Adding and Customizing Text Layers

Text layers can be added and styled extensively.

*   **Adding Text (`App.tsx` -> `Toolbar.tsx`)**:
    A new text layer is created with default properties and added to the `layers` state.
    ```typescript
    // App.tsx
    const addNewLayer = useCallback(<T extends LayerType,>(type: T, props: Partial<Layer> = {}) => {
      // ... logic to create newLayer ...
      if (type === LayerType.TEXT) {
        newLayer = {
          ...newLayerBase,
          ...INITIAL_TEXT_LAYER, // Default text styles
          ...relevantOverrides,
          type: LayerType.TEXT,
        } as TextLayerProps;
      }
      // ...
      setLayers(prevLayers => [...prevLayers, newLayer]);
      // ...
    }, [nextZIndex]);

    // Toolbar.tsx - Button to trigger add
    <Button onClick={handleAddText} disabled={!hasBaseImage}>Add Text</Button>
    ```

*   **Text Styling (`TextLayerEditor.tsx`)**:
    The `TextLayerEditor` component provides controls to modify text properties. Changes are propagated via `onUpdateLayer`.
    ```typescript
    // TextLayerEditor.tsx
    <Input
      label="Text Content"
      name="text"
      value={layer.text}
      onChange={handleInputChange}
      // ...
    />
    <Select
      label="Font Family"
      name="fontFamily"
      value={layer.fontFamily}
      onChange={handleInputChange}
      options={DEFAULT_FONTS}
    />
    <ColorInput
      label="Text Color"
      name="color"
      value={layer.color}
      onChange={handleInputChange}
    />
    // ... other inputs for outline, shadow, glow ...
    ```

*   **Rendering Styled Text (`LayerRenderer.tsx`)**:
    The `LayerRenderer` applies these styles to the text element.
    ```typescript
    // LayerRenderer.tsx
    if (layer.type === LayerType.TEXT) {
      const textLayer = layer as TextLayerProps;
      const textStyles: React.CSSProperties = {
        fontFamily: textLayer.fontFamily,
        fontSize: `${textLayer.fontSize}px`,
        color: textLayer.color,
        WebkitTextStroke: `${textLayer.outlineWidth}px ${textLayer.outlineColor}`,
        textShadow: `${textLayer.shadowOffsetX}px ${textLayer.shadowOffsetY}px ${textLayer.shadowBlur}px ${textLayer.shadowColor}`,
        // ... glow logic ...
      };
      return <span style={textStyles}>{textLayer.text}</span>;
    }
    ```

### 3. Adding and Managing Sticker Layers

Stickers can be chosen from a gallery or uploaded by the user.

*   **Adding from Gallery (`StickerGallery.tsx` -> `Toolbar.tsx` -> `App.tsx`)**:
    ```typescript
    // StickerGallery.tsx
    <button onClick={() => onSelectSticker(sticker)}>
      <img src={sticker.src} alt={sticker.alt} />
    </button>

    // Toolbar.tsx
    const handleAddStickerFromGallery = (sticker: StickerOption) => {
      if (!hasBaseImage) return;
      onAddLayer(LayerType.STICKER, { src: sticker.src, alt: sticker.alt, width: 100, height: 100 });
      setShowStickerGallery(false);
    };
    ```

*   **Uploading Custom Stickers (`Toolbar.tsx` -> `App.tsx`)**:
    Similar to base image upload, but creates a sticker layer.
    ```typescript
    // Toolbar.tsx
    const handleAddUploadedSticker = (event: React.ChangeEvent<HTMLInputElement>) => {
      // ... FileReader logic ...
      reader.onload = (e) => {
        onAddLayer(LayerType.STICKER, { 
          src: e.target?.result as string, 
          alt: 'Uploaded Sticker',
          width: 100, height: 100 
        });
      };
      // ...
    };
    ```

### 4. Layer Manipulation

Layers (both text and stickers) can be selected, moved, resized, and rotated.

*   **Selection (`MemeCanvas.tsx`, `LayerRenderer.tsx`)**:
    Clicking on a layer selects it, highlighting it and showing controls. Clicking on the canvas background deselects.
    ```typescript
    // MemeCanvas.tsx - Deselect on canvas click
    <div onClick={(e) => { if (e.target === e.currentTarget) { onSelectLayer(null); } }}>
        {/* ... */}
        <LayerRenderer onSelect={() => onSelectLayer(layer.id)} />
        {/* ... */}
    </div>

    // LayerRenderer.tsx - Select on layer click
    <Rnd onClick={(e) => { e.stopPropagation(); onSelect(); }} />
    ```

*   **Move & Resize (with `react-rnd`) (`LayerRenderer.tsx`)**:
    `react-rnd` handles the drag and resize interactions. Callbacks update the layer's state.
    ```typescript
    // LayerRenderer.tsx
    const handleDragStop: RndProps['onDragStop'] = (_e, d) => {
      onUpdate({ x: d.x, y: d.y });
    };

    const handleResizeStop: RndProps['onResizeStop'] = (_e, _direction, ref, _delta, position) => {
      onUpdate({
        width: parseInt(ref.style.width, 10),
        height: parseInt(ref.style.height, 10),
        ...position,
      });
    };

    <Rnd
      size={{ width, height }}
      position={{ x, y }}
      onDragStop={handleDragStop}
      onResizeStop={handleResizeStop}
      // ... other Rnd props ...
      style={{
        border: isSelected ? `2px dashed ${BRAND_COLORS.accentGreen}` : 'none',
        zIndex,
        transformOrigin: 'center center', // RND's own origin
      }}
      lockAspectRatio={layer.type === LayerType.STICKER}
      enableResizing={isSelected ? { /* all handles */ } : false}
    >
      {/* Inner content for rotation */}
    </Rnd>
    ```

*   **Rotation (Visual Handle) (`LayerRenderer.tsx`)**:
    A custom handle is rendered for selected layers. Dragging it updates the `rotation` property. The rotation transform is applied to an inner `div` to avoid conflicts with `react-rnd`.
    ```typescript
    // LayerRenderer.tsx - Inner div for rotation
    const contentStyles: React.CSSProperties = {
      width: '100%',
      height: '100%',
      // ...
      transform: `rotate(${rotation}deg)`,
      transformOrigin: 'center center',
    };
    // ...
    <Rnd {...rndProps}>
      <div style={contentStyles}> {/* Rotation applied here */}
        {renderContent()}
      </div>
      {isSelected && (
        <div className="rotation-handle" onMouseDown={handleRotateStart} >
          <Icon path="..." /> {/* Rotation icon */}
        </div>
      )}
    </Rnd>
    ```
    The `handleRotateStart`, `handleRotateMove`, and `handleRotateEnd` functions calculate the angle based on mouse position relative to the layer's center (see "Rotation Handle Implementation Deep Dive" below).

### 5. Layer Ordering (Z-index Management)

Users can bring layers to the front or send them to the back.

*   **`App.tsx` - Logic**:
    ```typescript
    const [nextZIndex, setNextZIndex] = useState<number>(1);

    const bringToFront = (id: string) => {
      const newZ = nextZIndex;
      updateLayer(id, { zIndex: newZ });
      setNextZIndex(prevZ => Math.min(prevZ + 1, MAX_Z_INDEX));
    };

    const sendToBack = (id: string) => {
      // ... logic to find minimum z-index and set current layer below it ...
      updateLayer(id, { zIndex: minZ - 1 });
    };
    ```
    Layers are then sorted by `zIndex` in `MemeCanvas.tsx` before rendering.

### 6. Deleting Layers

Selected layers can be removed.

*   **`App.tsx` - Logic**:
    ```typescript
    const deleteLayer = useCallback((id: string) => {
      setLayers(prevLayers => prevLayers.filter(layer => layer.id !== id));
      if (selectedLayerId === id) {
        setSelectedLayerId(null);
      }
    }, [selectedLayerId]);
    ```

### 7. Exporting the Meme

The final meme is generated using `html2canvas` (or a similar library).

*   **`App.tsx` - Export Logic**:
    ```typescript
    // Mock or actual html2canvas import
    // import html2canvas from 'html2canvas';

    const handleExportMeme = () => {
      setSelectedLayerId(null); // Deselect for cleaner image
      requestAnimationFrame(() => {
        if (memeCanvasRef.current) {
          html2canvas(memeCanvasRef.current, { 
            useCORS: true, 
            backgroundColor: BRAND_COLORS.primaryBg,
            // ... other options
          }).then(canvas => {
            const image = canvas.toDataURL('image/jpeg', 0.9);
            const link = document.createElement('a');
            link.download = `sendit-fun-${Date.now()}.jpg`;
            link.href = image;
            link.click();
          });
        }
      });
    };
    ```
 
 - The Share feature uses the same export target and UI-hiding as the existing download/export. The existing download behavior is unchanged.
 
 ## Share (Web Share API)
 - Adds a “Share” button in the toolbar to share the generated meme as a PNG via the native share sheet when supported (Web Share API Level 2, file sharing).
 - If file sharing isn’t supported on the current platform, the action automatically falls back to the existing download/export.
 - The PNG export uses the same canvas target and hides selection/handles as the normal download export.
 
 Support notes:
 - Android Chrome: Supported (Web Share API with files).
 - Desktop browsers: Often do not support file sharing; will fall back to download.
 - iOS Safari: File sharing support may be limited; will typically fall back to download.
 - Secure context (HTTPS) is recommended for Web Share API.
 
 ### Manual testing
 - Desktop:
   - Load a base image, click “Share” → expected: triggers download fallback.
 - Android (Chrome):
   - Load a base image, add text/stickers, click “Share” → expected: native share sheet with meme.png attached.
 - iOS (Safari):
   - Click “Share” → likely download fallback.
 - Edge cases:
   - “Share” is disabled until a base image is present.
   - Canceling the native share sheet yields no error.

## Unified Canvas 2D Render Pipeline

To ensure perfect parity between the editor's preview and exported meme images, and to correctly scale visual effects (outline, glow, shadow) regardless of export resolution, the application now utilizes a unified, scale-aware Canvas 2D rendering pipeline. This approach eliminates discrepancies that arose from using CSS-based effects for the preview, which could not be reliably replicated during canvas export.

*   **What it is and why**: A single, consistent set of drawing functions is used for both displaying layers in the editor and rendering them for export. This guarantees that "what you see is what you get," preventing visual differences in effects when exporting at various resolutions.
*   **Where it lives**: The core rendering logic is encapsulated in [`utils/renderPipeline.ts`](utils/renderPipeline.ts). Key functions include:
    *   [`drawMeme()`](utils/renderPipeline.ts): Orchestrates the drawing of the entire meme, including the base image and all layers.
    *   [`drawTextLayer()`](utils/renderPipeline.ts): Renders individual text layers with all their configured effects (outline, glow, shadow).
    *   [`drawStickerLayer()`](utils/renderPipeline.ts): Renders individual sticker layers, including their pseudo-outline effects.
    *   [`getRenderContextForCanvas()`](utils/renderPipeline.ts): Provides a Canvas 2D rendering context, potentially with scaling applied.
*   **How export reuses the same pipeline**: The export functionality, managed by [`utils/canvasExporter.ts`](utils/canvasExporter.ts), directly calls the functions from [`utils/renderPipeline.ts`](utils/renderPipeline.ts) to draw the meme onto an offscreen canvas. This ensures the exact same rendering logic is applied for the final output.
*   **How preview uses the pipeline**:
    *   [`components/TextCanvasPreview.tsx`](components/TextCanvasPreview.tsx): This component is responsible for rendering text layers using the unified pipeline for accurate preview of text effects.
    *   [`components/CanvasEffectRenderer.tsx`](components/CanvasEffectRenderer.tsx): This component integrates the rendering pipeline to display effects for various layers within the editor, replacing previous CSS-based effect implementations.

## Usage Instructions

### Running the Project

Follow the "Getting Started" instructions above to set up and run the development server.

### Using the Editor

1.  **Add Base Image**: Click "Upload Image" or "Templates" to start your meme.
2.  **Add Text/Stickers**: Use the "Add Text" or "Add Sticker" buttons in the toolbar.
3.  **Configure Effects**: Select a text or sticker layer on the canvas. Use the controls in the toolbar to adjust properties like font, color, size, outline, glow, and shadow.
4.  **Manipulate Layers**: Drag to move, use the handles to resize, and the dedicated rotation handle to rotate layers.

### Flattened Preview

A "Flattened Preview" button is available in the toolbar ([`components/Toolbar.tsx`](components/Toolbar.tsx)). Clicking this button renders the entire meme onto a temporary canvas using the exact same unified render pipeline that the export function uses. This allows for immediate visual validation of export parity directly within the editor, ensuring that all effects and scaling appear as they will in the final exported image.

### Exporting with Options

To export your meme, click the "Export" button. The export process uses the unified pipeline and can be configured with various options:

*   `targetScale`: Multiplier for the output resolution. For example, `window.devicePixelRatio` can be used to export at the device's native pixel density.
*   `format`: Output image format (e.g., `'image/jpeg'`, `'image/png'`).
*   `quality`: For JPEG format, a number between 0 and 1 indicating image quality.

Example of calling the export function (conceptually):
```typescript
import { exportToDataURL } from './utils/canvasExporter';

// ... inside an async function or event handler
const dataUrl = await exportToDataURL(
  memeCanvasRef.current, // The HTMLCanvasElement to render from
  layers, // All meme layers
  baseImage, // The base image
  {
    targetScale: window.devicePixelRatio * 2, // Export at 2x device resolution
    format: 'image/png',
    quality: 0.95, // High quality for JPEG/WebP, ignored for PNG
  }
);

const link = document.createElement('a');
link.download = `my-awesome-meme.png`;
link.href = dataUrl;
link.click();
```

## Effects Behavior and Scaling

All visual effects are now rendered directly onto the Canvas 2D context, ensuring consistent behavior and proper scaling.

*   **Outline (Text)**: Implemented using `ctx.strokeText()` with `ctx.lineJoin = 'round'`. The `lineWidth` property is dynamically scaled by `outlineWidth * 2 * scale` to maintain proportional thickness at different export resolutions.
*   **Glow and Shadow (Text)**: Achieved using `ctx.shadowBlur`, `ctx.shadowOffsetX`, and `ctx.shadowOffsetY` properties. These properties are also scaled by the `targetScale` to ensure effects like blur radius and offset distances are consistent across resolutions. A multiple-pass approach is used for glow effects to enhance their appearance.
*   **Sticker Outlines**: A "pseudo-outline" effect is applied by drawing the sticker multiple times with slight offsets in 8 directions before drawing the main sticker. These offsets are multiplied by the `export scale` to ensure the outline thickness scales correctly.
    *   **Rendering pipeline: Sticker outline**: The [`applyOutlineEffect()`](utils/effectRenderer.ts:192) routine now uses a tinted silhouette mask created by [`createTintedSilhouette()`](utils/effectRenderer.ts:356) for outline passes. This prevents duplication of the full-color sticker image and ensures a clean outline. The canvas context state is reset between passes to avoid unintended drawing artifacts.
*   **Notes on `devicePixelRatio`**: The `window.devicePixelRatio` significantly impacts how resolution affects effect thickness. When exporting at higher scales (e.g., `targetScale: 2`), effects like outlines and blur will naturally appear thicker in terms of raw pixels, but proportionally correct relative to the content. Always consider the `targetScale` when evaluating effect appearance.

## Manual Testing Checklist (Regression Path)

### Testing steps: Sticker Outline Fix
1.  **Enable Outline**: Select a sticker layer and enable the "Outline" option in the toolbar.
2.  **Adjust Outline**: Experiment with various outline widths and colors.
3.  **Verify**: Confirm that the sticker displays a clean, solid outline without any duplicate images in the background.
4.  **Test PNG/SVG**: Repeat steps 1-3 with both PNG and SVG sticker types.
5.  **Export**: Export the meme and verify the outline appears correctly in the exported image.


Before any release, perform the following checks to ensure the render pipeline and effects parity are maintained:

1.  **Create a Complex Meme**:
    *   Add a text layer with a thick outline, a strong glow, and an offset shadow.
    *   Add a sticker layer with similar effects (e.g., a noticeable pseudo-outline).
    *   Ensure layers are overlapping and positioned at various locations.
2.  **Compare Previews and Exports**:
    *   **Live Preview**: Observe the meme in the main editor canvas.
    *   **Flattened Preview**: Click the "Flattened Preview" button in the toolbar and compare it against the live preview. They should be visually identical.
    *   **Exported Images**: Export the meme at different `targetScale` values (e.g., 1x, 2x, 3x resolution). Open these exported images and compare them to the live and flattened previews.
3.  **Layer Manipulation Consistency**:
    *   Rotate several layers (text and stickers) with effects applied.
    *   Resize layers with effects.
    *   Confirm that effects (outline thickness, glow intensity, shadow offset/blur) remain consistent and proportionally scaled relative to the layer content across all manipulations and export scales.
4.  **Acceptance Criteria**:
    *   **Parity**: The live preview, flattened preview, and exported images must show identical visual effects at equivalent scales.
    *   **Proportional Scaling**: Outline thickness, blur radius, and shadow offsets must scale proportionally with the `targetScale` of the export.

## Troubleshooting

*   **Outlines look thin at high scales**:
    *   Confirm that the `scale` parameter passed to [`drawMeme()`](utils/renderPipeline.ts) and related drawing functions is correct.
    *   Verify that `lineWidth` for text outlines is calculated as `outlineWidth * 2 * scale` within [`drawTextLayer()`](utils/renderPipeline.ts).
*   **Sticker outlines appear soft or blurry at large widths**:
    *   The current silhouette-based outline uses a fixed number of offset passes. For very large outline widths, this can lead to a slightly softer appearance. Consider implementing morphological dilation (e.g., using `ctx.filter = 'dilate(Xpx)'` or multiple passes with increasing offsets) for a sharper look at extreme widths.
*   **Sticker outline rendering performance**:
    *   Generating the tinted silhouette mask for each outline pass can be computationally intensive, especially for complex stickers or many layers. For performance-critical scenarios, consider caching the generated silhouette masks.
*   **Glow/Shadow look weak or incorrect**:
    *   Ensure `ctx.shadowBlur`, `ctx.shadowOffsetX`, and `ctx.shadowOffsetY` are correctly scaled by the `targetScale` in [`effectRenderer.ts`](utils/effectRenderer.ts) or [`drawTextLayer()`](utils/renderPipeline.ts).
    *   Confirm that `ctx.shadow*` properties are reset (e.g., `ctx.shadowBlur = 0;`) between drawing passes to prevent unintended accumulation of effects.
*   **Sticker effects differ from text effects**:
    *   Verify that pseudo-outline offsets for stickers are correctly multiplied by the `scale` parameter.
    *   Ensure the same `scale` value is consistently used for both preview and export rendering of stickers.
*   **TypeScript reports transient React/JSX errors after edits**:
    *   This can sometimes occur due to caching issues. Try restarting the TypeScript server (VS Code: `Ctrl+Shift+P` -> "TypeScript: Restart TS Server") or restarting the development server (`npm run dev`).

## Developer Notes

*   **Avoid CSS-based Effects**: Do not reintroduce CSS properties like `text-stroke`, `text-shadow`, or `drop-shadow` filters for preview rendering. These effects are difficult to replicate accurately on a Canvas 2D context and will lead to export parity issues. All effects must be rendered via the Canvas 2D pipeline.
*   **Use Shared Render Pipeline Functions**: Always utilize the shared drawing functions provided in [`utils/renderPipeline.ts`](utils/renderPipeline.ts) (e.g., [`drawTextLayer()`](utils/renderPipeline.ts), [`drawStickerLayer()`](utils/renderPipeline.ts)) for rendering layers. Avoid duplicating drawing logic elsewhere in the codebase.
*   **Maintain Z-Index and Context State**: Ensure `zIndex` ordering is consistent across all layers. When applying transforms or specific drawing styles, always use `ctx.save()` before and `ctx.restore()` after to prevent styles from leaking to other drawing operations.
*   **Optional Background Parity**: For complete visual parity, consider rendering the base image background through the unified pipeline as well, rather than relying solely on `html2canvas` or direct image drawing. The "Flattened Preview" button serves as a strong verification tool for overall parity.

## Changelog

### Version X.Y.Z (Date)

*   **Fix**: Resolved a bug where enabling the "Outline" option on stickers caused duplicates in the background. The fix involved switching to a tinted silhouette mask for outline passes and resetting the canvas state between passes.
*   **Refactor**: Implemented a unified, scale-aware Canvas 2D rendering pipeline to ensure perfect visual parity between editor preview and exported images.
*   **Feature**: Removed all CSS-based effects from the editor preview, replacing them with Canvas 2D rendering.
*   **Feature**: Effects (outline, glow, shadow, sticker pseudo-outline) now scale proportionally with export resolution.
*   **Feature**: Added "Flattened Preview" button for immediate visual validation of export parity.
*   **Improvement**: Enhanced effect consistency across layer manipulations (resize, rotate).

## Rotation Handle Implementation Deep Dive

The rotation mechanism allows users to intuitively rotate layers.

1.  **Initiation (`handleRotateStart` in `LayerRenderer.tsx`)**:
    *   When the user presses the mouse down on the rotation handle:
        *   The layer is selected (`onSelect()`).
        *   The `getBoundingClientRect()` of the draggable element (the `<Rnd>` component) is used to find its current center on the screen (`layerCenterRef.current`). This is the pivot point for rotation calculations.
        *   The initial angle from this center point to the mouse's current position is calculated using `Math.atan2(mouseY - centerY, mouseX - centerX)` and stored in `initialAngleRef.current`.
        *   The layer's current rotation (degrees) is stored in `initialRotationRef.current`.
        *   Event listeners for `mousemove` (`handleRotateMove`) and `mouseup` (`handleRotateEnd`) are added to the `document`.

2.  **Dragging (`handleRotateMove` in `LayerRenderer.tsx`)**:
    *   As the mouse moves:
        *   The current angle from the stored layer center to the new mouse position is calculated (`Math.atan2`).
        *   The difference between this `currentAngle` and the `initialAngleRef.current` gives the change in angle (delta angle) in radians.
        *   This delta angle (converted to degrees) is added to the `initialRotationRef.current` (the layer's rotation when the drag started). This results in the `newRotation`.
        *   The `onUpdate({ rotation: newRotation })` callback is called to update the layer's state.

3.  **Completion (`handleRotateEnd` in `LayerRenderer.tsx`)**:
    *   When the mouse button is released, the `mousemove` and `mouseup` event listeners are removed from the `document`, ending the rotation operation.

4.  **Applying Rotation Style**:
    *   The `rotation` value from the layer's state is applied via CSS `transform: rotate(${rotation}deg)` to an *inner div* within the `<Rnd>` component. This `div` has `transform-origin: center center;`.
    *   This separation ensures that `react-rnd`'s own transform for positioning (`translate`) does not conflict with the rotation transform.

    ```typescript
    // LayerRenderer.tsx (Relevant parts)
    const initialAngleRef = useRef(0);
    const initialRotationRef = useRef(0);
    const layerCenterRef = useRef({ x: 0, y: 0 });

    const handleRotateStart = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      // ... (get draggable element rect) ...
      layerCenterRef.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      initialAngleRef.current = Math.atan2(e.clientY - layerCenterRef.current.y, e.clientX - layerCenterRef.current.x);
      initialRotationRef.current = layer.rotation || 0;
      // ... (add event listeners) ...
    }, [layer.rotation, onSelect, handleRotateMove, handleRotateEnd]);

    const handleRotateMove = useCallback((e: MouseEvent) => {
      const currentAngle = Math.atan2(e.clientY - layerCenterRef.current.y, e.clientX - layerCenterRef.current.x);
      const angleDifferenceRad = currentAngle - initialAngleRef.current;
      let newRotation = initialRotationRef.current + (angleDifferenceRad * 180 / Math.PI);
      onUpdate({ rotation: newRotation });
    }, [onUpdate]);

    // Style for the inner div handling rotation
    const contentStyles: React.CSSProperties = {
      transform: `rotate(${layer.rotation}deg)`,
      transformOrigin: 'center center',
      // ... other styles
    };
    ```

## Environment and build status
- Build/typecheck verification deferred:
 - The project expects Node 22.x; current environment used Node 20, causing EBADENGINE/EBADPLATFORM issues.
- To verify locally later:
 1) Use Node 22.x.
 2) Install deps: npm ci
 3) Typecheck: npx tsc --noEmit
 4) Build: npm run build

## File Structure Overview

A brief overview of the main project structure:

```
/
├── public/
│   └── (static assets)
├── src/
│   ├── components/
│   │   ├── common/                 # Reusable UI elements (Button, Input, Icon, etc.)
│   │   ├── LayerRenderer.tsx       # Renders individual layers with RND and rotation
│   │   ├── MemeCanvas.tsx          # Displays base image and all layers
│   │   ├── MemeTemplateGallery.tsx # Modal for selecting predefined meme templates
│   │   ├── StickerGallery.tsx      # Modal for selecting predefined stickers
│   │   ├── StickerLayerEditor.tsx  # Editor controls for sticker properties
│   │   ├── TextLayerEditor.tsx     # Editor controls for text properties
│   │   └── Toolbar.tsx             # Main sidebar for adding/editing layers
│   ├── App.tsx                     # Main application component, state management
│   ├── constants.ts                # Default fonts, stickers, templates, brand colors
│   ├── index.css                   # Global styles (if any, beyond Tailwind utility classes in index.html)
│   ├── index.tsx                   # Entry point of the React application
│   └── types.ts                    # TypeScript type definitions
├── index.html                      # Main HTML file with Tailwind config
├── package.json
├── tsconfig.json
└── vite.config.ts                  # Vite build configuration
```

This README provides a solid foundation for understanding and working with the Sendit Meme Generator application.