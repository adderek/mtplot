export interface DataPoint {
  x: Date;
  y: number;
}

export interface PlotOptions {
  width?: number;
  height?: number;
  theme?: Theme;
  patterns?: PatternDetectionOptions;
  responsive?: boolean;
  accessibility?: {
    enableKeyboardNavigation?: boolean;
    enableScreenReader?: boolean;
    highContrast?: boolean;
    ariaLabel?: string;
  };
  interaction?: {
    enableZoom?: boolean;
    enablePan?: boolean;
    tooltipFormat?: (point: DataPoint) => string;
    onPointClick?: (point: DataPoint) => void;
  };
  performance?: {
    enableVirtualization?: boolean;
    clusteringThreshold?: number;
    useWebWorker?: boolean;
  };
  statistics?: {
    enabled?:boolean;
    showMean?: boolean;
    showMedian?: boolean;
    showMovingAverage?: boolean;
    lineColor?: {
      mean?: string;
      median?: string;
      movingAverage?: string;
    };
  };
}

export interface Theme {
  barColor: string;
  barHoverColor: string;
  lowValueColor: string;
  stagnationColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  fontSize: number;
}

export interface PatternDetectionOptions {
  lowValue?: LowValueOptions;
  stagnation?: StagnationOptions;
}

export interface LowValueOptions {
  threshold: number;
  consecutiveDays: number;
}

export interface StagnationOptions {
  consecutiveDays: number;
  changeThreshold: number;
  activeChangePercentage: number;
}

export interface Renderer {
  clear(): void;
  drawBar(x: number, y: number, width: number, height: number, color: string): void;
  drawPattern(x: number, y: number, width: number, height: number, color: string): void;
  drawText(x: number, y: number, text: string, options?: TextOptions): void;
}

export interface TextOptions {
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  stroke?: string;
  strokeWidth?: number;
}
