use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Account has incorrect owner!")]
    IncorrectOwner,
    #[msg("Account has incorrect token owner!")]
    IncorrectTokenOwner,

    #[msg("Too much request!")]
    TooMuchRequest,

    #[msg("Permission denied")]
    PermissionDenied,
}
