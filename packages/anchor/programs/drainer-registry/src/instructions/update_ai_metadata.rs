use crate::state::{AttackCategory, DrainerReport};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct UpdateAiMetadata<'info> {
    /// The DrainerReport PDA account to update
    #[account(
        mut,
        seeds = [b"drainer", drainer_report.drainer_address.as_ref()],
        bump
    )]
    pub drainer_report: Account<'info, DrainerReport>,

    /// Program authority (only authority can update AI metadata)
    /// In production, this should validate against a stored authority address
    /// For MVP, we require a signer - the actual authority is managed off-chain
    #[account(mut)]
    pub program_authority: Signer<'info>,
}

pub fn handler(
    ctx: Context<UpdateAiMetadata>,
    category: u8,
    methods: Vec<u8>,
    summary: String,
    domains: Vec<String>,
    confidence: u8,
) -> Result<()> {
    // Convert u8 to AttackCategory enum
    let attack_category = match category {
        0 => AttackCategory::Phishing,
        1 => AttackCategory::FakeAirdrop,
        2 => AttackCategory::SocialEngineering,
        3 => AttackCategory::MaliciousApproval,
        4 => AttackCategory::SetAuthority,
        _ => AttackCategory::Unknown,
    };

    let drainer_report = &mut ctx.accounts.drainer_report;

    drainer_report.update_ai_metadata(attack_category, methods, summary, domains, confidence)?;

    msg!(
        "AI metadata updated for drainer: {}",
        drainer_report.drainer_address
    );

    Ok(())
}
