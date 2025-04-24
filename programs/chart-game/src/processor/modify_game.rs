use anchor_lang::prelude::*;
use crate::{GameData, GlobalConfigData};
use crate::errors:: { ErrorCode };


#[derive(Accounts)]
#[instruction( start_time: i64, end_time: i64 )]
pub struct ModifyGame<'info> {

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
    seeds = [b"game-data".as_ref(), &start_time.to_be_bytes(), &end_time.to_be_bytes()], bump,
    )]
    pub game_data: Account<'info, GameData>,
}

pub fn handle_modify_game(
    ctx: Context<ModifyGame>,
    start_time: i64,
    end_time: i64,
    new_start_time: i64,
    new_end_time: i64,
) -> Result<()> {
    msg!("MODIFY_GAME");

    let global_config_data = &mut ctx.accounts.global_config_data;
    let game_data = &mut ctx.accounts.game_data;

    if global_config_data.current_start_time == start_time && global_config_data.current_end_time == end_time {
        global_config_data.current_start_time = new_start_time;
        global_config_data.current_end_time = new_end_time;
    }

    if global_config_data.before_start_time == start_time && global_config_data.before_end_time == end_time {
        global_config_data.before_start_time = new_start_time;
        global_config_data.before_end_time = new_end_time;
    }

    game_data.start_time = new_start_time;
    game_data.end_time = new_end_time;

    //new_start_time.to_be_bytes()

    Ok(())
}
