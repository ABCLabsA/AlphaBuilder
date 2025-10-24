use anchor_lang::prelude::*;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

pub mod constants {
    pub const MAX_OWNERS: usize = 10;
    pub const MAX_GUARDIANS: usize = 10;
    pub const MAX_GUARDIAN_VOTES: usize = 10;
    pub const MAX_SESSION_PROGRAMS: usize = 8;
    pub const MAX_MEMO_LENGTH: usize = 128;
}

#[derive(
    AnchorSerialize,
    AnchorDeserialize,
    Clone,
    Copy,
    Debug,
    PartialEq,
    Eq,
    Serialize,
    Deserialize,
    JsonSchema,
)]
pub struct OwnerShare {
    pub owner: Pubkey,
    pub weight: u16,
}

impl OwnerShare {
    pub fn space() -> usize {
        32 + 2
    }
}

#[derive(
    AnchorSerialize,
    AnchorDeserialize,
    Clone,
    Debug,
    PartialEq,
    Eq,
    Serialize,
    Deserialize,
    JsonSchema,
)]
pub struct GuardianSet {
    pub guardians: Vec<Pubkey>,
    pub quorum: u8,
    pub cooldown_slots: u64,
    pub active_recovery: Option<RecoveryProposal>,
}

impl GuardianSet {
    pub fn base_space(max_guardians: usize) -> usize {
        4 + max_guardians * 32 + 1 + 8 + 1
    }
}

#[derive(
    AnchorSerialize,
    AnchorDeserialize,
    Clone,
    Debug,
    PartialEq,
    Eq,
    Serialize,
    Deserialize,
    JsonSchema,
)]
pub struct RecoveryProposal {
    pub proposed_slot: u64,
    pub execute_after_slot: u64,
    pub new_threshold: u16,
    pub new_owners: Vec<OwnerShare>,
    pub approvals: Vec<Pubkey>,
}

impl RecoveryProposal {
    pub fn space(max_owners: usize, max_guardians: usize) -> usize {
        8 + 8 + 2 + (4 + max_owners * OwnerShare::space()) + (4 + max_guardians * 32)
    }
}

#[account]
pub struct VaultConfig {
    pub admin: Pubkey,
    pub operator: Option<Pubkey>,
    pub bump: u8,
}

impl VaultConfig {
    pub const LEN: usize = 8 + 32 + 1 + 32 + 1;
}

#[account]
pub struct VaultTreasury {
    pub vault: Pubkey,
    pub bump: u8,
}

impl VaultTreasury {
    pub const LEN: usize = 8 + 32 + 1;
}

#[account]
pub struct VaultBalance {
    pub owner: Pubkey,
    pub amount: u64,
    pub bump: u8,
}

impl VaultBalance {
    pub const LEN: usize = 8 + 32 + 8 + 1;
}

#[account]
pub struct WalletState {
    pub owners: Vec<OwnerShare>,
    pub threshold: u16,
    pub guardians: GuardianSet,
    pub session_nonce: u64,
    pub treasury_bump: u8,
    pub operator_delegate: Option<Pubkey>,
}

impl WalletState {
    pub fn space(max_owners: usize, max_guardians: usize) -> usize {
        let owners_space = 4 + max_owners * OwnerShare::space();
        let guardian_space = GuardianSet::base_space(max_guardians)
            + RecoveryProposal::space(max_owners, max_guardians);
        8 + owners_space + 2 + guardian_space + 8 + 1 + 1 + 32
    }

    pub fn owner_weight(&self, owner: &Pubkey) -> Option<u16> {
        self.owners
            .iter()
            .find(|entry| entry.owner == *owner)
            .map(|entry| entry.weight)
    }
}

#[derive(
    AnchorSerialize,
    AnchorDeserialize,
    Clone,
    Debug,
    PartialEq,
    Eq,
    Serialize,
    Deserialize,
    JsonSchema,
)]
pub struct SessionConfig {
    pub expires_at_slot: Option<u64>,
    pub usage_limit: Option<u64>,
    pub value_limit: Option<u64>,
    pub allowed_programs: Vec<Pubkey>,
}

impl SessionConfig {
    pub fn space(max_allowed_programs: usize) -> usize {
        1 + 8 + 1 + 8 + 1 + 8 + 4 + max_allowed_programs * 32
    }
}

#[account]
pub struct SessionKeyAccount {
    pub wallet: Pubkey,
    pub authority: Pubkey,
    pub expires_at_slot: Option<u64>,
    pub remaining_calls: Option<u64>,
    pub remaining_value: Option<u64>,
    pub allowed_programs: Vec<Pubkey>,
    pub bump: u8,
}

impl SessionKeyAccount {
    pub fn space(max_programs: usize) -> usize {
        8 + 32 + 32 + 1 + 8 + 1 + 8 + 1 + 8 + (4 + max_programs * 32) + 1
    }
}
