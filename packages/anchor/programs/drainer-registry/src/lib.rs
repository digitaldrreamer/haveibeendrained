use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

pub use errors::*;
pub use instructions::*;
pub use state::*;

// Re-export constants and events from instructions
pub use instructions::report_drainer::{DrainerReported, ANTI_SPAM_FEE};

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
        instructions::report_drainer::handler(ctx, drainer_address, amount_stolen)
    }

    /// Update AI-generated metadata for a drainer report
    ///
    /// This instruction allows the program authority to update AI-analyzed metadata
    /// including attack category, methods, summary, and associated domains.
    pub fn update_ai_metadata(
        ctx: Context<UpdateAiMetadata>,
        category: u8,
        methods: Vec<u8>,
        summary: String,
        domains: Vec<String>,
        confidence: u8,
    ) -> Result<()> {
        instructions::update_ai_metadata::handler(
            ctx, category, methods, summary, domains, confidence,
        )
    }
}
