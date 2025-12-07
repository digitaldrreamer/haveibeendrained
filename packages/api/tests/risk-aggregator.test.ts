import { RiskAggregator } from '../src/services/risk-aggregator';
import { DetectionResult } from '../src/services/detector';
import { describe, it, expect } from 'bun:test';

describe('RiskAggregator', () => {
    it('should return SAFE for empty detections', () => {
        const result = RiskAggregator.aggregateRisk([]);
        expect(result.overallRisk).toBe(0);
        expect(result.severity).toBe('SAFE');
        expect(result.recommendations).toHaveLength(0);
    });

    it('should return DRAINED for CRITICAL detection', () => {
        const criticalDetection: DetectionResult = {
            type: 'KNOWN_DRAINER',
            severity: 'CRITICAL',
            confidence: 100,
            affectedAccounts: [],
            suspiciousRecipients: [],
            recommendations: ['Critical warning'],
            timestamp: 0,
            signature: 'sig',
        };

        const result = RiskAggregator.aggregateRisk([criticalDetection]);
        expect(result.overallRisk).toBe(100);
        expect(result.severity).toBe('DRAINED');
        expect(result.recommendations).toContain('Critical warning');
    });

    it('should return AT_RISK for MEDIUM detection', () => {
        const mediumDetection: DetectionResult = {
            type: 'SOL_TRANSFER', // Hypothetical type
            severity: 'MEDIUM',
            confidence: 100,
            affectedAccounts: [],
            suspiciousRecipients: [],
            recommendations: ['Medium warning'],
            timestamp: 0,
            signature: 'sig',
        };

        const result = RiskAggregator.aggregateRisk([mediumDetection]);
        expect(result.overallRisk).toBe(40);
        expect(result.severity).toBe('AT_RISK');
    });

    it('should aggregate multiple detections and take max risk', () => {
        const lowDetection: DetectionResult = {
            type: 'SOL_TRANSFER',
            severity: 'LOW',
            confidence: 100,
            affectedAccounts: [],
            suspiciousRecipients: [],
            recommendations: ['Low warning'],
            timestamp: 0,
            signature: 'sig1',
        };

        const highDetection: DetectionResult = {
            type: 'UNLIMITED_APPROVAL',
            severity: 'HIGH',
            confidence: 100,
            affectedAccounts: [],
            suspiciousRecipients: [],
            recommendations: ['High warning'],
            timestamp: 0,
            signature: 'sig2',
        };

        const result = RiskAggregator.aggregateRisk([lowDetection, highDetection]);
        expect(result.overallRisk).toBe(75); // High severity = 75
        expect(result.severity).toBe('AT_RISK'); // 75 is AT_RISK (>= 40), DRAINED is >= 90
        expect(result.recommendations).toContain('Low warning');
        expect(result.recommendations).toContain('High warning');
    });
});
