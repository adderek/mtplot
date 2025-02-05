import { DataPoint, StagnationOptions } from '../types';
export declare class StagnationDetector {
    private consecutiveDays;
    private changeThreshold;
    private activeChangePercentage;
    constructor(options: StagnationOptions);
    findPatterns(data: DataPoint[]): {
        start: number;
        end: number;
    }[];
    private calculateAverageChange;
    private hasEnoughActiveChanges;
    private isStagnationPeriod;
}
