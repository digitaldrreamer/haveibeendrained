import { DetectionResult } from './detector';
import { ParsedTransactionWithMeta } from '@solana/web3.js';
import { AssetExtractor } from './asset-extractor';

export interface RiskReport {
    overallRisk: number; // 0-100
    severity: 'SAFE' | 'AT_RISK' | 'DRAINED';
    detections: DetectionResult[];
    affectedAssets: {
        tokens: string[];
        nfts: string[];
        sol: number;
    };
    recommendations: string[];
    walletAddress?: string;
    transactionCount?: number;
    analyzedAt?: number;
}

export class RiskAggregator {
    /**
     * Aggregate multiple detection results into a single risk report
     */
    static aggregateRisk(
        detections: DetectionResult[],
        context?: { 
            walletAddress?: string; 
            transactionCount?: number;
            transactions?: ParsedTransactionWithMeta[];
            includeExperimental?: boolean;
        }
    ): RiskReport {
        let overallRisk = 0;
        const allRecommendations: string[] = [];
        const affectedTokens: string[] = [];
        const affectedNFTs: string[] = [];
        let affectedSOL = 0;

        // Extract assets from transactions if provided
        if (context?.transactions && context?.walletAddress) {
            const includeExperimental = context.includeExperimental || false;
            
            for (const tx of context.transactions) {
                const assets = AssetExtractor.extractAll(
                    tx,
                    context.walletAddress,
                    includeExperimental
                );

                affectedSOL += assets.sol;

                if (includeExperimental) {
                    // Collect unique token mints
                    assets.tokens.forEach(token => {
                        if (!affectedTokens.includes(token.mint)) {
                            affectedTokens.push(token.mint);
                        }
                    });

                    // Collect unique NFT mints
                    assets.nfts.forEach(nft => {
                        if (!affectedNFTs.includes(nft)) {
                            affectedNFTs.push(nft);
                        }
                    });
                }
            }
        }

        // Calculate base risk from detections
        for (const detection of detections) {
            // Add recommendations
            allRecommendations.push(...detection.recommendations);

            // Calculate risk contribution
            let riskContribution = 0;
            switch (detection.severity) {
                case 'CRITICAL':
                    riskContribution = 100;
                    break;
                case 'HIGH':
                    riskContribution = 75;
                    break;
                case 'MEDIUM':
                    riskContribution = 40;
                    break;
                case 'LOW':
                    riskContribution = 10;
                    break;
            }

            // Weight by confidence
            const weightedRisk = riskContribution * (detection.confidence / 100);

            // Take the maximum risk found so far (worst case scenario)
            overallRisk = Math.max(overallRisk, weightedRisk);
        }

        // Determine final severity label
        let severity: 'SAFE' | 'AT_RISK' | 'DRAINED' = 'SAFE';
        if (overallRisk >= 90) {
            severity = 'DRAINED';
        } else if (overallRisk >= 40) {
            severity = 'AT_RISK';
        }

        // Deduplicate recommendations
        const uniqueRecommendations = [...new Set(allRecommendations)];

        return {
            overallRisk: Math.round(overallRisk),
            severity,
            detections,
            affectedAssets: {
                tokens: [...new Set(affectedTokens)],
                nfts: [...new Set(affectedNFTs)],
                sol: affectedSOL,
            },
            recommendations: uniqueRecommendations,
            walletAddress: context?.walletAddress,
            transactionCount: context?.transactionCount,
            analyzedAt: Date.now(),
        };
    }
}
