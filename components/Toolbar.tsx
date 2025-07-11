
import React, { useState } from 'react';
import { Layer, LayerType, TextLayerProps, StickerLayerProps, StickerOption } from '../types';
import TextLayerEditor from './TextLayerEditor';
import StickerLayerEditor from './StickerLayerEditor';
import StickerGallery from './StickerGallery';
import LayerList from './LayerList'; // New component
import { Button } from './common/Button';
import { Icon } from './common/Icon';

interface ToolbarProps {
  id?: string;
  layers: Layer[];
  onAddLayer: <T extends LayerType>(type: T, props?: Partial<Layer>) => void;
  selectedLayer: Layer | null;
  onSelectLayer: (id: string | null) => void;
  onUpdateLayer: (id: string, newProps: Partial<Layer>) => void;
  onDeleteLayer: (id: string) => void;
  onBringToFront: (id: string) => void;
  onSendToBack: (id: string) => void;
  hasBaseImage: boolean;
  stickers: StickerOption[]; // Add this new prop
}

const Toolbar: React.FC<ToolbarProps> = ({
  id,
  layers,
  onAddLayer,
  selectedLayer,
  onSelectLayer,
  onUpdateLayer,
  onDeleteLayer,
  onBringToFront,
  onSendToBack,
  hasBaseImage,
  stickers // Destructure the new prop
}) => {
  const [showStickerGallery, setShowStickerGallery] = useState(false);
  const [isEditorCollapsed, setIsEditorCollapsed] = useState(false);
  const [isToolbarContentVisible, setIsToolbarContentVisible] = useState(true);


  const handleAddText = () => {
    if (!hasBaseImage) return;
    onAddLayer(LayerType.TEXT);
  };

  const handleAddStickerFromGallery = (sticker: StickerOption) => {
    if (!hasBaseImage) return;
    onAddLayer(LayerType.STICKER, { src: sticker.src, alt: sticker.alt, width: 100, height: 100 });
    setShowStickerGallery(false);
  };
  
  const handleAddUploadedSticker = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!hasBaseImage) return;
    if (event.target.files && event.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => {
        onAddLayer(LayerType.STICKER, { 
          src: e.target?.result as string, 
          alt: 'Uploaded Sticker',
          width: 100,
          height: 100
        });
      };
      reader.readAsDataURL(event.target.files[0]);
      event.target.value = ''; 
    }
  };

  return (
    <aside 
      id={id} 
      className={`bg-brand-black p-3 md:p-4 space-y-3 md:space-y-6 flex flex-col
                  w-full md:w-80 lg:w-96 
                  md:h-full md:max-h-none max-h-[40vh] md:border-r-2 border-light-highlight 
                  transition-all duration-300 ease-in-out
                  overflow-y-auto 
                  ${hasBaseImage ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}
    >
      {!hasBaseImage && (
        <div className="absolute inset-0 bg-brand-black bg-opacity-75 flex items-center justify-center z-10 md:relative">
          <p className="text-secondary-text text-base sm:text-lg p-4 text-center">Upload an image first to enable tools.</p>
        </div>
      )}

      {/* Mobile Toggle Button for Toolbar Content */}
      <div className="md:hidden flex justify-end sticky top-0 bg-brand-black py-1 z-10 -mx-3 px-3 border-b border-light-highlight">
        <Button 
          variant="icon" 
          onClick={() => setIsToolbarContentVisible(!isToolbarContentVisible)}
          aria-expanded={isToolbarContentVisible}
          aria-controls="toolbar-content"
          className="text-accent-green"
        >
          <Icon path={isToolbarContentVisible ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} className="w-6 h-6" />
          <span className="sr-only">{isToolbarContentVisible ? 'Hide Toolbar Content' : 'Show Toolbar Content'}</span>
        </Button>
      </div>
      
      <div id="toolbar-content" className={`${isToolbarContentVisible ? 'block' : 'hidden'} md:block space-y-3 md:space-y-6 flex-grow`}>
        <div className="space-y-2 sm:space-y-3">
          <h3 className="text-lg sm:text-xl font-semibold text-accent-green">Add Elements</h3>
          <Button onClick={handleAddText} fullWidth icon={<Icon path="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 6a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1v-2zm0 6a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1v-2z" />} disabled={!hasBaseImage} size="sm">
            Add Text
          </Button>
          <Button onClick={() => setShowStickerGallery(true)} fullWidth icon={<Icon path="M4 3a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 6a2 2 0 11-4 0 2 2 0 014 0zm-4 4a2 2 0 100 4 2 2 0 000-4z" />} disabled={!hasBaseImage} size="sm">
            Add Sticker
          </Button>
          <label htmlFor="uploadSticker" className={`w-full flex items-center justify-center space-x-2 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm bg-button-green text-brand-black font-semibold rounded-md hover:bg-accent-green transition-colors duration-150 cursor-pointer ${!hasBaseImage ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <Icon path="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            <span>Upload Sticker</span>
          </label>
          <input id="uploadSticker" type="file" accept="image/*" onChange={handleAddUploadedSticker} className="hidden" disabled={!hasBaseImage} />
        </div>

        {showStickerGallery && hasBaseImage && (
          <StickerGallery
            stickers={stickers}
            onSelectSticker={handleAddStickerFromGallery}
            onClose={() => setShowStickerGallery(false)}
          />
        )}

        {/* Layer List Section */}
        {hasBaseImage && layers.length > 0 && (
          <div className="space-y-1 sm:space-y-2 pt-2 sm:pt-4 border-t-2 border-light-highlight">
              <h3 className="text-lg sm:text-xl font-semibold text-accent-green mb-1 sm:mb-2">Layers</h3>
              <LayerList 
                  layers={layers}
                  selectedLayerId={selectedLayer?.id || null}
                  onSelectLayer={onSelectLayer}
              />
          </div>
        )}


        {/* Edit Layer Section */}
        {selectedLayer && hasBaseImage && (
          <div className="space-y-2 sm:space-y-4 pt-2 sm:pt-4 border-t-2 border-light-highlight">
            <div className="flex justify-between items-center">
              <h3 className="text-lg sm:text-xl font-semibold text-accent-green">Edit Layer</h3>
              <Button 
                variant="icon" 
                onClick={() => setIsEditorCollapsed(!isEditorCollapsed)}
                aria-expanded={!isEditorCollapsed}
                aria-controls="layer-editor-controls"
              >
                <Icon path={isEditorCollapsed ? "M19 9l-7 7-7-7" : "M5 15l7-7 7 7"} className="w-5 h-5" />
                <span className="sr-only">{isEditorCollapsed ? 'Expand Editor' : 'Collapse Editor'}</span>
              </Button>
            </div>
            {!isEditorCollapsed && (
              <div id="layer-editor-controls" className="space-y-2 sm:space-y-3">
                {selectedLayer.type === LayerType.TEXT && (
                  <TextLayerEditor
                    layer={selectedLayer as TextLayerProps}
                    onUpdateLayer={(props) => onUpdateLayer(selectedLayer.id, props)}
                  />
                )}
                {selectedLayer.type === LayerType.STICKER && (
                  <StickerLayerEditor
                    layer={selectedLayer as StickerLayerProps}
                    onUpdateLayer={(props) => onUpdateLayer(selectedLayer.id, props)}
                  />
                )}
                <div className="grid grid-cols-2 gap-2 pt-1 sm:pt-2">
                  <Button onClick={() => onBringToFront(selectedLayer.id)} variant="secondary" size="sm" fullWidth>Bring to Front</Button>
                  <Button onClick={() => onSendToBack(selectedLayer.id)} variant="secondary" size="sm" fullWidth>Send to Back</Button>
                </div>
                <Button onClick={() => onDeleteLayer(selectedLayer.id)} variant="danger" fullWidth icon={<Icon path="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />} size="sm">
                  Delete Layer
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};

export default Toolbar;
