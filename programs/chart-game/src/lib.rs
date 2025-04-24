use anchor_lang::prelude::*;

pub mod processor;

pub use processor::*;

mod state;
mod errors;
mod events;

use state::*;

declare_id!("FdJTfw6ZkVNHKAvB2Fxvce3sGEbK8UpVtzaoMCBeYmKY");


#[program]
pub mod chart_game {
    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        bump: u8,
    ) -> Result<()> { handle_initialize(ctx, bump) }

    pub fn change_authority(
        ctx: Context<UpdateAccount>,
        new_authority: Option<Pubkey>,
    ) -> Result<()> {
        handle_update_authority(ctx, new_authority)
    }

    pub fn change_manager(
        ctx: Context<UpdateAccount>,
        new_manager: Option<Pubkey>,
    ) -> Result<()> {
        handle_update_manager(ctx, new_manager)
    }

    pub fn init_game<'info>(
        ctx: Context<'_,'_,'_, 'info, InitGame<'info>>,
        start_time: i64,
        end_time: i64,
        after_start_time: i64,
        after_end_time: i64,
        time_correction: i64,
    ) -> Result<()> {
        handle_init_game(ctx, start_time, end_time, after_start_time, after_end_time, time_correction)
    }

    pub fn bet_game<'info>(
        ctx: Context<'_,'_,'_, 'info, BetGame<'info>>,
        start_time: i64,
        end_time: i64,
        bet_direction: BetDirection,
        bet_amount: u64,
    ) -> Result<()> {
        handle_bet_game(ctx, start_time, end_time, bet_direction, bet_amount)
    }

    pub fn update_game<'info>(
        ctx: Context<'_,'_,'_, 'info,UpdateGame<'info>>,
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
        handle_update_game(ctx,
                           before_start_time,
                           before_end_time,
                           before_open_price,
                           before_close_price,
                           current_start_time,
                           current_end_time,
                           after_start_time,
                           after_end_time,
            time_correction
        )
    }

    pub fn claim_prize<'info>(
        ctx: Context<'_,'_,'_, 'info, ClaimPrize<'info>>,
    ) -> Result<()> {
        handle_claim_prize(ctx)
    }

    pub fn modify_game(
        ctx: Context<ModifyGame>,
        start_time: i64,
        end_time: i64,
        new_start_time: i64,
        new_end_time: i64,
    ) -> Result<()> {
        handle_modify_game(ctx, start_time, end_time, new_start_time, new_end_time)
    }

    pub fn close_game<'info>(
        ctx: Context<'_,'_,'_, 'info, CloseGame<'info>>,
        start_time: i64,
        end_time: i64,
    ) -> Result<()> {
        handle_close_game(ctx, start_time, end_time)
    }
}
