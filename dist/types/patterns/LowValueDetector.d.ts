import { DataPoint, LowValueOptions } from '../types';
export declare class LowValueDetector {
    private threshold;
    private consecutiveDays;
    constructor(options: LowValueOptions);
    findPatterns(data: DataPoint[]): {
        start: number;
        end: number;
    }[];
    private calculateValueRange;
    private isValidSequence;
}
