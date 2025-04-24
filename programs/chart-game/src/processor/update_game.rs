use anchor_lang::prelude::*;
use crate::{GameData, GameSummary, GlobalConfigData, RecentlyGames};
use crate::errors:: { ErrorCode };
use crate::events:: { GameChanged };

#[derive(Accounts)]
#[instruction(
    before_start_time: i64,
    before_end_time: i64,
    before_open_price: u64,
    before_close_price: u64,
    current_start_time: i64,
    current_end_time: i64,
    after_start_time: i64,
    after_end_time: i64,
)]
pub struct UpdateGame<'info> {

    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
    mut,
    seeds = [b"global-config".as_ref()], bump,
    constraint = global_config_data.manager_account == *payer.key @ ErrorCode::IncorrectManager
    )]
    pub global_config_data: Account<'info, GlobalConfigData>,

    #[account(
    mut,
    seeds = [
    b"game-data".as_ref(),
    &before_start_time.to_be_bytes(),
    &before_end_time.to_be_bytes()], bump,
    constraint = global_config_data.current_start_time == before_game_data.start_time,
    )]
    pub before_game_data: Account<'info, GameData>,

    #[account(
    mut,
    seeds = [
    b"game-data".as_ref(),
    &current_start_time.to_be_bytes(),
    &current_end_time.to_be_bytes()], bump,
    constraint = global_config_data.after_start_time == current_game_data.start_time,
    )]
    pub current_game_data: Account<'info, GameData>,

    #[account(
    init,
    payer = payer,
    seeds = [
    b"game-data".as_ref(),
    &after_start_time.to_be_bytes(),
    &after_end_time.to_be_bytes()], bump,
    space = GameData::SIZE
    )]
    pub after_game_data: Account<'info, GameData>,

    #[account(
    mut,
    seeds = [b"recently-games".as_ref()],
    bump,
    )]
    pub recently_games_account: Box<Account<'info, RecentlyGames>>,

    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    pub clock: Sysvar<'info, Clock>,
}

pub fn handle_update_game<'info>(
    ctx: Context<'_,'_,'_,'info,UpdateGame<'info>>,
    before_start_time: i64,
    before_end_time: i64,
    before_open_price: u64,
    before_close_price: u64,
    current_start_time: i64,
    current_end_time: i64,
    after_start_time: i64,
    after_end_time: i64,
    time_correction: i64,
) -> Result<()> {
    //msg!("UPDATE_GAME");

    let global_config_data = &mut ctx.accounts.global_config_data;
    let before_game_data = &mut ctx.accounts.before_game_data;
    let current_game_data = &mut ctx.accounts.current_game_data;
    let after_game_data = &mut ctx.accounts.after_game_data;
    let recently_games_account = &mut ctx.accounts.recently_games_account;

    //msg!("end_time: {}, new_start_time: {}", game_data.end_time, new_start_time);
    if current_game_data.end_time >= after_start_time {
        return Err(ErrorCode::InvalidStartTime.into())
    }

    before_game_data.open_price = before_open_price;
    before_game_data.close_price = before_close_price;
    before_game_data.finish = true;
    recently_games_account.enqueue(GameSummary {
        start_time: before_game_data.start_time,
        long_bet_amount: before_game_data.long_bet_amount,
        long_bet_count: before_game_data.long_bet_count,
        short_bet_amount: before_game_data.short_bet_amount,
        short_bet_count: before_game_data.short_bet_count,
        changed: (before_close_price - before_open_price) as i64,
    })?;
    let mut next_round_over_amount = before_game_data.next_round_over_amount();
    if next_round_over_amount < 2_000_000 {
        next_round_over_amount = 2_000_000;
    }

    let next_round_over_amount_adjust = next_round_over_amount / 2;

    current_game_data.long_bet_amount =
        current_game_data.long_bet_amount
            - 1_000_000
            + next_round_over_amount_adjust;

    current_game_data.short_bet_amount =
        current_game_data.short_bet_amount
            - 1_000_000
            + next_round_over_amount_adjust;

    after_game_data.start_time = after_start_time;
    after_game_data.end_time = after_end_time;
    after_game_data.bet_period = (after_end_time - after_start_time + 1) * 2 / 3;

    after_game_data.long_bet_amount = 1_000_000;
    after_game_data.short_bet_amount = 1_000_000;

    emit!(GameChanged {
        before_start_time: before_game_data.start_time,
        before_end_time: before_game_data.end_time,
        current_start_time: current_game_data.start_time,
        current_end_time: current_game_data.end_time,
        after_start_time: after_game_data.start_time,
        after_end_time: after_game_data.end_time,
    });

    global_config_data.before_start_time = before_start_time;
    global_config_data.before_end_time = before_end_time;
    global_config_data.current_start_time = current_start_time;
    global_config_data.current_end_time = current_end_time;
    global_config_data.after_start_time = after_start_time;
    global_config_data.after_end_time = after_end_time;
    global_config_data.game_count += 1;

    let clock = Clock::get()?;
    let time_stamp = clock.unix_timestamp*1000;
    let slots = (clock.slot - global_config_data.slot) as i64;

    //msg!("slot: {}, gcSlot: {}", clock.slot, global_config_data.slot);

    if slots > 0 {
        global_config_data.time_per_slot = (time_stamp - global_config_data.block_time) / slots;
        global_config_data.time_correction_per_slot = (time_correction - global_config_data.time_correction) / slots;
        global_config_data.time_correction = time_correction;
        global_config_data.slot = clock.slot;
        global_config_data.block_time = time_stamp;
    }

    //msg!("UPDATE_GAME: time_per_slot: {}", global_config_data.time_per_slot);
    //recently_games_account.enqueue(*ctx.accounts.before_game_data.to_account_info().key)?;


    // emit!(GameStarted {
    //     start_time: current_game_data.start_time,
    //     end_time: current_game_data.end_time,
    // });
    // emit!(GameFinished {
    //     start_time: before_game_data.start_time,
    //     end_time: before_game_data.end_time,
    // });
    Ok(())
}
