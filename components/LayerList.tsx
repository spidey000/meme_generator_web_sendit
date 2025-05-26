
import React from 'react';
import { Layer, LayerType, TextLayerProps, StickerLayerProps } from '../types';
import { BRAND_COLORS } from '../constants';
import { Icon } from './common/Icon';

interface LayerListProps {
  layers: Layer[];
  selectedLayerId: string | null;
  onSelectLayer: (id: string | null) => void;
}

const LayerList: React.FC<LayerListProps> = ({ layers, selectedLayerId, onSelectLayer }) => {
  if (!layers || layers.length === 0) {
    return <p className="text-xs text-secondary-text">No layers yet. Add some!</p>;
  }

  // Display layers in reverse order of zIndex (topmost first in list)
  const sortedLayers = [...layers].sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));

  return (
    <ul className="space-y-1 max-h-48 overflow-y-auto pr-1">
      {sortedLayers.map(layer => {
        const isSelected = layer.id === selectedLayerId;
        let layerName = 'Layer';
        let iconType: React.ReactNode;

        if (layer.type === LayerType.TEXT) {
          const textLayer = layer as TextLayerProps;
          layerName = textLayer.text.substring(0, 20) + (textLayer.text.length > 20 ? '...' : '');
          if (!layerName.trim()) layerName = "Empty Text";
          iconType = <Icon path="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5z" className="w-4 h-4 mr-2 flex-shrink-0" />;
        } else if (layer.type === LayerType.STICKER) {
          const stickerLayer = layer as StickerLayerProps;
          layerName = stickerLayer.alt || 'Sticker';
          iconType = <Icon path="M4 3a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 6a2 2 0 11-4 0 2 2 0 014 0z" className="w-4 h-4 mr-2 flex-shrink-0" />;
        }

        return (
          <li key={layer.id}>
            <button
              onClick={() => onSelectLayer(layer.id)}
              className={`w-full flex items-center text-left p-2 rounded-md text-sm transition-colors duration-150
                ${isSelected ? `bg-accent-green text-brand-black font-semibold` : `bg-light-highlight text-text-white hover:bg-opacity-70`}
              `}
              aria-pressed={isSelected}
              title={`Select layer: ${layerName}`}
            >
              {iconType}
              <span className="truncate flex-grow">{layerName}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
};

export default LayerList;
