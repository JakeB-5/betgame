use anchor_lang::prelude::*;

use crate::errors:: { ErrorCode };

// #[derive(AnchorSerialize, AnchorDeserialize, Default, Clone, Debug)]
// pub struct PoolBumps {
//     pub global_config: u8,
// }

#[account]
#[derive(Default, Debug)]
pub struct GlobalConfigData {
    // 008; 32 + 32 => 72
    pub authority: Pubkey,
    pub manager_account: Pubkey,

    // 072; 16 + 10 => 98
    pub game_count: u128,
    pub game_state: Option<GameState>,

    // 098; 8 * 6 => 156
    pub before_start_time: i64,
    pub before_end_time: i64,

    pub current_start_time: i64,
    pub current_end_time: i64,

    pub after_start_time: i64,
    pub after_end_time: i64,

    // 156; 32 + 1 => 189
    pub token_mint: Pubkey,
    //pub token_vault: Pubkey,
    //pub bumps: PoolBumps,
    pub bump: u8,

    // 189; 8 * 5 => 229
    pub slot: u64,
    pub block_time: i64,
    pub time_per_slot: i64,
    pub time_correction: i64,
    pub time_correction_per_slot: i64,
}

impl GlobalConfigData {
    pub const SIZE: usize = 8 + 32 + 32 + 16 + 10 + 8*6 + 32 + 1 + 8*5 ;
}

#[account]
#[derive(Default, Debug)]
pub struct GameData {
    pub start_time: i64,
    pub end_time: i64,

    pub bet_period: i64,


    pub open_price: u64,
    pub close_price: u64,

    pub long_bet_amount: u64,
    pub long_bet_count: u32,
    pub short_bet_amount: u64,
    pub short_bet_count: u32,

    pub claim_prize_count: u64,

    pub max_long_bet_amount: u64,
    pub max_short_bet_amount: u64,

    pub finish: bool,
}

impl GameData {
    pub const SIZE: usize = 8 + 8 * 5 + 8 * 2 + 4 * 2 + 8 + 16 + 1 ;

    pub fn game_result(&self) -> GameResult {
        if self.long_bet_count == 0 || self.short_bet_count == 0 {
            GameResult::CANCEL
        } else if self.open_price < self.close_price {
            GameResult::LONG
        } else if self.open_price > self.close_price {
            GameResult::SHORT
        } else {
            GameResult::DRAW
        }
    }

    pub fn next_round_over_amount(&self) -> u64 {

        match self.game_result() {
            GameResult::LONG => (self.short_bet_amount as u128 * 10 / 1000) as u64,
            GameResult::SHORT => (self.long_bet_amount as u128 * 10 / 1000) as u64,
            GameResult::DRAW => ((self.short_bet_amount + self.long_bet_amount) as u128 * 5 / 1000) as u64,
            GameResult::CANCEL => {
                return if self.long_bet_count == 0 {
                    self.long_bet_amount * 2
                } else {
                    self.short_bet_amount * 2
                }
                //self.short_bet_amount + self.long_bet_amount
            }
        }
    }

    pub fn divide_rate(&self) -> u64 {
        match self.game_result() {
            GameResult::LONG => (self.long_bet_amount + (self.short_bet_amount * 9 / 10)) * 10000 / self.long_bet_amount,
            GameResult::SHORT => (self.short_bet_amount + (self.long_bet_amount * 9 / 10)) * 10000 / self.short_bet_amount,
            GameResult::DRAW => 9500,
            GameResult::CANCEL => 0,
        }
    }

    pub fn divide_amount(&self, amount: u64) -> u64 {
        self.divide_rate() * amount / 10000
    }

    pub fn in_progress(&self, current: i64, deviation: i64) -> bool {
        self.start_time-deviation <= current && (self.start_time + self.bet_period)+deviation >= current
    }
}

#[account]
#[derive(Default, Debug)]
pub struct BetData {
    pub game: Pubkey,
    pub user: Pubkey,

    pub bet_direction: Option<BetDirection>,
    pub bet_amount: u64,


}

impl BetData {
    pub const SIZE: usize = 8 + 32 + 32 + 1 + 1 + 8 + 8 ;
}

#[account]
#[derive(Default, Debug)]
pub struct UserData {

    pub count_win: u32,
    pub count_lose: u32,
    pub count_draw: u32,
    pub count_bet: u32,
    pub count_game: u32,

    pub total_bet: u128,
    pub total_long_bet: u128,
    pub total_short_bet: u128,
    pub total_claim: u128,

    //pub entrants: UserEntrantData,
}

impl UserData {
    pub const SIZE: usize = 8+8*5+16*4 ;
}

#[account]
#[derive(Default, Debug)]
pub struct UserEntrantData {
    pub front: u32,
    pub rear: u32,

    //data abstractly in memory
    pub entrants_queue: [Pubkey; 6],
}

impl UserEntrantData {
    const BASE_SIZE: usize = 8 + 4 + 4;
    // 656 Bytes, Rent-exempt minimum: 0.00545664 SOL
    pub const MAX_SIZE: usize = UserEntrantData::BASE_SIZE + 32 * 6;
    pub const MAX_LENGTH: u32 = 6;

    pub fn is_empty(&self) -> bool {
        self.rear == self.front
    }

