import { RecommendationEngine } from '../src/services/recommendations';
import { RiskReport } from '../src/services/risk-aggregator';
import { describe, it, expect } from 'bun:test';

describe('RecommendationEngine', () => {
    it('should generate critical advice for DRAINED severity', () => {
        const report: RiskReport = {
            overallRisk: 100,
            severity: 'DRAINED',
            detections: [],
            affectedAssets: { tokens: [], nfts: [], sol: 0 },
            recommendations: [],
        };

        const advice = RecommendationEngine.generateRecommendations(report);
        expect(advice.some(a => a.includes('IMMEDIATE ACTION REQUIRED'))).toBe(true);
        expect(advice.some(a => a.includes('Create a NEW wallet'))).toBe(true);
    });

    it('should generate specific advice for SetAuthority', () => {
        const report: RiskReport = {
            overallRisk: 100,
            severity: 'DRAINED',
            detections: [{
                type: 'SET_AUTHORITY',
                severity: 'CRITICAL',
                confidence: 100,
                affectedAccounts: [],
                suspiciousRecipients: [],
                recommendations: [],
                timestamp: 0,
                signature: 'sig',
            }],
            affectedAssets: { tokens: [], nfts: [], sol: 0 },
            recommendations: [],
        };

        const advice = RecommendationEngine.generateRecommendations(report);
        expect(advice.some(a => a.includes('Token account ownership transferred'))).toBe(true);
    });

    it('should generate specific advice for Unlimited Approval', () => {
        const report: RiskReport = {
            overallRisk: 75,
            severity: 'AT_RISK',
            detections: [{
                type: 'UNLIMITED_APPROVAL',
                severity: 'HIGH',
                confidence: 100,
                affectedAccounts: [],
                suspiciousRecipients: ['spender-wallet'],
                recommendations: [],
                timestamp: 0,
                signature: 'sig',
            }],
            affectedAssets: { tokens: [], nfts: [], sol: 0 },
            recommendations: [],
        };

        const advice = RecommendationEngine.generateRecommendations(report);
        expect(advice.some(a => a.includes('Revoke approval for spender: spender-wallet'))).toBe(true);
    });
});
