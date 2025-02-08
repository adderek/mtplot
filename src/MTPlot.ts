import { SVGRenderer } from './renderers/SVGRenderer';
import { LowValueDetector } from './patterns/LowValueDetector';
import { StagnationDetector } from './patterns/StagnationDetector';
import { DataPoint, PlotOptions, Theme, PatternDetectionOptions, Dataset } from './types';
import { calculateMean, calculateMedian, calculateMovingAverage } from './utils/Statistics';
import { formatDate } from './utils/DateUtils';

const DEFAULT_THEME: Theme = {
  barColor: 'black',
  barHoverColor: 'blue',
  lowValueColor: 'rgba(255,0,0,0.2)',
  stagnationColor: 'rgba(255,165,0,0.2)',
  backgroundColor: 'white',
  textColor: 'black',
  fontFamily: 'monospace',
  fontSize: 12
};

const DEFAULT_OPTIONS: PlotOptions = {
  width: 800,
  height: 400,
  theme: DEFAULT_THEME,
  patterns: {
    lowValue: {
      threshold: 0.02,
      consecutiveDays: 2
    },
    stagnation: {
      consecutiveDays: 3,
      changeThreshold: 0.2,
      activeChangePercentage: 0.85
    }
  },
  responsive: true,
  accessibility: {
    enableKeyboardNavigation: true,
    enableScreenReader: true,
    highContrast: false,
    ariaLabel: 'Time series chart'
  },
  interaction: {
    enableZoom: true,
    enablePan: true,
    tooltipFormat: (point: DataPoint) => `${formatDate(point.x)}: ${point.y}`,
    onPointClick: undefined
  },
  performance: {
    enableVirtualization: true,
    clusteringThreshold: 1000,
    useWebWorker: true
  }
};

export class MTPlot {
  private container: HTMLElement;
  private renderer: SVGRenderer;
  private options: PlotOptions;
  private data: DataPoint[];
  private trendLine: { slope: number; intercept: number } | null = null;
  private lowValueDetector: LowValueDetector;
  private stagnationDetector: StagnationDetector;
  private isDirty: boolean = false;
  private hoveredBarIndex: number | null = null;
  private updateTimeout: number | null = null;
  private refreshDelay: number = 100;
  private resizeObserver: ResizeObserver | null = null;
  private tooltip: HTMLDivElement | null = null;
  private worker: Worker | null = null;
  private zoom: { scale: number; offset: { x: number; y: number } } = {
    scale: 1,
    offset: { x: 0, y: 0 }
  };
  private clusterData: DataPoint[] = []; // Initialize as an empty array

  constructor(containerId: string, initialData: DataPoint[] = [], options: Partial<PlotOptions> = {}) {
    const container = document.getElementById(containerId);
    if (!container) throw new Error(`No element found with id: ${containerId}`);
    
    this.container = container;
    
    // Initialize options with defaults
    this.options = {
      width: 800,
      height: 400,
      responsive: true,
      theme: {
        backgroundColor: "#ffffff",
        barColor: "#4CAF50",
        textColor: "#000000",
        gridColor: "#e0e0e0"
      },
      patterns: {
        lowValue: {
          threshold: 0.02,
          consecutiveDays: 2
        },
        stagnation: {
          consecutiveDays: 3,
          changeThreshold: 0.2,
          activeChangePercentage: 0.85
        }
      },
      accessibility: {
        enableKeyboardNavigation: true,
        enableScreenReader: true,
        highContrast: false,
        ariaLabel: 'Time series chart'
      },
      interaction: {
        enableZoom: true,
        enablePan: true,
        tooltipFormat: (point: DataPoint) => `${formatDate(point.x)}: ${point.y}`,
        onPointClick: undefined
      },
      performance: {
        enableVirtualization: true,
        clusteringThreshold: 1000,
        useWebWorker: true
      },
      statistics: {
        enabled: false,
        showMean: false,
        showMedian: false,
        showMovingAverage: false,
        lineColor: {
          mean: "#FF0000",
          median: "#0000FF",
          movingAverage: "#00FF00"
        }
      },
      ...options
    };

    // Initialize pattern detectors first
    this.lowValueDetector = new LowValueDetector(this.options.patterns!.lowValue!);
    this.stagnationDetector = new StagnationDetector(this.options.patterns!.stagnation!);
    
    // Initialize renderer
    this.renderer = new SVGRenderer(this.container, {
      width: this.getWidth(),
      height: this.getHeight(),
      backgroundColor: this.options.theme!.backgroundColor
    });

    // Initialize data with sorting and clustering if needed
    this.data = this.processInitialData(initialData);
    
    // Set up resize handling if responsive
    if (this.options.responsive) {
      this.setupResizeHandling();
    }
    
    // Initial render
    this.render();
  }

