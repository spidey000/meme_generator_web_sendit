// Fix: Re-trigger TypeScript language server

import React from 'react';
import { Layer, TextLayerProps, StickerLayerProps, LayerType, InteractionType } from '../types';
import { BRAND_COLORS, HANDLE_SIZE, HANDLE_OFFSET } from '../constants';
import { Icon } from './common/Icon';
import CanvasEffectRenderer from './CanvasEffectRenderer';
import TextCanvasPreview from './TextCanvasPreview';

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
 const { id, x, y, width = 0, height = 0, rotation, zIndex, type } = layer;

 const handleInteraction = (
   e: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>,
   interactionType: InteractionType
 ) => {
   e.stopPropagation();
   if (!isSelected && interactionType !== 'move') {
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
   cursor: isSelected ? 'grabbing' : 'grab',
   border: isSelected ? `2px dashed ${BRAND_COLORS.accentGreen}` : '2px dashed transparent',
   boxSizing: 'border-box',
 };

 const contentContainerStyle: React.CSSProperties = {
   width: '100%',
   height: '100%',
   display: 'flex',
   alignItems: 'center',
   justifyContent: 'center',
   // Stickers intentionally bypass local container clipping so they can render beyond
   // the template/meme bounding box (effects like outline/glow may extend).
   // Keep text layers clipped as before.
   overflow: layer.type === LayerType.STICKER ? 'visible' : 'hidden',
   userSelect: 'none',
 };

 const renderContent = () => {
   if (layer.type === LayerType.TEXT) {
     const textLayer = layer as TextLayerProps;
     return (
       <TextCanvasPreview
         layer={textLayer}
         width={width}
         height={height}
       />
     );
   }

   if (layer.type === LayerType.STICKER) {
     const stickerLayer = layer as StickerLayerProps;

     // Maintain aspect ratio within the bounds if needed (ensure the preview canvas matches layer W/H)
     let previewWidth = width;
     let previewHeight = height;
     if (stickerLayer.aspectRatio) {
       const layerAspectRatio = (width || 1) / (height || 1);
       if (layerAspectRatio > stickerLayer.aspectRatio) {
         previewWidth = (height || 0) * stickerLayer.aspectRatio;
       } else {
         previewHeight = (width || 0) / stickerLayer.aspectRatio;
       }
     }

     return (
       <CanvasEffectRenderer
         layer={{ ...stickerLayer, width: previewWidth, height: previewHeight }}
         width={previewWidth}
         height={previewHeight}
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
   zIndex: (zIndex || 0) + 1,
 };

 return (
   <div
     id={`layer-render-${id}`}
     style={layerStyle}
     className={`layer-interactive ${isSelected ? 'layer-selected-outline' : ''}`}
     onMouseDown={(e) => handleInteraction(e, 'move')}
     onTouchStart={(e) => handleInteraction(e, 'move')}
     onClick={(e) => {
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
             top: `-${HANDLE_SIZE * 0.75}px`,
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
            <Icon path="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"
                 className="w-3 h-3 text-brand-black" strokeWidth={2.5} fill="none" stroke={BRAND_COLORS.brandBlack} />
         </div>
       </>
     )}
   </div>
 );
};

export default LayerRenderer;
