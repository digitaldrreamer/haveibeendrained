import { DetectionResult } from './detector';
import { RiskReport } from './risk-aggregator';

export class RecommendationEngine {
    static generateRecommendations(report: RiskReport): string[] {
        const recommendations: Set<string> = new Set();

        // General advice based on severity
        if (report.severity === 'DRAINED') {
            recommendations.add('🚨 IMMEDIATE ACTION REQUIRED: Your wallet is likely compromised.');
            recommendations.add('1. Create a NEW wallet with a fresh seed phrase immediately.');
            recommendations.add('2. Transfer any remaining assets to the new wallet.');
            recommendations.add('3. Do NOT use this compromised wallet for any future transactions.');
        } else if (report.severity === 'AT_RISK') {
            recommendations.add('⚠️ WARNING: Your wallet has high-risk interactions.');
            recommendations.add('Review and revoke suspicious approvals using a tool like SolRevoke.');
        }

        // Specific advice based on detection types
        for (const detection of report.detections) {
            switch (detection.type) {
                case 'SET_AUTHORITY':
                    recommendations.add('🔴 CRITICAL: Token account ownership transferred.');
                    recommendations.add('The attacker has full control of the affected token accounts.');
                    recommendations.add('You cannot revoke this via normal means. Consider the tokens lost, but save the rest of your wallet.');
                    break;

                case 'UNLIMITED_APPROVAL':
                    recommendations.add('🟠 HIGH RISK: Unlimited token approval detected.');
                    recommendations.add(`Revoke approval for spender: ${detection.suspiciousRecipients[0]}`);
                    break;

                case 'KNOWN_DRAINER':
                    recommendations.add('🔴 CRITICAL: Interaction with a known drainer wallet.');
                    recommendations.add('Disconnect your wallet from any sites you are currently connected to.');
                    break;
            }
        }

        return Array.from(recommendations);
    }
}
