
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