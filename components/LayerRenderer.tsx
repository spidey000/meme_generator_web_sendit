// Fix: Re-trigger TypeScript language server

import React from 'react';
import { Layer, TextLayerProps, StickerLayerProps, LayerType, InteractionType } from '../types';
import { BRAND_COLORS, HANDLE_SIZE, HANDLE_OFFSET } from '../constants';
import { Icon } from './common/Icon';

interface LayerRendererProps {
  layer: Layer;
  isSelected: boolean;
  onSelect: () => void;
  onInteractionStart: (
    layerId: string,
    interactionType: InteractionType,
    event: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>,
    layerType: LayerType
  ) => void;
}

const LayerRenderer: React.FC<LayerRendererProps> = ({ layer, isSelected, onSelect, onInteractionStart }) => {
  const { id, x, y, width, height, rotation, zIndex, type } = layer;

  const handleInteraction = (
    e: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>,
    interactionType: InteractionType
  ) => {
    e.stopPropagation(); // Prevent MemeCanvas click-outside deselect
    if (!isSelected && interactionType !== 'move') { // Select if trying to interact with handles of unselected layer
      onSelect();
    }
    onInteractionStart(id, interactionType, e, type);
  };
  
  const layerStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${x}px`,
    top: `${y}px`,
    width: `${width}px`,
    height: `${height}px`,
    transform: `rotate(${rotation}deg)`,
    transformOrigin: 'center center',
    zIndex: zIndex,
    cursor: 'grab',
    border: isSelected ? `2px dashed ${BRAND_COLORS.accentGreen}` : '2px dashed transparent', // Keep transparent border for layout consistency
    boxSizing: 'border-box',
  };
  if (isSelected) {
    layerStyle.cursor = 'grabbing';
  }

  const contentContainerStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    userSelect: 'none', // Prevent text selection during drag
  };

  const renderContent = () => {
    if (layer.type === LayerType.TEXT) {
      const textLayer = layer as TextLayerProps;
      const textStyles: React.CSSProperties = {
        fontFamily: textLayer.fontFamily,
        fontSize: `${textLayer.fontSize}px`,
        color: textLayer.color,
        WebkitTextStroke: `${textLayer.outlineWidth}px ${textLayer.outlineColor}`,
        paintOrder: 'stroke fill',
        textShadow: `${textLayer.shadowOffsetX}px ${textLayer.shadowOffsetY}px ${textLayer.shadowBlur}px ${textLayer.shadowColor}`,
        whiteSpace: 'pre-wrap', // Changed from pre to pre-wrap for better fitting
        wordBreak: 'break-word',
        textAlign: 'center',
        lineHeight: '1.2',
        padding: '5px', // Padding inside the text span
        pointerEvents: 'none', // Text itself should not capture mouse events meant for layer
      };

      if (textLayer.glowStrength > 0 && textLayer.glowColor) {
        const glowShadows = Array.from({length: 3}, (_, i) => 
          `0 0 ${textLayer.glowStrength * (i + 1) * 0.5}px ${textLayer.glowColor}`
        ).join(', ');
        textStyles.textShadow = textStyles.textShadow ? `${textStyles.textShadow}, ${glowShadows}` : glowShadows;
      }
      
      return <span style={textStyles}>{textLayer.text}</span>;
    }

    if (layer.type === LayerType.STICKER) {
      const stickerLayer = layer as StickerLayerProps;
      
      // Calculate dimensions to maintain aspect ratio within the layer's bounding box
      let renderWidth = width; // 'width' and 'height' here refer to the layer's dimensions
      let renderHeight = height;

      if (stickerLayer.aspectRatio) {
        const layerAspectRatio = (width || 1) / (height || 1); // Use 1 to prevent division by zero
        if (stickerLayer.aspectRatio && layerAspectRatio > stickerLayer.aspectRatio) {
          // Layer is wider than sticker, constrain by height
          renderWidth = (height || 0) * stickerLayer.aspectRatio;
        } else if (stickerLayer.aspectRatio) {
          // Layer is taller than sticker, constrain by width
          renderHeight = (width || 0) / stickerLayer.aspectRatio;
        }
      }

      const stickerStyles: React.CSSProperties = {
        width: `${renderWidth}px`,
        height: `${renderHeight}px`,
        objectFit: 'contain', // Keep for visual clarity, but explicit dimensions are primary
        pointerEvents: 'none',
        filter: '', // Initialize filter string
      };

      const filters: string[] = [];

      // Outline effect (simulated with drop-shadow)
      if (stickerLayer.outlineWidth && stickerLayer.outlineWidth > 0 && stickerLayer.outlineColor) {
        // Simulate outline by applying multiple drop-shadows around the image
        // This is a common trick for image outlines using CSS filters
        const outlineColor = stickerLayer.outlineColor;
        const outlineWidth = stickerLayer.outlineWidth;
        // Create 8 drop-shadows for a more even outline
        filters.push(
          `drop-shadow(${outlineWidth}px 0 0 ${outlineColor})`,
          `drop-shadow(-${outlineWidth}px 0 0 ${outlineColor})`,
          `drop-shadow(0 ${outlineWidth}px 0 ${outlineColor})`,
          `drop-shadow(0 -${outlineWidth}px 0 ${outlineColor})`,
          `drop-shadow(${outlineWidth * 0.707}px ${outlineWidth * 0.707}px 0 ${outlineColor})`,
          `drop-shadow(-${outlineWidth * 0.707}px ${outlineWidth * 0.707}px 0 ${outlineColor})`,
          `drop-shadow(${outlineWidth * 0.707}px -${outlineWidth * 0.707}px 0 ${outlineColor})`,
          `drop-shadow(-${outlineWidth * 0.707}px -${outlineWidth * 0.707}px 0 ${outlineColor})`
        );
      }

      // Shadow effect
      if (stickerLayer.shadowBlur && stickerLayer.shadowBlur > 0 && stickerLayer.shadowColor) {
        filters.push(
          `drop-shadow(${stickerLayer.shadowOffsetX || 0}px ${stickerLayer.shadowOffsetY || 0}px ${stickerLayer.shadowBlur}px ${stickerLayer.shadowColor})`
        );
      }

      // Glow effect (additional drop-shadows with blur)
      if (stickerLayer.glowStrength && stickerLayer.glowStrength > 0 && stickerLayer.glowColor) {
        const glowColor = stickerLayer.glowColor;
        const glowStrength = stickerLayer.glowStrength;
        // Add multiple blurred drop-shadows for a glow effect
        filters.push(
          `drop-shadow(0 0 ${glowStrength * 0.5}px ${glowColor})`,
          `drop-shadow(0 0 ${glowStrength}px ${glowColor})`,
          `drop-shadow(0 0 ${glowStrength * 1.5}px ${glowColor})`
        );
      }

      stickerStyles.filter = filters.join(' ');

      return (
        <img 
          src={stickerLayer.src} 
          alt={stickerLayer.alt} 
          style={stickerStyles} 
          draggable="false"
          data-is-sticker="true" // For html2canvas differentiation if needed
        />
      );
    }
    return null;
  };

  // Common style for handles
  const handleBaseStyle: React.CSSProperties = {
    position: 'absolute',
    width: `${HANDLE_SIZE}px`,
    height: `${HANDLE_SIZE}px`,
    backgroundColor: BRAND_COLORS.accentGreen,
    border: `2px solid ${BRAND_COLORS.primaryBg}`,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
    zIndex: (zIndex || 0) + 1, // Ensure handles are above the layer content
  };

  return (
    <div
      id={`layer-render-${id}`}
      style={layerStyle}
      className={`layer-interactive ${isSelected ? 'layer-selected-outline' : ''}`}
      onMouseDown={(e) => handleInteraction(e, 'move')}
      onTouchStart={(e) => handleInteraction(e, 'move')}
      onClick={(e) => { // Select on click if not already selected
        e.stopPropagation();
        if(!isSelected) onSelect();
      }}
    >
      <div style={contentContainerStyle}>
        {renderContent()}
      </div>

      {isSelected && (
        <>
          {/* Rotate Handle (Top Center) */}
          <div
            className="interaction-handle rotate-handle"
            style={{
              ...handleBaseStyle,
              top: `-${HANDLE_SIZE * 0.75}px`, // Positioned above, centered
              left: '50%',
              transform: 'translateX(-50%)',
              cursor: 'alias',
            }}
            onMouseDown={(e) => handleInteraction(e, 'rotate')}
            onTouchStart={(e) => handleInteraction(e, 'rotate')}
            title="Rotate layer"
            aria-label="Rotate layer"
          >
            <Icon path="M15.536 7.464l1.414-1.414a1 1 0 00-1.414-1.414l-1.414 1.414A8 8 0 1016 10h-2a6 6 0 11-4.464-5.775L11 5.636V4a1 1 0 00-2 0v2.364A6.002 6.002 0 014 10c0 .338.026.67.076 1H2a8.001 8.001 0 0013.536-3.536z" 
                  className="w-3 h-3 text-brand-black" fill={BRAND_COLORS.brandBlack} stroke={BRAND_COLORS.brandBlack} />
          </div>

          {/* Resize Handle (Bottom Right) */}
          <div
            className="interaction-handle resize-handle-br"
            style={{
              ...handleBaseStyle,
              bottom: `-${HANDLE_OFFSET}px`,
              right: `-${HANDLE_OFFSET}px`,
              cursor: 'se-resize',
            }}
            onMouseDown={(e) => handleInteraction(e, 'resize')}
            onTouchStart={(e) => handleInteraction(e, 'resize')}
            title="Resize layer"
            aria-label="Resize layer"
          >
             <Icon path="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" // Example resize icon
                  className="w-3 h-3 text-brand-black" strokeWidth={2.5} fill="none" stroke={BRAND_COLORS.brandBlack} />
          </div>
        </>
      )}
    </div>
  );
};

export default LayerRenderer;
