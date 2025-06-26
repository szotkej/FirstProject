declare module 'react-color' {
  import React from 'react';

  export interface ColorResult {
    hex: string;
    rgb: { r: number; g: number; b: number; a: number };
    hsl: { h: number; s: number; l: number; a: number };
  }

  export interface ColorChangeHandler {
    (color: ColorResult): void;
  }

  export interface SketchPickerProps {
    color?: string | { r: number; g: number; b: number; a?: number } | { h: number; s: number; l: number; a?: number };
    onChange?: ColorChangeHandler;
    className?: string;
  }

  export const SketchPicker: React.FC<SketchPickerProps>;
}