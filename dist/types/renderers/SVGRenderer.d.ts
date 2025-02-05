import { TextOptions } from '../types';
interface SVGRendererOptions {
    highContrast?: boolean;
    interactive?: boolean;
    tooltip?: string;
}
export declare class SVGRenderer {
    private svg;
    private defs;
    private mainGroup;
    private width;
    private height;
    private tooltip;
    private tooltipBackground;
    constructor(container: HTMLElement, width: number, height: number);
    private setupSVG;
    private setupInteraction;
    private updateTransform;
    resize(width: number, height: number): void;
    clear(): void;
    drawBar(x: number, y: number, width: number, height: number, color: string, options?: SVGRendererOptions): void;
    private getHighContrastColor;
    private hexToRgb;
    private setupBarInteraction;
    showTooltip(text: string, x: number, y: number): void;
    hideTooltip(): void;
    drawPattern(x: number, y: number, width: number, height: number, color: string, patternType?: string): void;
    drawText(x: number, y: number, text: string, options?: TextOptions): void;
    getSVGElement(): SVGSVGElement;
}
export {};
