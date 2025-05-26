
import React, { useState } from 'react';
import { TextLayerProps } from '../types';
import { DEFAULT_FONTS, BRAND_COLORS } from '../constants';
import { Input } from './common/Input';
import { Select } from './common/Select';
import { ColorInput } from './common/ColorInput';
import { NumberInput } from './common/NumberInput';
import { Button } from './common/Button';
import { Icon } from './common/Icon';

interface TextLayerEditorProps {
  layer: TextLayerProps;
  onUpdateLayer: (props: Partial<TextLayerProps>) => void;
}

const TextLayerEditor: React.FC<TextLayerEditorProps> = ({ layer, onUpdateLayer }) => {
  const [isOutlineExpanded, setIsOutlineExpanded] = useState(false);
  const [isShadowExpanded, setIsShadowExpanded] = useState(false);
  const [isGlowExpanded, setIsGlowExpanded] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let parsedValue: string | number = value;
    if (e.target.type === 'number') {
      parsedValue = parseFloat(value);
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
      <Input
        label="Text Content"
        name="text"
        value={layer.text}
        onChange={handleInputChange}
        type="textarea"
        rows={3}
        aria-label="Text content for the layer"
      />
      <Select
        label="Font Family"
        name="fontFamily"
        value={layer.fontFamily}
        onChange={handleInputChange}
        options={DEFAULT_FONTS}
        aria-label="Font family for the text"
      />
      <NumberInput
        label="Font Size (px)"
        name="fontSize"
        value={layer.fontSize}
        onChange={handleInputChange}
        min={8}
        max={200}
        step={1}
        aria-label="Font size in pixels"
      />
      <ColorInput
        label="Text Color"
        name="color"
        value={layer.color}
        onChange={handleInputChange}
        aria-label="Text color"
      />

      <SectionToggle title="Outline Options" isExpanded={isOutlineExpanded} onToggle={() => setIsOutlineExpanded(!isOutlineExpanded)}>
        <ColorInput
          label="Outline Color"
          name="outlineColor"
          value={layer.outlineColor}
          onChange={handleInputChange}
          aria-label="Text outline color"
        />
        <NumberInput
          label="Outline Width (px)"
          name="outlineWidth"
          value={layer.outlineWidth}
          onChange={handleInputChange}
          min={0}
          max={20}
          step={0.5}
          aria-label="Text outline width in pixels"
        />
      </SectionToggle>

      <SectionToggle title="Shadow Options" isExpanded={isShadowExpanded} onToggle={() => setIsShadowExpanded(!isShadowExpanded)}>
        <ColorInput
          label="Shadow Color"
          name="shadowColor"
          value={layer.shadowColor}
          onChange={handleInputChange}
          aria-label="Text shadow color"
        />
        <NumberInput
          label="Shadow Blur (px)"
          name="shadowBlur"
          value={layer.shadowBlur}
          onChange={handleInputChange}
          min={0}
          max={50}
          step={1}
          aria-label="Text shadow blur in pixels"
        />
        <div className="grid grid-cols-2 gap-2">
          <NumberInput
            label="Offset X"
            name="shadowOffsetX"
            value={layer.shadowOffsetX}
            onChange={handleInputChange}
            min={-50}
            max={50}
            step={1}
            aria-label="Text shadow X offset"
          />
          <NumberInput
            label="Offset Y"
            name="shadowOffsetY"
            value={layer.shadowOffsetY}
            onChange={handleInputChange}
            min={-50}
            max={50}
            step={1}
            aria-label="Text shadow Y offset"
          />
        </div>
      </SectionToggle>
      
      <SectionToggle title="Outer Glow Options" isExpanded={isGlowExpanded} onToggle={() => setIsGlowExpanded(!isGlowExpanded)}>
        <ColorInput
          label="Glow Color"
          name="glowColor"
          value={layer.glowColor}
          onChange={handleInputChange}
          aria-label="Text glow color"
        />
        <NumberInput
          label="Glow Strength (px)"
          name="glowStrength"
          value={layer.glowStrength}
          onChange={handleInputChange}
          min={0}
          max={50}
          step={1}
          aria-label="Text glow strength in pixels"
        />
      </SectionToggle>
    </div>
  );
};

export default TextLayerEditor;
