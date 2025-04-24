use anchor_lang::prelude::*;
use anchor_spl::token;
use anchor_spl::token::{Mint, Token, TokenAccount, Transfer};
use crate::FaucetAccount;
use crate::errors:: { ErrorCode };

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
    init,
    payer = payer,
    seeds = [b"faucet-account".as_ref()],
    bump,
    space = FaucetAccount::SIZE,
    )]
    pub faucet_account: Account<'info, FaucetAccount>,

    #[account(init,
    payer = payer,
    seeds = [b"token-vault".as_ref()],
    bump,
    token::mint = token_mint,
    token::authority = faucet_account,
    )]
    pub token_vault: Box<Account<'info, TokenAccount>>,

    #[account(
    mut,
    constraint = token_mint.key() == token_vault.mint
    )]
    pub token_mint: Box<Account<'info, Mint>>,

    #[account(
    mut,
    constraint = authority_token_account.owner == payer.key() @ErrorCode::IncorrectTokenOwner
    )]
    pub authority_token_account: Account<'info, TokenAccount>,


    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

impl<'info> Initialize<'info> {
    fn into_transfer_to_pda_context(&self)
    -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        let cpi_accounts = Transfer {
            from: self
                .authority_token_account
                .to_account_info()
                .clone(),
            to: self.token_vault.to_account_info().clone(),
            authority: self.payer.to_account_info().clone(),
        };

        CpiContext::new(
            self.token_program.to_account_info().clone(),
            cpi_accounts
        )
    }
}

pub fn handle_initialize(
    ctx: Context<Initialize>,
    //token_mint_bump: u8,
    faucet_account_bump: u8,
    faucet_amount: u64,
    faucet_period: i64,
) -> Result<()> {
    msg!("INITIALIZE");

    let faucet_account = &mut ctx.accounts.faucet_account;

    faucet_account.faucet_account_bump = faucet_account_bump;
    //faucet_account.token_mint_bump = token_mint_bump;
    faucet_account.faucet_amount = faucet_amount;
    faucet_account.faucet_period = faucet_period;

    token::transfer(
       ctx.accounts.into_transfer_to_pda_context(),
        10_000_000_000_000,
    )?;
    Ok(())
}
