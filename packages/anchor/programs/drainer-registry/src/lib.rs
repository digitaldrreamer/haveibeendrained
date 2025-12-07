use anchor_lang::prelude::*;

declare_id!("BYbF6QC9PoeHGH4y1pLNC2YHBChpnFBq46vBydyBFxq2");

#[program]
pub mod drainer_registry {
    use super::*;

    /// Report a drainer address to the on-chain registry
    /// 
    /// This instruction creates or updates a DrainerReport PDA account.
    /// Requires a 0.01 SOL anti-spam fee.
    pub fn report_drainer(
        ctx: Context<ReportDrainer>,
        drainer_address: Pubkey,
        amount_stolen: Option<u64>,
    ) -> Result<()> {
        // Validation: Cannot report yourself
        require!(
            drainer_address != ctx.accounts.reporter.key(),
            DrainerRegistryError::CannotReportSelf
        );
        
        // Validation: Cannot report system program
        require!(
            drainer_address != anchor_lang::system_program::ID,
            DrainerRegistryError::CannotReportSystemProgram
        );
        
        // Transfer anti-spam fee from reporter to program authority
        let transfer_ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.reporter.key(),
            &ctx.accounts.program_authority.key(),
            ANTI_SPAM_FEE,
        );
        
        anchor_lang::solana_program::program::invoke(
            &transfer_ix,
            &[
                ctx.accounts.reporter.to_account_info(),
                ctx.accounts.program_authority.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;
        
        let drainer_report = &mut ctx.accounts.drainer_report;
        let clock = &ctx.accounts.clock;
        
        // Check if this is the first report (account just initialized)
        if drainer_report.report_count == 0 {
            // Initialize new report
            drainer_report.initialize(
                drainer_address,
                ctx.accounts.reporter.key(),
                amount_stolen,
                clock,
            );
            
            msg!("New drainer report created for address: {}", drainer_address);
        } else {
            // Update existing report
            drainer_report.add_report(
                ctx.accounts.reporter.key(),
                amount_stolen,
                clock,
            )?;
            
            msg!("Drainer report updated for address: {}", drainer_address);
        }
        
        // Emit event
        emit!(DrainerReported {
            drainer_address,
            reporter: ctx.accounts.reporter.key(),
            report_count: drainer_report.report_count,
            amount_stolen,
            timestamp: clock.unix_timestamp,
        });
        
        Ok(())
    }
}

/// Anti-spam fee in lamports (0.01 SOL = 10_000_000 lamports)
pub const ANTI_SPAM_FEE: u64 = 10_000_000;

#[derive(Accounts)]
#[instruction(drainer_address: Pubkey)]
pub struct ReportDrainer<'info> {
    /// The DrainerReport PDA account (created if first report, updated if exists)
    #[account(
        init_if_needed,
        payer = reporter,
        space = DrainerReport::LEN,
        seeds = [b"drainer", drainer_address.as_ref()],
        bump
    )]
    pub drainer_report: Account<'info, DrainerReport>,
    
    /// The reporter submitting this report (pays anti-spam fee)
    #[account(mut)]
    pub reporter: Signer<'info>,
    
    /// Program authority that receives anti-spam fees
    /// CHECK: This is safe because we only transfer SOL to it
    #[account(
        mut,
        constraint = program_authority.key() != reporter.key() @ DrainerRegistryError::InvalidDrainerAddress
    )]
    pub program_authority: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
    
    /// Clock sysvar for timestamps
    pub clock: Sysvar<'info, Clock>,
}

/// DrainerReport account stores aggregated information about a reported drainer address
#[account]
pub struct DrainerReport {
    pub drainer_address: Pubkey,
    pub report_count: u32,
    pub first_seen: i64,
    pub last_seen: i64,
    pub total_sol_reported: u64,
    pub recent_reporters: [Pubkey; 2],
}

impl DrainerReport {
    pub const LEN: usize = 8 + 32 + 4 + 8 + 8 + 8 + 64;
    
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
    
    pub fn add_report(
        &mut self,
        reporter: Pubkey,
        amount_stolen: Option<u64>,
        clock: &Clock,
    ) -> Result<()> {
        self.report_count = self.report_count
            .checked_add(1)
            .ok_or(error!(DrainerRegistryError::ReportCountOverflow))?;
        
        self.last_seen = clock.unix_timestamp;
        
        if let Some(amount) = amount_stolen {
            self.total_sol_reported = self.total_sol_reported
                .checked_add(amount)
                .ok_or(error!(DrainerRegistryError::AmountOverflow))?;
        }
        
        self.recent_reporters[1] = self.recent_reporters[0];
        self.recent_reporters[0] = reporter;
        
        Ok(())
    }
}

/// Event emitted when a drainer is reported
#[event]
pub struct DrainerReported {
    pub drainer_address: Pubkey,
    pub reporter: Pubkey,
    pub report_count: u32,
    pub amount_stolen: Option<u64>,
    pub timestamp: i64,
}

#[error_code]
pub enum DrainerRegistryError {
    #[msg("Insufficient funds for anti-spam fee (0.01 SOL required)")]
    InsufficientFunds,
    
    #[msg("Invalid drainer address provided")]
    InvalidDrainerAddress,
    
    #[msg("Report count overflow - maximum reports reached")]
    ReportCountOverflow,
    
    #[msg("Amount overflow - total reported amount too large")]
    AmountOverflow,
    
    #[msg("Cannot report yourself as a drainer")]
    CannotReportSelf,
    
    #[msg("Cannot report system program as drainer")]
    CannotReportSystemProgram,
}

