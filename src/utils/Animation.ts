type EasingFunction = (t: number) => number;

export const Easing = {
  linear: (t: number): number => t,
  
  easeInOut: (t: number): number => 
    t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  
  elastic: (t: number): number => {
    const p = 0.3;
    return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
  }
};

export interface AnimationOptions {
  duration?: number;
  easing?: 'linear' | 'easeInOut' | 'elastic';
  onUpdate?: (value: number) => void;
  onComplete?: () => void;
}

export class Animation {
  private startValue: number;
  private endValue: number;
  private startTime: number;
  private duration: number;
  private easingFn: EasingFunction;
  private onUpdate: (value: number) => void;
  private onComplete?: () => void;
  private animationFrame: number | null = null;

  constructor(
    startValue: number,
    endValue: number,
    options: AnimationOptions = {}
  ) {
    this.startValue = startValue;
    this.endValue = endValue;
    this.startTime = performance.now();
    this.duration = options.duration || 300;
    this.easingFn = Easing[options.easing || 'easeInOut'];
    this.onUpdate = options.onUpdate || (() => {});
    this.onComplete = options.onComplete;
  }

  public start(): void {
    this.animate();
  }

  public stop(): void {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  private animate = (): void => {
    const currentTime = performance.now();
    const elapsed = currentTime - this.startTime;
    const progress = Math.min(elapsed / this.duration, 1);

    if (progress < 1) {
      const easedProgress = this.easingFn(progress);
      const currentValue = this.startValue + (this.endValue - this.startValue) * easedProgress;
      this.onUpdate(currentValue);
      this.animationFrame = requestAnimationFrame(this.animate);
    } else {
      this.onUpdate(this.endValue);
      if (this.onComplete) {
        this.onComplete();
      }
    }
  };
}
