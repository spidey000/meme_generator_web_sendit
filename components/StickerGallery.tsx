
import React from 'react';
import { StickerOption } from '../types';
import { BRAND_COLORS } from '../constants';
import { Button } from './common/Button';
import { Icon } from './common/Icon';

interface StickerGalleryProps {
  stickers: StickerOption[];
  onSelectSticker: (sticker: StickerOption) => void;
  onClose: () => void;
}

const StickerGallery: React.FC<StickerGalleryProps> = ({ stickers, onSelectSticker, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className={`bg-brand-black p-4 md:p-6 rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col border-2 border-accent-green`}>
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-xl font-semibold text-accent-green">Choose a Sticker</h4>
          <Button onClick={onClose} variant="icon" className="text-accent-green hover:text-text-white">
            <Icon path="M6 18L18 6M6 6l12 12" className="w-6 h-6" />
          </Button>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-accent-green scrollbar-track-light-highlight">
          {stickers.map(sticker => (
            <button
              key={sticker.id}
              onClick={() => onSelectSticker(sticker)}
              className="p-2 bg-light-highlight rounded-md hover:bg-accent-green group transition-all aspect-square flex items-center justify-center"
              title={sticker.alt}
            >
              <img src={sticker.src} alt={sticker.alt} className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform" />
            </button>
          ))}
        </div>
        <Button onClick={onClose} variant="secondary" className="mt-6 w-full md:w-auto md:self-center">
          Close Gallery
        </Button>
      </div>
    </div>
  );
};

export default StickerGallery;
    