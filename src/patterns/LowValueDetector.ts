import { DataPoint, LowValueOptions } from '../types';

export class LowValueDetector {
  private threshold: number;
  private consecutiveDays: number;

  constructor(options: LowValueOptions) {
    this.threshold = options.threshold;
    this.consecutiveDays = options.consecutiveDays;
  }

  findPatterns(data: DataPoint[]): { start: number; end: number }[] {
    if (data.length < this.consecutiveDays) return [];

    const patterns: { start: number; end: number }[] = [];
    const valueRange = this.calculateValueRange(data);
    const lowThreshold = Math.min(...data.map(d => d.y)) + (valueRange * this.threshold);

    let currentSequence: number[] = [];

    data.forEach((point, index) => {
      if (point.y <= lowThreshold) {
        currentSequence.push(index);
      } else {
        if (this.isValidSequence(currentSequence, data)) {
          patterns.push({
            start: currentSequence[0],
            end: currentSequence[currentSequence.length - 1]
          });
        }
        currentSequence = [];
      }
    });

    // Check last sequence
    if (this.isValidSequence(currentSequence, data)) {
      patterns.push({
        start: currentSequence[0],
        end: currentSequence[currentSequence.length - 1]
      });
    }

    return patterns;
  }

  private calculateValueRange(data: DataPoint[]): number {
    const values = data.map(d => d.y);
    return Math.max(...values) - Math.min(...values);
  }

  private isValidSequence(sequence: number[], data: DataPoint[]): boolean {
    if (sequence.length < this.consecutiveDays) return false;

    // Check if points are consecutive days
    for (let i = 1; i < sequence.length; i++) {
      const daysDiff = (data[sequence[i]].x.valueOf() - data[sequence[i-1]].x.valueOf()) / (24 * 60 * 60 * 1000);
      if (daysDiff > 1.1) return false; // Allow small tolerance
    }

    return true;
  }
}
