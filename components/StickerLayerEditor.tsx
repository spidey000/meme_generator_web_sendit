import React from 'react';
import { StickerLayerProps } from '../types';

interface StickerLayerEditorProps {
  layer: StickerLayerProps;
  onUpdateLayer: (props: Partial<StickerLayerProps>) => void;
}

const StickerLayerEditor: React.FC<StickerLayerEditorProps> = ({ layer, onUpdateLayer }) => {
  return (
    <div className="space-y-3 text-sm">
      <p className="text-sm text-secondary-text">Sticker: <span className="text-text-white font-medium">{layer.alt}</span></p>
       <p className="text-xs text-secondary-text">
        Drag to move. Use the top handle to rotate and the bottom-right handle to resize.
      </p>
    </div>
  );
};

export default StickerLayerEditor;