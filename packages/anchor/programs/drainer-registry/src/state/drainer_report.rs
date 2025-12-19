use anchor_lang::prelude::*;

/// Attack categories enum (1 byte)
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq)]
pub enum AttackCategory {
    Phishing = 0,
    FakeAirdrop = 1,
    SocialEngineering = 2,
    MaliciousApproval = 3,
    SetAuthority = 4,
    Unknown = 255,
}

/// DrainerReport account stores aggregated information about a reported drainer address
///
/// This account is a PDA derived from seeds: ["drainer", drainer_address]
/// Total size: ~1,156 bytes (8 discriminator + 1,148 data)
#[account]
pub struct DrainerReport {
    /// The address being reported as a drainer (32 bytes)
    pub drainer_address: Pubkey,

    /// Total number of reports received for this address (4 bytes)
    pub report_count: u32,

    /// Timestamp of the first report (Unix timestamp in seconds) (8 bytes)
    pub first_seen: i64,

    /// Timestamp of the most recent report (Unix timestamp in seconds) (8 bytes)
    pub last_seen: i64,

    /// Total amount of SOL reported as stolen (in lamports) (8 bytes)
    pub total_sol_reported: u64,

    /// Last 2 reporter addresses (for tracking) (64 bytes: 2 * 32)
    pub recent_reporters: [Pubkey; 2],

    // AI-generated metadata
    /// Attack category identified by AI (1 byte)
    pub attack_category: AttackCategory,

    /// Attack methods used (Vec<u8> - array of enum values, max 10) (4 + 10 = 14 bytes)
    pub attack_methods: Vec<u8>,

    /// AI-generated summary (max 500 chars) (4 + 500 = 504 bytes)
    pub ai_summary: String,

    /// Key domains associated with this drainer (max 5 domains, 100 chars each) (4 + 500 = 504 bytes)
    pub key_domains: Vec<String>,

    /// AI confidence score (0-100) (1 byte)
    pub ai_confidence: u8,
}

impl DrainerReport {
    /// Total account size including discriminator
    /// 8 (discriminator) + 32 + 4 + 8 + 8 + 8 + 64 + 1 + 14 + 504 + 504 + 1 = 1,156 bytes
    pub const LEN: usize = 8 + 32 + 4 + 8 + 8 + 8 + 64 + 1 + 14 + 504 + 504 + 1;

    /// Initialize a new DrainerReport with first report data
    pub fn initialize(
        &mut self,
        drainer_address: Pubkey,
        reporter: Pubkey,
        amount_stolen: Option<u64>,
        clock: &Clock,
    ) {
        self.drainer_address = drainer_address;
        self.report_count = 1;
        self.first_seen = clock.unix_timestamp;
        self.last_seen = clock.unix_timestamp;
        self.total_sol_reported = amount_stolen.unwrap_or(0);
        self.recent_reporters = [reporter, Pubkey::default()];

        // Initialize AI fields with defaults
        self.attack_category = AttackCategory::Unknown;
        self.attack_methods = Vec::new();
        self.ai_summary = String::new();
        self.key_domains = Vec::new();
        self.ai_confidence = 0;
    }

    /// Update existing DrainerReport with new report data
    pub fn add_report(
        &mut self,
        reporter: Pubkey,
        amount_stolen: Option<u64>,
        clock: &Clock,
    ) -> Result<()> {
        // Increment report count (check for overflow)
        self.report_count = self.report_count.checked_add(1).ok_or(error!(
            crate::errors::DrainerRegistryError::ReportCountOverflow
        ))?;

        // Update last seen timestamp
        self.last_seen = clock.unix_timestamp;

        // Add to total SOL reported (check for overflow)
        if let Some(amount) = amount_stolen {
            self.total_sol_reported = self
                .total_sol_reported
                .checked_add(amount)
                .ok_or(error!(crate::errors::DrainerRegistryError::AmountOverflow))?;
        }

        // Update recent reporters (shift array and add new reporter)
        self.recent_reporters[1] = self.recent_reporters[0];
        self.recent_reporters[0] = reporter;

        Ok(())
    }

    /// Update AI-generated metadata
    pub fn update_ai_metadata(
        &mut self,
        category: AttackCategory,
        methods: Vec<u8>,
        summary: String,
        domains: Vec<String>,
        confidence: u8,
    ) -> Result<()> {
        // Validate and truncate summary to max 500 chars
        let summary_truncated = if summary.len() > 500 {
            summary.chars().take(500).collect()
        } else {
            summary
        };

        // Validate and truncate methods to max 10
        let methods_truncated: Vec<u8> = methods.into_iter().take(10).collect();

        // Validate and truncate domains to max 5, each max 100 chars
        let domains_truncated: Vec<String> = domains
            .into_iter()
            .take(5)
            .map(|d| {
                if d.len() > 100 {
                    d.chars().take(100).collect()
                } else {
                    d
                }
            })
            .collect();

        self.attack_category = category;
        self.attack_methods = methods_truncated;
        self.ai_summary = summary_truncated;
        self.key_domains = domains_truncated;
        self.ai_confidence = confidence.min(100);

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_account_size() {
        // Verify the account size calculation is correct
        assert_eq!(DrainerReport::LEN, 1156);
    }
}
