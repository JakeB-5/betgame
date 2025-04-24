use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token;
use anchor_spl::token::{Mint, Token, TokenAccount, Transfer};
use crate::{FaucetAccount, FaucetHistory};
use crate::errors:: { ErrorCode };

#[derive(Accounts)]
pub struct Faucet<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
    mut,
    seeds = [b"faucet-account".as_ref()],
    bump,
    )]
    pub faucet_account: Account<'info, FaucetAccount>,

    #[account(init_if_needed,
    payer = payer,
    seeds = [
    b"faucet-history".as_ref(),
    payer.to_account_info().key.as_ref()
    ],
    bump,
    space = FaucetHistory::SIZE,
    )]
    pub faucet_history: Account<'info, FaucetHistory>,

    #[account(mut,
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
    init_if_needed,
    payer = payer,
    associated_token::mint = token_mint,
    associated_token::authority = payer,
    )]
    pub payer_token_account: Box<Account<'info, TokenAccount>>,

    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
    pub clock: Sysvar<'info, Clock>,
}

impl<'info> Faucet<'info> {
    fn into_transfer_vault_to_payer(&self)
    -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        let cpi_accounts = Transfer {
            from: self
                .token_vault
                .to_account_info()
                .clone(),
            to: self.payer_token_account.to_account_info().clone(),
            authority: self.faucet_account.to_account_info().clone(),
        };

        CpiContext::new(
            self.token_program.to_account_info().clone(),
            cpi_accounts,
        )
    }
}


pub fn handle_faucet(
    ctx: Context<Faucet>,
) -> Result<()> {
    msg!("FAUCET");

    let faucet_account = &mut ctx.accounts.faucet_account;
    let faucet_history = &mut ctx.accounts.faucet_history;
    let clock = Clock::get()?;

    if faucet_account.faucet_period + faucet_history.last_request > clock.unix_timestamp {
        return Err(ErrorCode::TooMuchRequest.into())
    }

    let faucet_amount = faucet_account.faucet_amount;

    faucet_history.last_request = clock.unix_timestamp;
    faucet_history.total_request += faucet_account.faucet_amount as u128;

    let faucet_account_seeds = &[
        b"faucet-account".as_ref(),
        &[faucet_account.faucet_account_bump]
    ];
    let authority_seeds = &[&faucet_account_seeds[..]];

    token::transfer(
        ctx.accounts.into_transfer_vault_to_payer()
            .with_signer(authority_seeds),
        faucet_amount
    )?;

    Ok(())
}
