
use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};
use crate::{GlobalConfigData};
use crate::errors:: { ErrorCode };


#[derive(Accounts)]
pub struct UpdateAccount<'info> {
    pub authority: Signer<'info>,

    #[account(
    mut,
    seeds = [b"global-config".as_ref()], bump,
    has_one = authority @ ErrorCode::IncorrectOwner,
    )]
    pub global_config_data: Account<'info, GlobalConfigData>,

    #[account(
    mut,
    constraint = token_mint.key() == global_config_data.token_mint
    )]
    pub token_mint: Account<'info, Mint>,

    #[account(
    mut,
    seeds = [
    b"token-vault".as_ref(),
    token_mint.to_account_info().key.as_ref()],
    bump,
    token::mint = token_mint,
    token::authority = global_config_data,
    )]
    pub token_vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

/*impl<'info> UpdateAccount<'info> {
    fn into_set_authority_context(&self)
    -> CpiContext<'_,'_,'_, 'info, SetAuthority<'info>> {
        let cpi_accounts = SetAuthority {
            account_or_mint: self
                .token_vault.to_account_info(),
            current_authority: self.authority.to_account_info(),
        };
        CpiContext::new(self.token_program.to_account_info().clone(), cpi_accounts)
    }
}*/


pub fn handle_update_authority(
    ctx: Context<UpdateAccount>,
    new_authority: Option<Pubkey>,
) -> Result<()> {
    msg!("CHANGE_AUTHORITY");

    //ctx.accounts
    //    .global_config_data
    //    .authority = *ctx.accounts.new_authority.key;

    let global_config_data = &mut ctx.accounts.global_config_data;

    if let Some(new_auth) = new_authority {
        global_config_data.authority = new_auth;


        //token::set_authority(
        //    ctx.accounts.into_set_authority_context(),
        //    AuthorityType::AccountOwner,
        //    Some(new_auth),
        //)?;
    }

    //ctx.accounts.global_config_data.authority = new_authority;



    Ok(())
}

pub fn handle_update_manager(
    ctx: Context<UpdateAccount>,
    new_manager: Option<Pubkey>,
) -> Result<()> {
    msg!("CHANGE_MANAGER");

    let global_config_data = &mut ctx.accounts.global_config_data;

    if let Some(new_manager) = new_manager {
        global_config_data.manager_account = new_manager
    }

    Ok(())
}
