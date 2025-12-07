use anchor_lang::prelude::*;

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
