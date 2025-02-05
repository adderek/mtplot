import { TextOptions } from '../types';

const SVG_NS = 'http://www.w3.org/2000/svg';

interface SVGRendererOptions {
  highContrast?: boolean;
  interactive?: boolean;
  tooltip?: string;
}

export class SVGRenderer {
  private svg: SVGSVGElement;
  private defs: SVGDefsElement;
  private mainGroup: SVGGElement;
  private width: number;
  private height: number;
  private tooltip: SVGTextElement;
  private tooltipBackground: SVGRectElement;

  constructor(container: HTMLElement, width: number, height: number) {
    this.width = width;
    this.height = height;
    this.svg = document.createElementNS(SVG_NS, 'svg');
    this.svg.setAttribute('width', width.toString());
    this.svg.setAttribute('height', height.toString());
    this.svg.setAttribute('class', 'mtplot-svg');
    
    // Create defs for gradients and patterns
    this.defs = document.createElementNS(SVG_NS, 'defs');
    this.svg.appendChild(this.defs);
    
    // Create main group for transformation
    this.mainGroup = document.createElementNS(SVG_NS, 'g');
    this.svg.appendChild(this.mainGroup);

    // Create tooltip elements
    this.tooltipBackground = document.createElementNS(SVG_NS, 'rect');
    this.tooltipBackground.setAttribute('class', 'mtplot-tooltip-bg');
    this.tooltipBackground.setAttribute('rx', '4');
    this.tooltipBackground.setAttribute('ry', '4');
    this.tooltipBackground.setAttribute('fill', 'white');
    this.tooltipBackground.setAttribute('stroke', '#ccc');
    this.tooltipBackground.style.display = 'none';
    
    this.tooltip = document.createElementNS(SVG_NS, 'text');
    this.tooltip.setAttribute('class', 'mtplot-tooltip');
    this.tooltip.style.display = 'none';
    
    this.svg.appendChild(this.tooltipBackground);
    this.svg.appendChild(this.tooltip);
    
    this.setupSVG(container, width, height);
    
    // Setup pan and zoom handling
    this.setupInteraction();
  }

  private setupSVG(container: HTMLElement, width: number, height: number): void {
    const attributes = [
      ['version', '1.1'],
      ['viewBox', `0 0 ${width} ${height}`],
      ['preserveAspectRatio', 'none'],
      ['style', 'width: 100%; height: 100%;']
    ];

    attributes.forEach(([name, value]) => {
      this.svg.setAttribute(name, value);
    });

    container.appendChild(this.svg);
  }

