use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Account has incorrect owner!")]
    IncorrectOwner,
    #[msg("Account has incorrect token owner!")]
    IncorrectTokenOwner,
    #[msg("Account has incorrect manager!")]
    IncorrectManager,

    #[msg("BetDirection must be one-way")]
    InvalidBetDirection,

    #[msg("Amount must be positive")]
    InvalidBetAmount,

    #[msg("Entrants queue is full. Claim prize first")]
    EntrantsQueueIsFull,
    #[msg("Entrants queue is empty")]
    EntrantsQueueIsEmpty,

    #[msg("Incorrect length of accounts")]
    IncorrectAccountsLength,

    #[msg("Account for claim is incorrect")]
    IncorrectClaimAccount,
    #[msg("Accounts for claim is incorrect")]
    IncorrectClaimAccounts,

    #[msg("Account has incorrect entrant")]
    IncorrectEntrantAccount,

    #[msg("Wrong start time")]
    InvalidStartTime,

    #[msg("Current time is not possible to bet")]
    IncorrectBettingTime,

    #[msg("This game is already over")]
    GameAlreadyFinished,

    #[msg("Permission denied")]
    PermissionDenied,

    #[msg("Not a closable game (From User)")]
    NotClosableGameFromUser,
    #[msg("Not a closable game (From Time)")]
    NotClosableGameFromTime,
    #[msg("Not a closable game (From Finish)")]
    NotClosableGameFromFinish,

    NumericOverflowError,
}
