use anchor_lang::prelude::*;
use crate::{GameData, GlobalConfigData};
use crate::errors:: { ErrorCode };


#[derive(Accounts)]
#[instruction(
    start_time: i64,
    end_time: i64,
)]
pub struct CloseGame<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
    mut,
    seeds = [
        b"game-data".as_ref(),
        &start_time.to_be_bytes(),
        &end_time.to_be_bytes()],
    bump,
    )]
    pub game_data: Account<'info, GameData>,

    #[account(
    mut,
    seeds = [b"global-config".as_ref()], bump,
    constraint = global_config_data.manager_account == *payer.key @ ErrorCode::IncorrectManager
    )]
    pub global_config_data: Account<'info, GlobalConfigData>,

    pub clock: Sysvar<'info, Clock>,
}

pub fn handle_close_game<'info>(
    ctx: Context<'_, '_, '_, 'info, CloseGame<'info>>,
    _start_time: i64,
    _end_time: i64,
) -> Result<()> {

    let game_data = &mut ctx.accounts.game_data;

    if (game_data.long_bet_count + game_data.short_bet_count) as u64 != game_data.claim_prize_count {
        return Err(ErrorCode::NotClosableGameFromUser.into())
    }

    if !game_data.finish {
        return Err(ErrorCode::NotClosableGameFromFinish.into())
    }

    let clock = Clock::get()?;
    let time_stamp = clock.unix_timestamp*1000;

    if game_data.end_time > time_stamp - (24*60*60*1000) {
        return Err(ErrorCode::NotClosableGameFromTime.into())
    }

    let authority = &ctx.accounts.payer;
    let game_data_account_info = &ctx.accounts.game_data.to_account_info();
    let snapshot: u64 = game_data_account_info.lamports();

    **game_data_account_info.lamports.borrow_mut() = 0;
    **authority.lamports.borrow_mut() = authority.lamports().checked_add(snapshot).ok_or(ErrorCode::NumericOverflowError)?;


    Ok(())
}
