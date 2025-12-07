use anchor_lang::prelude::*;

declare_id!("BYbF6QC9PoeHGH4y1pLNC2YHBChpnFBq46vBydyBFxq2");

#[program]
pub mod drainer_registry {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
