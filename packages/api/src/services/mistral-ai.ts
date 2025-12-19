import { Mistral } from '@mistralai/mistralai';

export interface AttackCategory {
  category: 'Phishing' | 'FakeAirdrop' | 'SocialEngineering' | 'MaliciousApproval' | 'SetAuthority' | 'Unknown';
  categoryId: number; // 0-4, 255 for Unknown
}

export interface AttackMethod {
  method: string;
  methodId: number; // Enum value
}

export interface DrainerAnalysis {
  attackCategory: AttackCategory;
  attackMethods: AttackMethod[];
  summary: string; // Max 500 chars
  keyDomains: string[]; // Max 5 domains, 100 chars each
  confidence: number; // 0-100
}

interface DrainerReportData {
  address: string;
  reports: Array<{
    reportId: string;
    title: string;
    description: string;
    amountLost?: string;
    domains: string[];
    submitted: string;
    submittedBy: string;
  }>;
}

/**
 * Mistral AI service for analyzing drainer reports
 */
export class MistralAIService {
  private client: MistralClient;
  private model: string;

  constructor(apiKey: string, model: string = 'mistral-small-latest') {
    this.client = new MistralClient({ apiKey });
    this.model = model;
  }

  /**
   * Analyze a drainer address and its associated reports
   * Returns AI-generated metadata for on-chain storage
   */
  async analyzeDrainer(drainerData: DrainerReportData): Promise<DrainerAnalysis> {
    // Build context from all reports
    const reportsText = drainerData.reports.map((r, idx) => {
      return `Report ${idx + 1}:
- Title: ${r.title || 'N/A'}
- Description: ${r.description || 'N/A'}
- Amount Lost: ${r.amountLost || 'N/A'}
- Domains: ${r.domains.join(', ') || 'N/A'}
- Submitted: ${r.submitted || 'N/A'}
- Submitted By: ${r.submittedBy || 'N/A'}
`;
    }).join('\n---\n\n');

    const prompt = `You are a security analyst specializing in Solana wallet drainer attacks. Analyze the following reports about drainer address ${drainerData.address} and provide a structured analysis.

Reports:
${reportsText}

Provide your analysis in the following JSON format:
{
  "attackCategory": {
    "category": "Phishing" | "FakeAirdrop" | "SocialEngineering" | "MaliciousApproval" | "SetAuthority" | "Unknown",
    "categoryId": 0-4 (or 255 for Unknown)
  },
  "attackMethods": [
    {
      "method": "Description of attack method",
      "methodId": 0-9 (enum value for the method)
    }
  ],
  "summary": "A concise summary (max 500 characters) aggregating all reports, describing the attack pattern, methods used, and key characteristics. Focus on actionable intelligence.",
  "keyDomains": ["domain1.com", "domain2.com", ...] (up to 5 most important malicious domains, max 100 chars each),
  "confidence": 0-100 (confidence score based on evidence quality and consistency)
}

Attack Categories:
- Phishing (0): Fake websites or apps that trick users into entering credentials
- FakeAirdrop (1): Fake airdrop claims that require wallet connection
- SocialEngineering (2): Psychological manipulation to gain access
- MaliciousApproval (3): Unlimited token approvals or suspicious approvals
- SetAuthority (4): Changing wallet authority to attacker-controlled address
- Unknown (255): Cannot determine from available information

Attack Methods (use methodId 0-9):
- 0: Token approval manipulation
- 1: Authority transfer
- 2: Fake website/phishing
- 3: Malicious smart contract
- 4: Social media impersonation
- 5: Fake airdrop claim
- 6: Malicious browser extension
- 7: Keylogger/malware
- 8: SIM swap/social engineering
- 9: Other/unknown

Focus on:
1. Identifying the primary attack vector
2. Extracting key malicious domains (filter out legitimate domains like chainabuse.com, solana.fm)
3. Summarizing patterns across multiple reports
4. Providing actionable intelligence for detection

Return ONLY valid JSON, no markdown formatting.`;

    try {
      const response = await this.client.chat.complete({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a security analyst specializing in Solana wallet drainer attacks. Provide structured JSON analysis of drainer reports.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        responseFormat: { type: 'json_object' },
        temperature: 0.3, // Lower temperature for more consistent analysis
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from Mistral AI');
      }

      // Parse JSON response
      const analysis = JSON.parse(content) as any;

      // Validate and normalize response
      const attackCategory = this.normalizeCategory(analysis.attackCategory);
      const attackMethods = this.normalizeMethods(analysis.attackMethods || []);
      const summary = this.truncateString(analysis.summary || '', 500);
      const keyDomains = (analysis.keyDomains || [])
        .slice(0, 5)
        .map((d: string) => this.truncateString(d, 100))
        .filter((d: string) => d && !this.isLegitimateDomain(d));
      const confidence = Math.max(0, Math.min(100, Math.round(analysis.confidence || 50)));

      return {
        attackCategory,
        attackMethods,
        summary,
        keyDomains,
        confidence,
      };
    } catch (error: any) {
      console.error('Mistral AI analysis error:', error);
      
      // Return default analysis on error
      return {
        attackCategory: { category: 'Unknown', categoryId: 255 },
        attackMethods: [],
        summary: `Analysis failed: ${error.message || 'Unknown error'}`,
        keyDomains: [],
        confidence: 0,
      };
    }
  }

  /**
   * Normalize attack category
   */
  private normalizeCategory(category: any): AttackCategory {
    const validCategories = ['Phishing', 'FakeAirdrop', 'SocialEngineering', 'MaliciousApproval', 'SetAuthority', 'Unknown'];
    const categoryName = validCategories.includes(category?.category) 
      ? category.category 
      : 'Unknown';
    
    const categoryMap: Record<string, number> = {
      'Phishing': 0,
      'FakeAirdrop': 1,
      'SocialEngineering': 2,
      'MaliciousApproval': 3,
      'SetAuthority': 4,
      'Unknown': 255,
    };

    return {
      category: categoryName as any,
      categoryId: categoryMap[categoryName] || 255,
    };
  }

  /**
   * Normalize attack methods
   */
  private normalizeMethods(methods: any[]): AttackMethod[] {
    if (!Array.isArray(methods)) return [];
    
    return methods.slice(0, 10).map((m: any) => ({
      method: String(m.method || 'Unknown').slice(0, 100),
      methodId: Math.max(0, Math.min(9, Math.round(m.methodId || 9))),
    }));
  }

  /**
   * Truncate string to max length
   */
  private truncateString(str: string, maxLength: number): string {
    return str.slice(0, maxLength);
  }

  /**
   * Check if domain is legitimate (should be filtered out)
   */
  private isLegitimateDomain(domain: string): boolean {
    const legitimate = [
      'chainabuse.com',
      'solana.fm',
      'twitter.com',
      'trmlabs.com',
      'solana.com',
      'github.com',
    ];
    return legitimate.some(legit => domain.toLowerCase().includes(legit.toLowerCase()));
  }
}

