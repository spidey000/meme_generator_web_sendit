
import React from 'react';
import { MemeTemplateOption } from '../types';
import { BRAND_COLORS } from '../constants';
import { Button } from './common/Button';
import { Icon } from './common/Icon';

interface MemeTemplateGalleryProps {
  templates: MemeTemplateOption[];
  onSelectTemplate: (template: MemeTemplateOption) => void;
  onClose: () => void;
}

const MemeTemplateGallery: React.FC<MemeTemplateGalleryProps> = ({ templates, onSelectTemplate, onClose }) => {
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-85 flex items-center justify-center z-50 p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="meme-template-gallery-title"
    >
      <div className={`bg-brand-black p-3 sm:p-4 md:p-6 rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col border-2 border-accent-green`}>
        <div className="flex justify-between items-center mb-3 sm:mb-4">
          <h4 id="meme-template-gallery-title" className="text-lg sm:text-xl font-semibold text-accent-green">Choose a Meme Template</h4>
          <Button onClick={onClose} variant="icon" className="text-accent-green hover:text-text-white" aria-label="Close gallery">
            <Icon path="M6 18L18 6M6 6l12 12" className="w-5 h-5 sm:w-6 sm:h-6" />
          </Button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-accent-green scrollbar-track-light-highlight flex-grow">
          {templates.map(template => (
            <button
              key={template.id}
              onClick={() => onSelectTemplate(template)}
              className="p-1.5 sm:p-2 bg-light-highlight rounded-md hover:bg-accent-green group transition-all aspect-[4/3] flex flex-col items-center justify-center text-center"
              title={`Use ${template.name} template`}
              aria-label={`Use ${template.name} template`}
            >
              <img 
                src={template.src} 
                alt={template.alt} 
                className="max-w-full max-h-[80%] object-contain group-hover:scale-105 transition-transform mb-1 sm:mb-1.5" 
                loading="lazy"
              />
              <span className="text-xs text-text-white group-hover:text-brand-black truncate w-full px-1">{template.name}</span>
            </button>
          ))}
        </div>
        <Button onClick={onClose} variant="secondary" className="mt-4 sm:mt-6 w-full md:w-auto md:self-center" size="sm">
          Close Gallery
        </Button>
      </div>
    </div>
  );
};

export default MemeTemplateGallery;