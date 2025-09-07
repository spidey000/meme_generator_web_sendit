import React, { forwardRef } from 'react';
import { Layer, InteractionType, LayerType } from '../types';
import LayerRenderer from './LayerRenderer';

interface MemeCanvasProps {
  baseImage: string;
  imageDimensions: { width: number; height: number } | null;
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
  ({ baseImage, imageDimensions, layers, selectedLayerId, onSelectLayer, onInteractionStart }, ref) => {
    const sortedLayers = [...layers].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

    const interactiveAreaStyle: React.CSSProperties = {
        position: 'relative',
        boxShadow: '0 0 20px rgba(0,0,0,0.5)',
    };

    if (imageDimensions) {
        interactiveAreaStyle.width = `${imageDimensions.width}px`;
        interactiveAreaStyle.height = `${imageDimensions.height}px`;
    } else {
        // Fallback for when dimensions are not yet loaded
        interactiveAreaStyle.maxWidth = '100%';
        interactiveAreaStyle.maxHeight = '100%';
    }

    return (
      <div 
        ref={ref} 
        className="relative w-auto h-auto" 
        style={{ touchAction: 'none' }}
      >
        <div
          id="meme-canvas-interactive-area"
          style={interactiveAreaStyle}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
                onSelectLayer(null);
            }
          }}
        >
          <img 
            src={baseImage} 
            alt="Meme base" 
            className="block w-full h-full select-none pointer-events-none"
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