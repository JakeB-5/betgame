use anchor_lang::prelude::*;
use crate::BetDirection;



#[event]
pub struct GameChanged {
    pub before_start_time: i64,
    pub before_end_time: i64,
    pub current_start_time: i64,
    pub current_end_time: i64,
    pub after_start_time: i64,
    pub after_end_time: i64,
}

#[event]
pub struct GameUpdated {
    pub start_time: i64,
    pub end_time: i64,

    pub bet_period: i64,

    pub open_price: u64,
    pub close_price: u64,

    pub long_bet_amount: u64,
    pub long_bet_count: u32,
    pub short_bet_amount: u64,
    pub short_bet_count: u32,

    pub max_long_bet_amount: u64,
    pub max_short_bet_amount: u64,

    pub finish: bool,
}

#[event]
pub struct UserBet {
    pub user: Pubkey,

    pub start_time: i64,
    pub end_time: i64,

    pub bet_direction: Option<BetDirection>,
    pub bet_amount: u64,
}

#[event]
pub struct UserClaim {
    pub user: Pubkey,
    pub start_time: i64,
    pub end_time: i64,
    pub bet_amount: u64,
    pub divide_rate: u64,

}
