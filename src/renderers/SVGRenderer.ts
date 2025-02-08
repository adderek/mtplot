import { TextOptions } from '../types';

const SVG_NS = 'http://www.w3.org/2000/svg';

interface SVGRendererOptions {
  highContrast?: boolean;
  interactive?: boolean;
  tooltip?: string;
}

export class SVGRenderer {
  private svg: SVGSVGElement;
  private mainGroup: SVGGElement;
  private tooltip: SVGGElement;
  private tooltipBackground: SVGRectElement;
  private tooltipText: SVGTextElement;
  private width: number;
  private height: number;

  constructor(
    container: HTMLElement,
    options: {
      width: number;
      height: number;
      backgroundColor?: string;
    }
  ) {
    this.width = options.width;
    this.height = options.height;

    // Create SVG element
    this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.svg.setAttribute("width", this.width.toString());
    this.svg.setAttribute("height", this.height.toString());
    this.svg.style.backgroundColor = options.backgroundColor || "#ffffff";

    // Create main group for transformations
    this.mainGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    this.svg.appendChild(this.mainGroup);

    // Create tooltip elements
    this.tooltip = document.createElementNS("http://www.w3.org/2000/svg", "g");
    this.tooltip.style.display = "none";
    
    this.tooltipBackground = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    this.tooltipBackground.setAttribute("fill", "white");
    this.tooltipBackground.setAttribute("stroke", "black");
    this.tooltipBackground.setAttribute("rx", "4");
    this.tooltipBackground.setAttribute("ry", "4");
    
    this.tooltipText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    this.tooltipText.setAttribute("fill", "black");
    this.tooltipText.setAttribute("font-size", "12px");
    
    this.tooltip.appendChild(this.tooltipBackground);
    this.tooltip.appendChild(this.tooltipText);
    this.svg.appendChild(this.tooltip);

    // Add SVG to container
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
    options: {
      interactive?: boolean;
      tooltip?: string;
      highContrast?: boolean;
      isHovered?: boolean;
      onHover?: () => void;
      onLeave?: () => void;
    } = {}
  ): void {
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", x.toString());
    rect.setAttribute("y", y.toString());
    rect.setAttribute("width", width.toString());
    rect.setAttribute("height", height.toString());
    rect.setAttribute("fill", color);
    
    if (options.isHovered) {
      rect.setAttribute("stroke", "#000000");
      rect.setAttribute("stroke-width", "2");
      rect.setAttribute("fill-opacity", "0.8");
    }

    if (options.interactive) {
      rect.style.cursor = "pointer";
      
      if (options.tooltip) {
        rect.addEventListener("mouseenter", (e) => {
          this.showTooltip(options.tooltip!, e.clientX, e.clientY);
          options.onHover?.();
        });
        
        rect.addEventListener("mouseleave", () => {
          this.hideTooltip();
          options.onLeave?.();
        });
        
        rect.addEventListener("mousemove", (e) => {
          this.updateTooltipPosition(e.clientX, e.clientY);
        });
      }
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

  private clientToSVGPoint(clientX: number, clientY: number): { x: number; y: number } {
    const pt = this.svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    
    // Convert client coordinates to SVG coordinates
    const svgP = pt.matrixTransform(this.svg.getScreenCTM()?.inverse());
    return { x: svgP.x, y: svgP.y };
  }

  public showTooltip(text: string, clientX: number, clientY: number): void {
    const svgPoint = this.clientToSVGPoint(clientX, clientY);
    
    // Clear previous tooltip content
    while (this.tooltipText.firstChild) {
      this.tooltipText.removeChild(this.tooltipText.firstChild);
    }
    
    // Add text content
    const tspan = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
    tspan.textContent = text;
    tspan.setAttribute("x", "5");
    tspan.setAttribute("y", "15");
    this.tooltipText.appendChild(tspan);
    
    // Calculate tooltip dimensions
    const bbox = this.tooltipText.getBBox();
    const padding = 5;
    const tooltipWidth = bbox.width + 2 * padding;
    const tooltipHeight = bbox.height + 2 * padding;
    
    // Position tooltip
    let tooltipX = svgPoint.x + 10;
    let tooltipY = svgPoint.y - tooltipHeight - 10;
    
    // Adjust position if tooltip would go outside viewport
    if (tooltipX + tooltipWidth > this.width) {
      tooltipX = svgPoint.x - tooltipWidth - 10;
    }
    if (tooltipY < 0) {
      tooltipY = svgPoint.y + 20;
    }
    
    // Update tooltip position and dimensions
    this.tooltipBackground.setAttribute("x", tooltipX.toString());
    this.tooltipBackground.setAttribute("y", tooltipY.toString());
    this.tooltipBackground.setAttribute("width", tooltipWidth.toString());
    this.tooltipBackground.setAttribute("height", tooltipHeight.toString());
    
    this.tooltipText.setAttribute("transform", `translate(${tooltipX}, ${tooltipY})`);
    
    // Show tooltip
    this.tooltip.style.display = "";
  }

  public hideTooltip(): void {
    this.tooltip.style.display = "none";
  }

  public updateTooltipPosition(clientX: number, clientY: number): void {
    const svgPoint = this.clientToSVGPoint(clientX, clientY);
    const bbox = this.tooltipText.getBBox();
    const padding = 5;
    const tooltipWidth = bbox.width + 2 * padding;
    const tooltipHeight = bbox.height + 2 * padding;
    
    let tooltipX = svgPoint.x + 10;
    let tooltipY = svgPoint.y - tooltipHeight - 10;
    
    if (tooltipX + tooltipWidth > this.width) {
      tooltipX = svgPoint.x - tooltipWidth - 10;
    }
    if (tooltipY < 0) {
      tooltipY = svgPoint.y + 20;
    }
    
    this.tooltipBackground.setAttribute("x", tooltipX.toString());
    this.tooltipBackground.setAttribute("y", tooltipY.toString());
    this.tooltipText.setAttribute("transform", `translate(${tooltipX}, ${tooltipY})`);
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

  public drawLine(x1: number, y1: number, x2: number, y2: number, color: string, width: number): void {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", x1.toString());
    line.setAttribute("y1", y1.toString());
    line.setAttribute("x2", x2.toString());
    line.setAttribute("y2", y2.toString());
    line.setAttribute("stroke", color);
    line.setAttribute("stroke-width", width.toString());
    
    this.mainGroup.appendChild(line);
  }

  public getSVGElement(): SVGSVGElement {
    return this.svg;
  }
}