  private setupTooltip(): void {
    this.tooltip = document.createElement('div');
    this.tooltip.style.cssText = `
      position: absolute;
      display: none;
      background: white;
      border: 1px solid #ccc;
      padding: 8px;
      border-radius: 4px;
      pointer-events: none;
      z-index: 1000;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    `;
    document.body.appendChild(this.tooltip);
  }

  private setupWebWorker(): void {
    const workerCode = `
      self.onmessage = function(e) {
        const { data, patterns } = e.data;
        const results = {
          lowValue: findLowValuePatterns(data, patterns.lowValue),
          stagnation: findStagnationPatterns(data, patterns.stagnation)
        };
        self.postMessage(results);
      };
    `;
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    this.worker = new Worker(URL.createObjectURL(blob));
    this.worker.onmessage = (e) => {
      this.handleWorkerResults(e.data);
    };
  }

  private setupAccessibility(): void {
    const svg = this.renderer.getSVGElement();
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', this.options.accessibility?.ariaLabel || 'Time series chart');
    
    if (this.options.accessibility?.enableKeyboardNavigation) {
      svg.setAttribute('tabindex', '0');
      svg.addEventListener('keydown', this.handleKeyboardNavigation.bind(this));
    }
  }

  private setupResizeHandling(): void {
    // Create ResizeObserver to handle container resizing
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === this.container) {
          this.handleResize();
        }
      }
    });

    // Start observing the container
    this.resizeObserver.observe(this.container);

    // Also handle window resize events
    window.addEventListener('resize', () => {
      this.handleResize();
    });
  }

  private handleResize(): void {
    // Update SVG dimensions
    const newWidth = this.getWidth();
    const newHeight = this.getHeight();
    
    this.renderer.resize(newWidth, newHeight);
    this.triggerUpdate();
  }

  private getWidth(): number {
    return this.options.responsive ? 
      this.container.clientWidth : 
      this.options.width!;
  }

  private getHeight(): number {
    return this.options.responsive ? 
      this.container.clientHeight : 
      this.options.height!;
  }

  private processInitialData(data: DataPoint[]): DataPoint[] {
    let processedData = [...data].sort((a, b) => a.x.valueOf() - b.x.valueOf());
    
    // Calculate trend line
    if (processedData.length > 0) {
      this.calculateTrendLine(processedData);
    }
    
    return processedData;
  }

  private calculateTrendLine(data: DataPoint[]): void {
    // Find low value periods to exclude them
    const lowValuePatterns = this.lowValueDetector.findPatterns(data);
    const lowValueIndices = new Set<number>();
    
    lowValuePatterns.forEach(pattern => {
      for (let i = pattern.start; i <= pattern.end; i++) {
        lowValueIndices.add(i);
      }
    });

    // Filter out low value periods
    const filteredData = data.filter((_, index) => !lowValueIndices.has(index));
    
    if (filteredData.length < 2) return; // Need at least 2 points for a trend line
    
    const xVals = filteredData.map((_, i) => i);
    const yVals = filteredData.map(point => point.y);
    
    const xMean = xVals.reduce((a, b) => a + b, 0) / xVals.length;
    const yMean = yVals.reduce((a, b) => a + b, 0) / yVals.length;
    
    const ssxy = xVals.reduce((sum, x, i) => sum + (x - xMean) * (yVals[i] - yMean), 0);
    const ssxx = xVals.reduce((sum, x) => sum + (x - xMean) * (x - xMean), 0);
    
    const slope = ssxy / ssxx;
    const intercept = yMean - slope * xMean;
    
    this.trendLine = { slope, intercept };
  }

  private handleKeyboardNavigation(e: KeyboardEvent): void {
    if (!this.options.accessibility?.enableKeyboardNavigation) return;

    switch (e.key) {
      case 'ArrowLeft':
        this.zoom.offset.x -= 10;
        break;
      case 'ArrowRight':
        this.zoom.offset.x += 10;
        break;
      case 'ArrowUp':
        this.zoom.scale *= 1.1;
        break;
      case 'ArrowDown':
        this.zoom.scale /= 1.1;
        break;
    }
    this.triggerUpdate();
  }

  private handleWorkerResults(results: any): void {
    // Handle pattern detection results from worker
    this.drawPatterns(this.calculateValueRange(), this.calculateTimeRange());
  }

  private setupEventListeners(): void {
    // Add mouse move listener for hover effects
    this.container.addEventListener('mousemove', (e: MouseEvent) => {
      const rect = this.container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Find the closest data point
      const timeRange = this.calculateTimeRange();
      const hoveredTime = this.getTimeFromX(x, timeRange);
      const closestPoint = this.findClosestPoint(hoveredTime);
      
      if (closestPoint) {
        // Format tooltip text with date and value on separate lines
        const tooltipText = this.options.interaction?.tooltipFormat?.(closestPoint) || 
          `Date: ${closestPoint.x.toLocaleDateString()}, Value: ${closestPoint.y.toFixed(2)}`;
        
        this.renderer.showTooltip(tooltipText, e.clientX, e.clientY);
      }
    });

    this.container.addEventListener('mouseleave', () => {
      this.renderer.hideTooltip();
    });

    // Add resize observer for responsive behavior
    const resizeObserver = new ResizeObserver(() => {
      this.triggerUpdate();
    });
    resizeObserver.observe(this.container);

    // Setup keyboard navigation
    this.container.tabIndex = 0;
    this.container.addEventListener('keydown', this.handleKeyboardNavigation.bind(this));
  }

  private getTimeFromX(x: number, timeRange: { min: number; max: number }): number {
    const ratio = x / this.options.width!;
    return timeRange.min + (timeRange.max - timeRange.min) * ratio;
  }

  private findClosestPoint(timestamp: number): DataPoint | null {
    if (!this.data.length) return null;

    let closest = this.data[0];
    let minDiff = Math.abs(closest.x.valueOf() - timestamp);

    for (const point of this.data) {
      const diff = Math.abs(point.x.valueOf() - timestamp);
      if (diff < minDiff) {
        minDiff = diff;
        closest = point;
      }
    }

    return closest;
  }

  private drawTrendLine(valueRange: { min: number; max: number }, timeRange: { min: number; max: number }): void {
    if (!this.trendLine || !this.data.length) return;

    const { slope, intercept } = this.trendLine;
    
    // Calculate start and end points for trend line
    const startX = this.getXPosition(this.data[0].x, timeRange);
    const endX = this.getXPosition(this.data[this.data.length - 1].x, timeRange);
    
    const startY = this.scaleY(slope * 0 + intercept, valueRange);
    const endY = this.scaleY(slope * (this.data.length - 1) + intercept, valueRange);
    
    this.renderer.drawLine(
      startX,
      startY,
      endX,
      endY,
      "#ff0000",
      2
    );
  }

  private render(): void {
    if (!this.isDirty) return;
    
    this.renderer.clear();
    if (this.data.length === 0) return;

    const { width, height } = this.options;
    const valueRange = this.calculateValueRange();
    const timeRange = this.calculateTimeRange();

    // Draw patterns first (background)
    this.drawPatterns(valueRange, timeRange);
    
    // Draw bars
    this.drawBars(valueRange, timeRange);
    
    // Draw trend line on top
    this.drawTrendLine(valueRange, timeRange);

    // Draw statistics if enabled
    if (this.options.statistics?.enabled) {
      this.drawStatistics(valueRange);
    }

    this.isDirty = false;
  }

  private addData(point: DataPoint): void {
    this.data.push(point);
    this.data.sort((a, b) => a.x.valueOf() - b.x.valueOf());
    this.calculateTrendLine(this.data);
    this.triggerUpdate();
  }

  private triggerUpdate(): void {
    if (this.updateTimeout) {
      window.clearTimeout(this.updateTimeout);
    }
    
    this.isDirty = true;
    this.updateTimeout = window.setTimeout(() => {
      this.update();
      this.updateTimeout = null;
    }, this.refreshDelay);
  }

  private update(): void {
    if (!this.isDirty) return;
    
    this.renderer.clear();
    if (this.data.length === 0) return;

    const { width, height } = this.options;
    const valueRange = this.calculateValueRange();
    const timeRange = this.calculateTimeRange();
    
    // Draw patterns first (background)
    this.drawPatterns(valueRange, timeRange);
    
    // Draw bars
    this.drawBars(valueRange, timeRange);
    
    // Draw trend line on top
    this.drawTrendLine(valueRange, timeRange);

    // Draw statistics if enabled
    if (this.options.statistics?.enabled) {
      this.drawStatistics(valueRange);
    }

    this.isDirty = false;
  }

  private calculateValueRange(): { min: number; max: number } {
    const values = this.data.map(d => d.y);
    return {
      min: Math.min(...values),
      max: Math.max(...values)
    };
  }

  private calculateTimeRange(): { min: number; max: number } {
    const times = this.data.map(d => d.x.valueOf());
    return {
      min: Math.min(...times),
      max: Math.max(...times)
    };
  }

  private drawPatterns(valueRange: { min: number; max: number }, timeRange: { min: number; max: number }): void {
    // Draw low value patterns
    const lowValuePatterns = this.lowValueDetector.findPatterns(this.data);
    lowValuePatterns.forEach(pattern => {
      const startX = this.getXPosition(this.data[pattern.start].x, timeRange);
      const endX = this.getXPosition(this.data[pattern.end].x, timeRange);
      this.renderer.drawPattern(
        startX,
        0,
        endX - startX,
        this.getHeight(),
        this.options.theme!.lowValueColor,
        'lowValue'
      );
    });

    // Draw stagnation patterns
    const stagnationPatterns = this.stagnationDetector.findPatterns(this.data);
    stagnationPatterns.forEach(pattern => {
      const startX = this.getXPosition(this.data[pattern.start].x, timeRange);
      const endX = this.getXPosition(this.data[pattern.end].x, timeRange);
      this.renderer.drawPattern(
        startX,
        0,
        endX - startX,
        this.getHeight(),
        this.options.theme!.stagnationColor,
        'stagnation'
      );
    });
  }

  private drawBars(valueRange: { min: number; max: number }, timeRange: { min: number; max: number }): void {
    for (let i = 0; i < this.data.length; i++) {
      const point = this.data[i];
      const nextPoint = this.data[i + 1];
      
      const x = this.getXPosition(point.x, timeRange);
      const y = this.scaleY(point.y, valueRange);
      const width = nextPoint 
        ? this.getXPosition(nextPoint.x, timeRange) - x
        : 10;
      const height = this.options.height! - y;
      
      // Format tooltip text with date and value on the same line
      const tooltipText = this.options.interaction?.tooltipFormat?.(point) || 
        `Date: ${point.x.toLocaleDateString()}, Value: ${point.y.toFixed(2)}`;

      const isHovered = i === this.hoveredBarIndex;
      
      this.renderer.drawBar(
        x,
        y,
        width,
        height,
        this.options.theme!.barColor,
        {
          interactive: true,
          tooltip: tooltipText,
          highContrast: this.options.accessibility?.highContrast,
          isHovered,
          onHover: () => {
            this.hoveredBarIndex = i;
            this.triggerUpdate();
          },
          onLeave: () => {
            this.hoveredBarIndex = null;
            this.triggerUpdate();
          }
        }
      );
    }
  }

  private drawStatistics(valueRange: { min: number; max: number }): void {
    const values = this.data.map(d => d.y);
    const mean = calculateMean(values);
    const median = calculateMedian(values);
    
    // Draw mean line
    this.renderer.drawPattern(
      0,
      this.scaleY(mean, valueRange),
      this.options.width!,
      1,
      'rgba(0,0,255,0.5)'
    );
    
    // Draw median line
    this.renderer.drawPattern(
      0,
      this.scaleY(median, valueRange),
      this.options.width!,
      1,
      'rgba(0,255,0,0.5)'
    );
  }

  private getXPosition(x: Date, range: { min: number; max: number }): number {
    return ((x.valueOf() - range.min) / (range.max - range.min)) * this.options.width!;
  }

  private scaleY(y: number, range: { min: number; max: number }): number {
    return this.options.height! - ((y - range.min) / (range.max - range.min)) * this.options.height!;
  }

  // Public API methods for statistics
  public getStatistics() {
    const values = this.data.map(d => d.y);
    return {
      mean: calculateMean(values),
      median: calculateMedian(values),
      movingAverage: calculateMovingAverage(values, 5)
    };
  }

  // Export methods
  public exportToCSV(): string {
    const headers = ['Date', 'Value'];
    const rows = this.data.map(point => [
      point.x.toISOString(),
      point.y.toString()
    ]);
    
    return [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');
  }

  public exportToSVG(): string {
    return this.renderer.getSVGElement().outerHTML;
  }

  public setTheme(theme: Partial<Theme>): void {
    this.options.theme = {
      ...this.options.theme!,
      ...theme
    };
    this.triggerUpdate();
  }

  public setPatternOptions(options: Partial<PatternDetectionOptions>): void {
    if (options.lowValue) {
      this.lowValueDetector = new LowValueDetector({
        ...this.options.patterns!.lowValue!,
        ...options.lowValue
      });
    }
    
    if (options.stagnation) {
      this.stagnationDetector = new StagnationDetector({
        ...this.options.patterns!.stagnation!,
        ...options.stagnation
      });
    }
    
    this.options.patterns = {
      ...this.options.patterns!,
      ...options
    };
    
    this.triggerUpdate();
  }

  public setOptions(options: Partial<PlotOptions>): void {
    this.options = {
      ...this.options,
      ...options
    };

    // Update renderer if dimensions changed
    if (options.width !== undefined || options.height !== undefined) {
      this.renderer.resize(this.getWidth(), this.getHeight());
    }

    // Update pattern detectors if pattern options changed
    if (options.patterns) {
      if (options.patterns.lowValue) {
        this.lowValueDetector = new LowValueDetector({
          ...this.options.patterns?.lowValue ?? {},
          ...options.patterns.lowValue
        });
      }
      if (options.patterns.stagnation) {
        this.stagnationDetector = new StagnationDetector({
          ...this.options.patterns?.stagnation ?? {},
          ...options.patterns.stagnation
        });
      }
    }

    this.triggerUpdate();
  }
}
