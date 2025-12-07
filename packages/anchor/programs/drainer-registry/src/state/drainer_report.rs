use anchor_lang::prelude::*;

/// DrainerReport account stores aggregated information about a reported drainer address
/// 
/// This account is a PDA derived from seeds: ["drainer", drainer_address]
/// Total size: 132 bytes (8 discriminator + 124 data)
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
}

impl DrainerReport {
    /// Total account size including discriminator
    /// 8 (discriminator) + 32 (drainer_address) + 4 (report_count) + 8 (first_seen) 
    /// + 8 (last_seen) + 8 (total_sol_reported) + 64 (recent_reporters) = 132 bytes
    pub const LEN: usize = 8 + 32 + 4 + 8 + 8 + 8 + 64;
    
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
    }
    
    /// Update existing DrainerReport with new report data
    pub fn add_report(
        &mut self,
        reporter: Pubkey,
        amount_stolen: Option<u64>,
        clock: &Clock,
    ) -> Result<()> {
        // Increment report count (check for overflow)
        self.report_count = self.report_count
            .checked_add(1)
            .ok_or(error!(crate::errors::DrainerRegistryError::ReportCountOverflow))?;
        
        // Update last seen timestamp
        self.last_seen = clock.unix_timestamp;
        
        // Add to total SOL reported (check for overflow)
        if let Some(amount) = amount_stolen {
            self.total_sol_reported = self.total_sol_reported
                .checked_add(amount)
                .ok_or(error!(crate::errors::DrainerRegistryError::AmountOverflow))?;
        }
        
        // Update recent reporters (shift array and add new reporter)
        self.recent_reporters[1] = self.recent_reporters[0];
        self.recent_reporters[0] = reporter;
        
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_account_size() {
        // Verify the account size calculation is correct
        assert_eq!(DrainerReport::LEN, 132);
    }
}
