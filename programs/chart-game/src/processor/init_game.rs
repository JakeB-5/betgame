use anchor_lang::prelude::*;
use crate::{GameData, GameState, GlobalConfigData, RecentlyGames, TopPlayers};
use crate::errors:: { ErrorCode };


#[derive(Accounts)]
#[instruction(start_time: i64, end_time: i64, after_start_time: i64, after_end_time: i64)]
pub struct InitGame<'info> {

    #[account(
    mut,
    seeds = [b"global-config".as_ref()], bump,
    constraint = global_config_data.manager_account == *payer.key @ ErrorCode::IncorrectManager,
    constraint = global_config_data.game_count == 0
    )]
    pub global_config_data: Box<Account<'info, GlobalConfigData>>,

    #[account(
    init,
    payer = payer,
    seeds = [b"game-data".as_ref(), &start_time.to_be_bytes(), &end_time.to_be_bytes()], bump,
    space = GameData::SIZE
    )]
    pub game_data: Account<'info, GameData>,

    #[account(
    init,
    payer = payer,
    seeds = [b"game-data".as_ref(), &after_start_time.to_be_bytes(), &after_end_time.to_be_bytes()], bump,
    space = GameData::SIZE
    )]
    pub after_game_data: Box<Account<'info, GameData>>,

    #[account(
    init,
    payer = payer,
    seeds = [b"top-players".as_ref()],
    bump,
    space = TopPlayers::SIZE,
    )]
    pub top_players_account: Box<Account<'info, TopPlayers>>,


    #[account(
    init,
    payer = payer,
    seeds = [b"recently-games".as_ref()],
    bump,
    space = RecentlyGames::MAX_SIZE,
    )]
    pub recently_games_account: Box<Account<'info, RecentlyGames>>,

    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    pub clock: Sysvar<'info, Clock>,

}

pub fn handle_init_game<'info>(
    ctx: Context<'_,'_,'_, 'info, InitGame<'info>>,
    start_time: i64,
    end_time: i64,
    after_start_time: i64,
    after_end_time: i64,
    time_correction: i64,
) -> Result<()> {
    //msg!("INIT_GAME");

    let global_config_data = &mut ctx.accounts.global_config_data;

    global_config_data.current_start_time = start_time;
    global_config_data.current_end_time = end_time;
    global_config_data.after_start_time = after_start_time;
    global_config_data.after_end_time = after_end_time;
    global_config_data.game_count += 1;
    global_config_data.game_state = Some(GameState::OnGoing);
    global_config_data.time_correction = time_correction;

    let clock = Clock::get()?;
    global_config_data.slot = clock.slot;
    global_config_data.block_time = clock.unix_timestamp*1000;
    global_config_data.time_per_slot = 400;
    global_config_data.time_correction_per_slot = 0;


    let game_data = &mut ctx.accounts.game_data;
    game_data.start_time = start_time;
    game_data.end_time = end_time;

    game_data.bet_period = (end_time - start_time + 1) * 2 / 3;

    game_data.long_bet_amount = 1_000_000;
    game_data.short_bet_amount = 1_000_000;

    let after_game_data = &mut ctx.accounts.after_game_data;
    after_game_data.start_time = after_start_time;
    after_game_data.end_time = after_end_time;

    after_game_data.bet_period = (after_end_time - after_start_time + 1) * 2 / 3;

    after_game_data.long_bet_amount = 1_000_000;
    after_game_data.short_bet_amount = 1_000_000;
    Ok(())
}
