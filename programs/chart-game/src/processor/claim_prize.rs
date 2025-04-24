use anchor_lang::prelude::*;
use anchor_spl::token;
use anchor_spl::token::{Mint, Token, TokenAccount, Transfer};
use crate::{BetData, BetDirection, GameData, GameResult, GlobalConfigData, TopPlayer, TopPlayers, UserData, UserEntrantData};
use crate::errors:: { ErrorCode };
use crate::events::{ UserClaim };

#[derive(Accounts)]
pub struct ClaimPrize<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
    mut,
    seeds = [b"global-config".as_ref()], bump,
    )]
    pub global_config_data: Account<'info, GlobalConfigData>,

    #[account(
    mut,
    seeds = [
    b"user-data".as_ref(),
    payer.to_account_info().key.as_ref()],
    bump,
    )]
    pub user_data: Box<Account<'info, UserData>>,

    #[account(
    mut,
    seeds = [
    b"user-entrants".as_ref(),
    payer.to_account_info().key.as_ref()],
    bump,
    )]
    pub entrants: Box<Account<'info, UserEntrantData>>,

    #[account(
    mut,
    constraint = token_mint.key() == global_config_data.token_mint
    )]
    pub token_mint: Account<'info, Mint>,

    #[account(
    mut,
    seeds = [
    b"token-vault".as_ref(),
    token_mint.to_account_info().key.as_ref(),
    ],
    bump,
    token::mint = token_mint,
    token::authority = global_config_data,
    )]
    pub token_vault: Account<'info, TokenAccount>,

    #[account(
    mut,
    token::mint = token_mint,
    token::authority = payer.key(),
    )]
    pub payer_token_account: Account<'info, TokenAccount>,

    #[account(
    mut,
    seeds = [b"top-players".as_ref()],
    bump,
    )]
    pub top_players_account: Box<Account<'info, TopPlayers>>,

    pub token_program: Program<'info, Token>,
}

impl<'info> ClaimPrize<'info> {
    fn into_transfer_to_payer(&self)
    -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        let cpi_accounts = Transfer {
            from: self.token_vault.to_account_info().clone(),
            to: self.payer_token_account.to_account_info().clone(),
            authority: self.global_config_data.to_account_info().clone(),
        };

        CpiContext::new(
            self.token_program.to_account_info().clone(),
            cpi_accounts
        )
    }
}

