use anchor_lang::prelude::*;
use crate::state::DrainerReport;
use crate::errors::DrainerRegistryError;

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

pub fn handler(
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

/// Event emitted when a drainer is reported
#[event]
pub struct DrainerReported {
    pub drainer_address: Pubkey,
    pub reporter: Pubkey,
    pub report_count: u32,
    pub amount_stolen: Option<u64>,
    pub timestamp: i64,
}
