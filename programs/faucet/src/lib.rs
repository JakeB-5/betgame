use anchor_lang::prelude::*;

pub mod processor;
pub use processor::*;
mod errors;
mod state;

use state::*;

declare_id!("9xfdz2dctjv5May6pdXnYEprU4YcPweLnPCVub2aMxKE");

#[program]
pub mod faucet {
    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        //token_mint_bump: u8,
        faucet_account_bump: u8,
        faucet_amount: u64,
        faucet_period: i64,
    ) -> Result<()> {
        handle_initialize(ctx, faucet_account_bump, faucet_amount, faucet_period)
    }

    pub fn faucet(
        ctx: Context<Faucet>,
    ) -> Result<()> {
        handle_faucet(ctx)
    }
}
