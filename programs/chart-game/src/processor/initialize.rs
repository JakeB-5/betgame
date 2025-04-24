use anchor_lang::prelude::*;
use anchor_spl::token;
use anchor_spl::token::{Mint, Token, TokenAccount, Transfer};
use crate::{GameState, GlobalConfigData};
use crate::errors:: { ErrorCode };

#[derive(Accounts)]
pub struct Initialize<'info> {

    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
    init,
    payer = payer,
    seeds = [b"global-config".as_ref()],
    bump,
    space = GlobalConfigData::SIZE,
    )]
    pub global_config_data: Account<'info, GlobalConfigData>,

    /// CHECK
    pub authority: UncheckedAccount<'info>,

    /// CHECK
    pub manager_account: UncheckedAccount<'info>,

    #[account(
    mut,
    constraint = token_mint.key() == token_vault.mint
    )]
    pub token_mint: Box<Account<'info, Mint>>,

    #[account(
    init,
    seeds = [
    b"token-vault".as_ref(),
    token_mint.to_account_info().key.as_ref()
    ],
    bump,
    payer = payer,
    token::mint = token_mint,
    token::authority = global_config_data,
    )]
    pub token_vault: Box<Account<'info, TokenAccount>>,

    #[account(
    mut,
    constraint = authority_token_account.owner == payer.key() @ErrorCode::IncorrectTokenOwner,
    constraint = authority_token_account.mint == token_vault.mint,
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
    bump: u8,
) -> Result<()> {
    //msg!("INITIALIZE");

    let global_config_data = &mut ctx.accounts.global_config_data;

    global_config_data.authority = *ctx.accounts.authority.key;
    global_config_data.manager_account = *ctx.accounts.manager_account.key;
    global_config_data.game_count = 0;
    global_config_data.game_state = Some(GameState::Pending);
    global_config_data.token_mint = ctx.accounts.token_mint.key();
    //global_config_data.token_vault = ctx.accounts.token_vault.key();
    global_config_data.bump = bump;

    token::transfer(
        ctx.accounts.into_transfer_to_pda_context(),
        2_000_000,
    )?;
    /*ctx.accounts
        .global_config_data
        .authority = *ctx.accounts
        .authority.key;

    ctx.accounts
        .global_config_data
        .manager_account = *ctx.accounts
        .manager_account.to_account_info().key;

    ctx.accounts.global_config_data.game_count = 0;
    ctx.accounts.global_config_data.game_state = false;
    ctx.accounts.global_config_data.current_game = 0;*/

    Ok(())
}
