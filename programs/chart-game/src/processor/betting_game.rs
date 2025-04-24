use anchor_lang::prelude::*;
use anchor_spl::token;
use anchor_spl::token::{Mint, Token, TokenAccount, Transfer};
use crate::{BetData, BetDirection, events, GameData, GlobalConfigData, UserData, UserEntrantData};
use crate::errors:: { ErrorCode };
use crate::events:: { UserBet };

#[derive(Accounts)]
#[instruction(start_time: i64, end_time: i64)]
pub struct BetGame<'info> {

    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
    mut,
    seeds = [b"global-config".as_ref()], bump,
    )]
    pub global_config_data: Box<Account<'info, GlobalConfigData>>,

    #[account(
    mut,
    seeds = [
    b"game-data".as_ref(),
    &start_time.to_be_bytes(),
    &end_time.to_be_bytes()], bump,
    )]
    pub game_data: Account<'info, GameData>,

    #[account(
    init_if_needed,
    payer = payer,
    seeds = [
    b"bet-data".as_ref(),
    game_data.to_account_info().key.as_ref(),
    payer.to_account_info().key.as_ref()],
    bump,
    space = BetData::SIZE,
    )]
    pub bet_data: Box<Account<'info, BetData>>,

    #[account(
    init_if_needed,
    payer = payer,
    seeds = [
    b"user-data".as_ref(),
    payer.to_account_info().key.as_ref()],
    bump,
    space = UserData::SIZE
    )]
    pub user_data: Box<Account<'info, UserData>>,

    #[account(
    init_if_needed,
    payer = payer,
    seeds = [
    b"user-entrants".as_ref(),
    payer.to_account_info().key.as_ref()],
    bump,
    space = UserEntrantData::MAX_SIZE
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

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
    pub clock: Sysvar<'info, Clock>,
}

impl<'info> BetGame<'info> {
    fn into_transfer_to_vault_context(&self)
    -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        let cpi_accounts = Transfer {
            from: self.payer_token_account.to_account_info().clone(),
            to: self.token_vault.to_account_info().clone(),
            authority: self.payer.to_account_info().clone(),
        };

        CpiContext::new(
            self.token_program.to_account_info().clone(),
            cpi_accounts
        )
    }
}

pub fn handle_bet_game<'info>(
    ctx: Context<'_,'_,'_, 'info, BetGame<'info>>,
    start_time: i64,
    end_time: i64,
    bet_direction: BetDirection,
    bet_amount: u64,
) -> Result<()> {
    //msg!("BET_GAME: amount: {}", bet_amount);

    let global_config_data = &mut ctx.accounts.global_config_data;
    let game_data = &mut ctx.accounts.game_data;
    let bet_data = &mut ctx.accounts.bet_data;
    let user_data = &mut ctx.accounts.user_data;

    let clock = Clock::get()?;

    let slots = (clock.slot - global_config_data.slot) as i64;


    let estimate_server_time: i64 = (global_config_data.block_time + global_config_data.time_per_slot*slots) + global_config_data.time_correction + (global_config_data.time_correction_per_slot*slots);
    //msg!("BET_GAME: estimate_server_time: {}, correction: {}, start: {}", estimate_server_time, global_config_data.time_correction, game_data.start_time);

    if bet_amount == 0 {
        return Err(ErrorCode::InvalidBetAmount.into())
    }

    if !game_data.in_progress(estimate_server_time, global_config_data.time_per_slot)  {
        return Err(ErrorCode::IncorrectBettingTime.into())
    }

    if game_data.finish {
        return Err(ErrorCode::GameAlreadyFinished.into())
    }

    if bet_data.bet_amount > 0 && bet_data.bet_direction != Some(bet_direction) {
        return Err(ErrorCode::InvalidBetDirection.into())
    }

    let is_first_bet = bet_data.bet_amount == 0;

    user_data.total_bet += bet_amount as u128;
    user_data.count_bet += 1;
    if is_first_bet {
        user_data.count_game += 1;
    }

    bet_data.bet_direction = Some(bet_direction);
    bet_data.bet_amount += bet_amount;

    match bet_direction {
        BetDirection::LONG => {
            //msg!("BET_LONG");
            if is_first_bet {
                game_data.long_bet_count += 1;
            }
            game_data.long_bet_amount += bet_amount;

            user_data.total_long_bet += bet_amount as u128;
            if bet_data.bet_amount > game_data.max_long_bet_amount {
                game_data.max_long_bet_amount = bet_data.bet_amount;
            }
        }
        BetDirection::SHORT => {
            //msg!("BET_SHORT");
            if is_first_bet {
                game_data.short_bet_count += 1;
            }
            game_data.short_bet_amount += bet_amount;

            user_data.total_short_bet += bet_amount as u128;
            if bet_data.bet_amount > game_data.max_short_bet_amount {
                game_data.max_short_bet_amount = bet_data.bet_amount;
            }
        },
    }

    emit!(events::GameUpdated {
        start_time: game_data.start_time,
        end_time: game_data.end_time,
        bet_period: game_data.bet_period,
        open_price: game_data.open_price,
        close_price: game_data.close_price,
        long_bet_amount: game_data.long_bet_amount,
        long_bet_count: game_data.long_bet_count,
        short_bet_amount: game_data.short_bet_amount,
        short_bet_count: game_data.short_bet_count,
        max_long_bet_amount: game_data.max_long_bet_amount,
        max_short_bet_amount: game_data.max_short_bet_amount,
        finish: game_data.finish,
    });

    bet_data.game = *ctx.accounts.game_data.to_account_info().key;
    bet_data.user = *ctx.accounts.payer.key;

    emit!(UserBet {
        user: *ctx.accounts.payer.key,
        start_time: start_time,
        end_time: end_time,
        bet_direction: Some(bet_direction),
        bet_amount: bet_amount,
    });

    let entrants = &mut ctx.accounts.entrants;
    if !entrants.is_duplicated(*ctx.accounts.bet_data.to_account_info().key) {
        entrants.enqueue(*ctx.accounts.bet_data.to_account_info().key)?;
    }


    token::transfer(
        ctx.accounts.into_transfer_to_vault_context(),
        bet_amount
    )?;
    Ok(())
}
