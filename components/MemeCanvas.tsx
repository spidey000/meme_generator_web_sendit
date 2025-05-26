
import React, { forwardRef } from 'react';
import { Layer, InteractionType, LayerType } from '../types';
import LayerRenderer from './LayerRenderer';

interface MemeCanvasProps {
  baseImage: string;
  layers: Layer[];
  selectedLayerId: string | null;
  onSelectLayer: (id: string | null) => void;
  onInteractionStart: (
    layerId: string,
    interactionType: InteractionType,
    event: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>,
    layerType: LayerType
  ) => void;
}

const MemeCanvas = forwardRef<HTMLDivElement, MemeCanvasProps>(
  ({ baseImage, layers, selectedLayerId, onSelectLayer, onInteractionStart }, ref) => {
    const sortedLayers = [...layers].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

    // Container for the base image and layers, used for sizing reference by html2canvas target
    // The ref from App.tsx (memeCanvasRef) points to this outer div
    return (
      <div 
        ref={ref} 
        className="relative w-auto h-auto max-w-full max-h-full aspect-auto" // Outer container for centering, if needed
        style={{ touchAction: 'none' }}
      >
        <div
          id="meme-canvas-interactive-area" // Target this div for html2canvas
          className="relative shadow-2xl" // Actual canvas area with image and layers
          // This div's dimensions will be set by the image.
          // Layers are positioned absolutely within this.
          onClick={(e) => {
            // Deselect if click is on this div itself (background of interactive area)
            // but not on a layer or its handles (event bubbling will be stopped by LayerRenderer)
            if (e.target === e.currentTarget) {
                onSelectLayer(null);
            }
          }}
        >
          <img 
            src={baseImage} 
            alt="Meme base" 
            className="block max-w-full max-h-full object-contain select-none pointer-events-none" // Image is not interactive
            // To make parent `meme-canvas-interactive-area` size to image:
            // Image itself might need to be a direct child of the App's main canvas area for correct sizing.
            // Or, we set the size of `meme-canvas-interactive-area` dynamically after image loads.
            // For now, assuming Tailwind's max-w/h on image and `object-contain` correctly sizes it within a flex/grid parent.
            // The key is `meme-canvas-interactive-area` must have definite dimensions for absolute positioning of layers.
            // The `App.tsx`'s `mainCanvasAreaRef` (parent of MemeCanvas) provides the overall boundary.
            // `meme-canvas-interactive-area` should ideally have width/height matching the displayed base image.
            // This is often done by setting an img element and then overlaying an absolutely positioned div on top of it.
            // Let's assume image sets the size of this container for now.
          />
          {sortedLayers.map(layer => (
            <LayerRenderer
              key={layer.id}
              layer={layer}
              isSelected={layer.id === selectedLayerId}
              onSelect={() => onSelectLayer(layer.id)}
              onInteractionStart={onInteractionStart}
            />
          ))}
        </div>
      </div>
    );
  }
);

MemeCanvas.displayName = 'MemeCanvas';
export default MemeCanvas;
