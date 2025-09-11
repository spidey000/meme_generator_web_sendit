
import React, { useState } from 'react';
import { StickerLayerProps } from '../types';
import { ColorInput } from './common/ColorInput';
import { NumberInput } from './common/NumberInput';
import { Icon } from './common/Icon';

interface StickerLayerEditorProps {
  layer: StickerLayerProps;
  onUpdateLayer: (props: Partial<StickerLayerProps>) => void;
}

const StickerLayerEditor: React.FC<StickerLayerEditorProps> = ({ layer, onUpdateLayer }) => {
  const [isOutlineExpanded, setIsOutlineExpanded] = useState(false);
  const [isShadowExpanded, setIsShadowExpanded] = useState(false);
  const [isGlowExpanded, setIsGlowExpanded] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    let parsedValue: string | number = value;
    // Convert range/number values to numeric to keep controlled values as numbers
    if ((e.target as HTMLInputElement).type === 'number' || (e.target as HTMLInputElement).type === 'range') {
      parsedValue = parseFloat(value as string);
      if (isNaN(parsedValue)) parsedValue = 0;
    }
    onUpdateLayer({ [name]: parsedValue });
  };

  const SectionToggle: React.FC<{title: string, isExpanded: boolean, onToggle: () => void, children: React.ReactNode}> = 
    ({ title, isExpanded, onToggle, children }) => (
    <div className="border border-light-highlight rounded-md">
      <div 
        className="flex justify-between items-center p-2 cursor-pointer hover:bg-light-highlight/50 transition-colors"
        onClick={onToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onToggle()}
        aria-expanded={isExpanded}
        aria-controls={`section-content-${title.toLowerCase().replace(/\s+/g, '-')}`}
      >
        <h4 className="text-sm font-medium text-secondary-text">{title}</h4>
        <Icon path={isExpanded ? "M19 9l-7 7-7-7" : "M5 15l7-7 7 7"} className="w-4 h-4 text-accent-green" />
      </div>
      {isExpanded && (
        <div id={`section-content-${title.toLowerCase().replace(/\s+/g, '-')}`} className="p-2 space-y-2 border-t border-light-highlight">
          {children}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-3 text-sm">
      <p className="text-sm text-secondary-text">Sticker: <span className="text-text-white font-medium">{layer.alt}</span></p>
       <p className="text-xs text-secondary-text">
        Drag to move. Use the top handle to rotate and the bottom-right handle to resize.
      </p>

      <SectionToggle title="Outline Options" isExpanded={isOutlineExpanded} onToggle={() => setIsOutlineExpanded(!isOutlineExpanded)}>
        <ColorInput
          label="Outline Color"
          name="outlineColor"
          value={layer.outlineColor || '#000000'} // Default to black if not set
          onChange={handleInputChange}
          aria-label="Sticker outline color"
        />
        <NumberInput
          label="Outline Width (px)"
          name="outlineWidth"
          value={layer.outlineWidth || 0} // Default to 0 if not set
          onChange={handleInputChange}
          min={0}
          max={50}
          step={1}
          mode="range"
          aria-label="Sticker outline width in pixels"
        />
      </SectionToggle>

      <SectionToggle title="Shadow Options" isExpanded={isShadowExpanded} onToggle={() => setIsShadowExpanded(!isShadowExpanded)}>
        <ColorInput
          label="Shadow Color"
          name="shadowColor"
          value={layer.shadowColor || '#000000'} // Default to black if not set
          onChange={handleInputChange}
          aria-label="Sticker shadow color"
        />
        <NumberInput
          label="Shadow Blur (px)"
          name="shadowBlur"
          value={layer.shadowBlur || 0} // Default to 0 if not set
          onChange={handleInputChange}
          min={0}
          max={100}
          step={1}
          mode="range"
          aria-label="Sticker shadow blur in pixels"
        />
        <div className="grid grid-cols-2 gap-2">
          <NumberInput
            label="Offset X"
            name="shadowOffsetX"
            value={layer.shadowOffsetX || 0} // Default to 0 if not set
            onChange={handleInputChange}
            min={-100}
            max={100}
            step={1}
            mode="range"
            aria-label="Sticker shadow X offset"
          />
          <NumberInput
            label="Offset Y"
            name="shadowOffsetY"
            value={layer.shadowOffsetY || 0} // Default to 0 if not set
            onChange={handleInputChange}
            min={-100}
            max={100}
            step={1}
            mode="range"
            aria-label="Sticker shadow Y offset"
          />
        </div>
      </SectionToggle>
      
      <SectionToggle title="Outer Glow Options" isExpanded={isGlowExpanded} onToggle={() => setIsGlowExpanded(!isGlowExpanded)}>
        <ColorInput
          label="Glow Color"
          name="glowColor"
          value={layer.glowColor || '#FFFFFF'} // Default to white if not set
          onChange={handleInputChange}
          aria-label="Sticker glow color"
        />
        <NumberInput
          label="Glow Strength (px)"
          name="glowStrength"
          value={layer.glowStrength || 0} // Default to 0 if not set
          onChange={handleInputChange}
          min={0}
          max={100}
          step={1}
          mode="range"
          aria-label="Sticker glow strength in pixels"
        />
      </SectionToggle>
    </div>
  );
};

export default StickerLayerEditor;