pub fn handle_claim_prize<'info>(
    ctx: Context<'_,'_,'_,'info, ClaimPrize<'info>>
)-> Result<()> {
    msg!("CLAIM_PRIZE");

    let user_data = &mut ctx.accounts.user_data;
    let entrants = &mut ctx.accounts.entrants;
    let top_players = &mut ctx.accounts.top_players_account;

    let need_remaining = entrants.length();

    if need_remaining > 0 && ctx.remaining_accounts.len() != need_remaining * 2 {
        return Err(ErrorCode::IncorrectAccountsLength.into());
    }

    let mut claim_amount: u64 = 0;
    let mut cancel_amount: u64 = 0;

    for i in 0..need_remaining {
        let entrant = entrants.read_entrant();

        //msg!("entrant:{}", entrant.to_string());
        //msg!("bet_data:{}", *ctx.remaining_accounts[i*2].key);
        //msg!("game_data:{}", *ctx.remaining_accounts[i*2+1].key);

        if entrant != *ctx.remaining_accounts[i*2].key {
            return Err(ErrorCode::IncorrectEntrantAccount.into());
        }

        let bet_data: &mut Account<'info, BetData> = &mut Account::try_from(&ctx.remaining_accounts[i*2])?;
        //let game_data: &mut Account<'info, GameData> = &mut Account::try_from(&ctx.remaining_accounts[i*2+1])?;
        let game_data: &mut Account<'info, GameData> =  &mut Account::try_from(&ctx.remaining_accounts[i*2+1])?;


        if bet_data.game != *game_data.to_account_info().key {
            return Err(ErrorCode::IncorrectClaimAccounts.into())
        }

        let (game_data_key, _game_data_bump) =
        Pubkey::find_program_address(
            &[
                b"game-data".as_ref(),
                &game_data.start_time.to_be_bytes(),
                &game_data.end_time.to_be_bytes()
            ], ctx.program_id);

        let (bet_data_key, _bet_data_bump) =
            Pubkey::find_program_address(
                &[
                    b"bet-data".as_ref(),
                    game_data.to_account_info().key.as_ref(),
                    ctx.accounts.payer.key.as_ref()
                ],
                ctx.program_id);

        if game_data_key != *ctx.remaining_accounts[i*2+1].key {
            return Err(ErrorCode::IncorrectClaimAccount.into());
        }
        if bet_data_key != *ctx.remaining_accounts[i*2].key {
            return Err(ErrorCode::IncorrectClaimAccount.into());
        }
        if bet_data.user != *ctx.accounts.payer.key {
            return Err(ErrorCode::PermissionDenied.into());
        }

        if !game_data.finish {
            break;
        }

        entrants.dequeue()?;

        let mut estimate_claim_amount = game_data.divide_amount(bet_data.bet_amount);

        match (game_data.game_result(), bet_data.bet_direction) {
            (GameResult::LONG, Some(BetDirection::LONG)) => {
                claim_amount += estimate_claim_amount;
                user_data.count_win += 1;
            },
            (GameResult::SHORT, Some(BetDirection::SHORT)) => {
                claim_amount += estimate_claim_amount;
                user_data.count_win += 1;
            },
            (GameResult::DRAW, _) => {
                claim_amount += estimate_claim_amount;
                user_data.count_draw += 1;
            },
            (GameResult::CANCEL, _) => {
                estimate_claim_amount = 0;
                cancel_amount += bet_data.bet_amount;
            },
            (_, _) => {
                estimate_claim_amount = 0;
                user_data.count_lose += 1;
            }
        }



        //*(ctx.remaining_accounts[i*2+1]).serialize_data(game_data);

        //msg!("DIVIDE_RATE: {}", game_data.divide_rate());
        //msg!("DIVIDE_AMOUNT: {}", game_data.divide_amount(bet_data.bet_amount));
        if estimate_claim_amount > 0 {
            emit!(UserClaim {
                user: *ctx.accounts.payer.key,
                start_time: game_data.start_time,
                end_time: game_data.end_time,
                bet_amount: bet_data.bet_amount,
                divide_rate: game_data.divide_rate(),
            });
        }

        let authority = &ctx.accounts.payer;
        let bet_data_account_info = &ctx.remaining_accounts[i*2];
        let snapshot: u64 = bet_data_account_info.lamports();

        **bet_data_account_info.lamports.borrow_mut() = 0;
        **authority.lamports.borrow_mut() = authority.lamports().checked_add(snapshot).ok_or(ErrorCode::NumericOverflowError)?;

        game_data.claim_prize_count += 1;
        game_data.exit(ctx.program_id)?;
    }

    //msg!("CLAIM_AMOUNT: {}", claim_amount);
    //msg!("CANCELED_AMOUNT: {}", cancel_amount);

    if claim_amount > 0 {
        user_data.total_claim += claim_amount as u128;
    }
    top_players.insert2(TopPlayer {
        account: *ctx.accounts.payer.key,
        prize: user_data.total_claim,
        count_win: user_data.count_win,
        count_lose: user_data.count_lose,
        count_draw: user_data.count_draw
    })?;

    if claim_amount + cancel_amount > 0 {
        let global_config_data = &mut ctx.accounts.global_config_data;

        let global_config_seeds = &[
            b"global-config".as_ref(),
            &[global_config_data.bump]
        ];
        let authority_seeds = &[&global_config_seeds[..]];

        token::transfer(
            ctx.accounts
                .into_transfer_to_payer()
                .with_signer(authority_seeds),
            claim_amount + cancel_amount,
        )?;
    }

    Ok(())
}