  private setupInteraction(): void {
    let isPanning = false;
    let startX = 0;
    let startY = 0;
    let currentTransform = { x: 0, y: 0, scale: 1 };

    this.svg.addEventListener('mousedown', (e: MouseEvent) => {
      isPanning = true;
      startX = e.clientX;
      startY = e.clientY;
    });

    this.svg.addEventListener('mousemove', (e: MouseEvent) => {
      if (!isPanning) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      currentTransform.x += dx;
      currentTransform.y += dy;
      startX = e.clientX;
      startY = e.clientY;
      this.updateTransform(currentTransform);
    });

    this.svg.addEventListener('mouseup', () => {
      isPanning = false;
    });

    this.svg.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault();
      const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
      currentTransform.scale *= scaleFactor;
      this.updateTransform(currentTransform);
    });
  }

  private updateTransform(transform: { x: number; y: number; scale: number }): void {
    this.mainGroup.setAttribute(
      'transform',
      `translate(${transform.x},${transform.y}) scale(${transform.scale})`
    );
  }

  public resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.svg.setAttribute('width', width.toString());
    this.svg.setAttribute('height', height.toString());
    this.svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  }

  public clear(): void {
    while (this.mainGroup.firstChild) {
      this.mainGroup.removeChild(this.mainGroup.firstChild);
    }
  }

  public drawBar(
    x: number,
    y: number,
    width: number,
    height: number,
    color: string,
    options: SVGRendererOptions = {}
  ): void {
    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', x.toString());
    rect.setAttribute('y', y.toString());
    rect.setAttribute('width', width.toString());
    rect.setAttribute('height', height.toString());
    
    if (options.highContrast) {
      rect.setAttribute('fill', this.getHighContrastColor(color));
      rect.setAttribute('stroke', 'black');
      rect.setAttribute('stroke-width', '2');
    } else {
      rect.setAttribute('fill', color);
    }

    if (options.interactive) {
      rect.setAttribute('data-tooltip', options.tooltip || '');
      rect.style.cursor = 'pointer';
      this.setupBarInteraction(rect);
    }

    this.mainGroup.appendChild(rect);
  }

  private getHighContrastColor(color: string): string {
    // Convert to high contrast version of the color
    const rgb = this.hexToRgb(color);
    if (!rgb) return color;
    
    const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
    return brightness > 128 ? '#000000' : '#FFFFFF';
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  private setupBarInteraction(element: SVGElement): void {
    element.addEventListener('mouseenter', (e: MouseEvent) => {
      const tooltip = element.getAttribute('data-tooltip');
      if (tooltip) {
        this.showTooltip(tooltip, e.clientX, e.clientY);
      }
    });

    element.addEventListener('mouseleave', () => {
      this.hideTooltip();
    });
  }

  public showTooltip(text: string, x: number, y: number): void {
    // Join text lines with a space
    const combinedText = text.split('\n').join(' ');
    
    // Clear previous tooltip content
    while (this.tooltip.firstChild) {
      this.tooltip.removeChild(this.tooltip.firstChild);
    }
    
    // Add single tspan element with combined text
    const tspan = document.createElementNS(SVG_NS, 'tspan');
    tspan.textContent = combinedText;
    tspan.setAttribute('x', '0');
    this.tooltip.appendChild(tspan);
    
    // Calculate tooltip dimensions
    const bbox = this.tooltip.getBBox();
    const padding = 8;
    const tooltipWidth = bbox.width + 2 * padding;
    const tooltipHeight = bbox.height + 2 * padding;
    
    // Position the text vertically centered with padding
    tspan.setAttribute('y', (padding + bbox.height).toString());
    
    // Calculate position that keeps tooltip within bounds
    let tooltipX = x + 10; // Default offset from cursor
    let tooltipY = y - tooltipHeight - 10; // Default position above cursor
    
    // Adjust horizontal position if tooltip would go outside right edge
    if (tooltipX + tooltipWidth > this.width) {
      tooltipX = x - tooltipWidth - 10; // Place tooltip to the left of cursor
    }
    
    // Adjust vertical position if tooltip would go outside top edge
    if (tooltipY < 0) {
      tooltipY = y + 20; // Place tooltip below cursor
    }
    
    // Ensure tooltip doesn't go outside left or bottom edges
    tooltipX = Math.max(5, Math.min(this.width - tooltipWidth - 5, tooltipX));
    tooltipY = Math.max(5, Math.min(this.height - tooltipHeight - 5, tooltipY));
    
    // Position the tooltip and background
    this.tooltip.setAttribute('transform', `translate(${tooltipX}, ${tooltipY})`);
    this.tooltipBackground.setAttribute('x', tooltipX.toString());
    this.tooltipBackground.setAttribute('y', tooltipY.toString());
    this.tooltipBackground.setAttribute('width', tooltipWidth.toString());
    this.tooltipBackground.setAttribute('height', tooltipHeight.toString());
    
    // Show the tooltip
    this.tooltipBackground.style.display = '';
    this.tooltip.style.display = '';
  }

  public hideTooltip(): void {
    this.tooltipBackground.style.display = 'none';
    this.tooltip.style.display = 'none';
  }

  public drawPattern(
    x: number,
    y: number,
    width: number,
    height: number,
    color: string,
    patternType?: string
  ): void {
    const pattern = document.createElementNS(SVG_NS, 'rect');
    pattern.setAttribute('x', x.toString());
    pattern.setAttribute('y', y.toString());
    pattern.setAttribute('width', width.toString());
    pattern.setAttribute('height', height.toString());
    pattern.setAttribute('fill', color);
    pattern.setAttribute('fill-opacity', '0.3');
    
    // Add pattern-specific styling
    if (patternType) {
      switch (patternType) {
        case 'lowValue':
          pattern.setAttribute('stroke', 'red');
          pattern.setAttribute('stroke-dasharray', '4,4');
          break;
        case 'stagnation':
          pattern.setAttribute('stroke', 'orange');
          pattern.setAttribute('stroke-width', '2');
          break;
      }
    }

    this.mainGroup.appendChild(pattern);
  }

  public drawText(x: number, y: number, text: string, options: TextOptions = {}): void {
    const textElem = document.createElementNS(SVG_NS, 'text');
    const attrs = [
      ['x', x.toString()],
      ['y', y.toString()],
      ['fill', options.color || 'black'],
      ['font-family', options.fontFamily || 'monospace'],
      ['font-size', (options.fontSize || 12).toString()]
    ];

    if (options.stroke) {
      attrs.push(['stroke', options.stroke]);
      attrs.push(['stroke-width', (options.strokeWidth || 1).toString()]);
    }

    attrs.forEach(([name, value]) => textElem.setAttribute(name, value));
    textElem.textContent = text;
    this.mainGroup.appendChild(textElem);
  }

  public getSVGElement(): SVGSVGElement {
    return this.svg;
  }
}
