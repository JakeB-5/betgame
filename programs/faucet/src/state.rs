use anchor_lang::prelude::*;


#[account]
#[derive(Default, Debug)]
pub struct FaucetAccount {
    //pub token_mint_bump: u8,
    pub faucet_account_bump: u8,
    pub faucet_amount: u64,
    pub faucet_period: i64,
}

impl FaucetAccount {
    pub const SIZE: usize = 8 + 2 + 8 + 8;
}

#[account]
#[derive(Default, Debug)]
pub struct FaucetHistory {
    pub last_request: i64,
    pub total_request: u128,
}

impl FaucetHistory {
    pub const SIZE: usize = 8 + 8 + 16;
}
