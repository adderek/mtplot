import { TextOptions } from '../types';
export declare class SVGRenderer {
    private svg;
    private mainGroup;
    private tooltip;
    private tooltipBackground;
    private tooltipText;
    private width;
    private height;
    constructor(container: HTMLElement, options: {
        width: number;
        height: number;
        backgroundColor?: string;
    });
    private setupInteraction;
    private updateTransform;
    resize(width: number, height: number): void;
    clear(): void;
    drawBar(x: number, y: number, width: number, height: number, color: string, options?: {
        interactive?: boolean;
        tooltip?: string;
        highContrast?: boolean;
        isHovered?: boolean;
        onHover?: () => void;
        onLeave?: () => void;
    }): void;
    private getHighContrastColor;
    private hexToRgb;
    private setupBarInteraction;
    private clientToSVGPoint;
    showTooltip(text: string, clientX: number, clientY: number): void;
    hideTooltip(): void;
    updateTooltipPosition(clientX: number, clientY: number): void;
    drawPattern(x: number, y: number, width: number, height: number, color: string, patternType?: string): void;
    drawText(x: number, y: number, text: string, options?: TextOptions): void;
    drawLine(x1: number, y1: number, x2: number, y2: number, color: string, width: number): void;
    getSVGElement(): SVGSVGElement;
}