    pub fn is_full(&self) -> bool {
        ((self.rear + 1) % UserEntrantData::MAX_LENGTH) == self.front
    }

    pub fn length(&self) -> usize {
        if self.rear >= self.front {
            (self.rear - self.front) as usize
        } else {
            (UserEntrantData::MAX_LENGTH - (self.front  -self.rear)) as usize
        }
    }

    pub fn read_entrant(
        &self
    ) -> Pubkey {

        let position = ((self.front + 1) % UserEntrantData::MAX_LENGTH) as usize;

        self.entrants_queue[position].clone()
    }

    pub fn is_duplicated(&self, entrant: Pubkey) -> bool {
        entrant == self.entrants_queue[self.rear as usize]
    }

    pub fn enqueue(&mut self, entrant: Pubkey) -> Result<()> {
        if self.is_full() {
            return Err(ErrorCode::EntrantsQueueIsFull.into());
        }
        self.rear = (self.rear + 1) % UserEntrantData::MAX_LENGTH;
        self.entrants_queue[self.rear as usize] = entrant;

        Ok(())
    }

    pub fn dequeue(
        &mut self,
    ) -> Result<Pubkey> {
        if self.is_empty() {
            return Err(ErrorCode::EntrantsQueueIsEmpty.into());
        }
        self.front = (self.front + 1) % UserEntrantData::MAX_LENGTH;

        Ok(self.entrants_queue[self.front as usize])
    }
}

#[account]
#[derive(Default, Debug)]
pub struct TopPlayers {
    pub players: [TopPlayer; 20],
}

impl TopPlayers {
    pub const SIZE: usize = 8 + TopPlayer::SIZE * TopPlayers::MAX_LENGTH;
    pub const MAX_LENGTH: usize = 20;

    fn find_insert_index(&self, prize: u128) -> usize {
        let mut index = 0;
        for player in self.players.iter() {
            if player.prize < prize {
                break
            } else {
                index += 1;
            }
        }

        index as usize
    }

    //if already exists

    pub fn insert(&mut self, player: TopPlayer) -> Result<()> {
        let index = self.find_insert_index(player.prize);
        if index < self.players.len() {
            for n in self.players.len()-1 .. index {
                self.players[n+1] = self.players[n].clone();
            }
            self.players[index] = player;
        }
        Ok(())
    }
    pub fn insert2(&mut self, player: TopPlayer) -> Result<()> {
        let mut minimum_prize_amount: u128 = u128::MAX;
        let mut minimum_prize_index: i32 = -1;
        //let mut alreadyExists = false;

        for i in 0 .. self.players.len() {
            if self.players[i].account == player.account {
                self.players[i] = player.clone();
                return Ok(())
            }
            if self.players[i].prize < minimum_prize_amount {
                minimum_prize_amount = self.players[i].prize;
                minimum_prize_index = i as i32;
            }
        }

        if self.players.len() < TopPlayers::MAX_LENGTH {
            self.players[self.players.len()] = player.clone();
        } else {
            self.players[minimum_prize_index as usize] = player.clone();
        }

        Ok(())
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Default, Debug, Copy, Clone)]
pub struct TopPlayer {
    pub account: Pubkey,
    pub prize: u128,
    pub count_win: u32,
    pub count_lose: u32,
    pub count_draw: u32,
}

impl TopPlayer {
    pub const SIZE: usize = 32 + 16 + 4 + 4 + 4;
}


#[account]
#[derive(Default, Debug)]
pub struct RecentlyGames {
    pub front: u32,
    pub rear: u32,
    pub queue: [GameSummary; 16],
}

impl RecentlyGames {
    const BASE_SIZE: usize = 8 + 4 + 4;
    pub const MAX_SIZE: usize = RecentlyGames::BASE_SIZE + GameSummary::SIZE * 16;
    pub const MAX_LENGTH: u32 = 16;

    pub fn is_full(&self) -> bool {
        ((self.rear + 1) % RecentlyGames::MAX_LENGTH) == self.front
    }

    pub fn enqueue(&mut self, game: GameSummary) -> Result<()> {
        if self.is_full() {
            self.front = (self.front + 1) % RecentlyGames::MAX_LENGTH;
        }
        self.rear = (self.rear + 1) % RecentlyGames::MAX_LENGTH;
        self.queue[self.rear as usize] = game;

        Ok(())
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Default, Debug, Copy, Clone)]
pub struct GameSummary {
    pub start_time: i64,

    pub long_bet_amount: u64,
    pub long_bet_count: u32,
    pub short_bet_amount: u64,
    pub short_bet_count: u32,

    pub changed: i64,
}

impl GameSummary {
    pub const SIZE: usize = 8 + 12 + 12 + 8;
}
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Eq, PartialEq, Debug)]
pub enum GameState {
    Pending,

    OnGoing,
    Pausing,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Eq, PartialEq, Debug, Copy)]
pub enum BetDirection {
    LONG,
    SHORT,
}


#[derive(AnchorSerialize, AnchorDeserialize,  Clone, Eq, PartialEq, Debug, Copy)]
pub enum GameResult {
    LONG,
    SHORT,
    DRAW,
    CANCEL,
}

impl Default for GameResult {
    fn default() -> Self {
        GameResult::CANCEL
    }
}
