import { DataPoint, StagnationOptions } from '../types';

export class StagnationDetector {
  private consecutiveDays: number;
  private changeThreshold: number;
  private activeChangePercentage: number;

  constructor(options: StagnationOptions) {
    this.consecutiveDays = options.consecutiveDays;
    this.changeThreshold = options.changeThreshold;
    this.activeChangePercentage = options.activeChangePercentage;
  }

  findPatterns(data: DataPoint[]): { start: number; end: number }[] {
    if (data.length < this.consecutiveDays) return [];

    const patterns: { start: number; end: number }[] = [];
    const avgDailyChange = this.calculateAverageChange(data);
    
    if (!this.hasEnoughActiveChanges(data, avgDailyChange)) {
      return [];
    }

    let currentSequence: number[] = [];
    const significantChangeThreshold = avgDailyChange * this.changeThreshold;

    data.forEach((point, index) => {
      currentSequence.push(index);

      if (index === data.length - 1 || 
          Math.abs(data[index + 1].y - point.y) > significantChangeThreshold) {
        if (this.isStagnationPeriod(currentSequence, data, significantChangeThreshold)) {
          patterns.push({
            start: currentSequence[0],
            end: currentSequence[currentSequence.length - 1]
          });
        }
        currentSequence = [];
      }
    });

    return patterns;
  }

  private calculateAverageChange(data: DataPoint[]): number {
    if (data.length < 2) return 0;

    let totalChange = 0;
    let changes = 0;

    for (let i = 1; i < data.length; i++) {
      const change = Math.abs(data[i].y - data[i-1].y);
      if (change > 0) {
        totalChange += change;
        changes++;
      }
    }

    return changes > 0 ? totalChange / changes : 0;
  }

  private hasEnoughActiveChanges(data: DataPoint[], avgDailyChange: number): boolean {
    if (data.length < 2) return false;

    let significantChanges = 0;
    const significantChangeThreshold = avgDailyChange * this.changeThreshold;

    for (let i = 1; i < data.length; i++) {
      const change = Math.abs(data[i].y - data[i-1].y);
      if (change > significantChangeThreshold) {
        significantChanges++;
      }
    }

    return (significantChanges / (data.length - 1)) >= this.activeChangePercentage;
  }

  private isStagnationPeriod(
    sequence: number[], 
    data: DataPoint[], 
    significantChangeThreshold: number
  ): boolean {
    if (sequence.length < this.consecutiveDays) return false;

    // Check if points are consecutive days
    for (let i = 1; i < sequence.length; i++) {
      const daysDiff = (data[sequence[i]].x.valueOf() - data[sequence[i-1]].x.valueOf()) / (24 * 60 * 60 * 1000);
      if (daysDiff > 1.1) return false;
    }

    // Check if changes are below threshold
    for (let i = 1; i < sequence.length; i++) {
      const change = Math.abs(data[sequence[i]].y - data[sequence[i-1]].y);
      if (change > significantChangeThreshold) return false;
    }

    return true;
  }
}
