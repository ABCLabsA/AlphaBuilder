use anchor_lang::prelude::*;

#[error_code]
pub enum AlphaError {
    #[msg("Amount must be greater than zero")]
    AmountMustBePositive,
    #[msg("Vault balance is insufficient")]
    InsufficientVaultBalance,
    #[msg("Vault balance account missing for owner")]
    VaultBalanceMissing,
    #[msg("Caller is not authorised to withdraw")]
    WithdrawAuthorisationFailed,
    #[msg("Owner signature threshold not satisfied")]
    OwnerThresholdNotMet,
    #[msg("Duplicate owner detected")]
    DuplicateOwner,
    #[msg("Too many owners supplied")]
    TooManyOwners,
    #[msg("Too many guardians supplied")]
    TooManyGuardians,
    #[msg("Duplicate guardian detected")]
    DuplicateGuardian,
    #[msg("Guardian quorum not satisfied")]
    GuardianQuorumNotMet,
    #[msg("Guardian is not registered")]
    GuardianNotFound,
    #[msg("Guardian has already approved this recovery proposal")]
    GuardianAlreadyApproved,
    #[msg("Guardian recovery already in progress")]
    RecoveryInProgress,
    #[msg("No active guardian recovery to act on")]
    NoActiveRecovery,
    #[msg("Guardian recovery is not yet ready to execute")]
    RecoveryNotReady,
    #[msg("Session key already exhausted")]
    SessionKeyExhausted,
    #[msg("Session key has expired")]
    SessionKeyExpired,
    #[msg("Session key is not authorised for this program")]
    SessionProgramNotAuthorised,
    #[msg("Operator delegate is not configured")]
    OperatorNotConfigured,
    #[msg("Session key account does not belong to wallet")]
    SessionKeyWalletMismatch,
    #[msg("Memo exceeds allowed length")]
    MemoTooLong,
}
