use anchor_lang::prelude::*;
use anchor_lang::system_program;
use errors::AlphaError;
use state::constants::*;
use state::*;

pub mod errors;
pub mod state;

declare_id!("AlphaBldr11111111111111111111111111111111111");

#[program]
pub mod alpha_builder {
    use super::*;

    pub fn init_vault(ctx: Context<InitVault>, operator: Option<Pubkey>) -> Result<()> {
        let vault_config = &mut ctx.accounts.vault_config;
        vault_config.admin = ctx.accounts.admin.key();
        vault_config.operator = operator;
        vault_config.bump = *ctx
            .bumps
            .get("vault_config")
            .expect("vault_config bump must exist");

        let vault_treasury = &mut ctx.accounts.vault_treasury;
        vault_treasury.vault = vault_config.key();
        vault_treasury.bump = *ctx
            .bumps
            .get("vault_treasury")
            .expect("vault_treasury bump must exist");

        Ok(())
    }

    pub fn set_vault_operator(
        ctx: Context<SetVaultOperator>,
        operator: Option<Pubkey>,
    ) -> Result<()> {
        ctx.accounts.vault_config.operator = operator;
        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        require!(amount > 0, AlphaError::AmountMustBePositive);

        let owner_key = ctx.accounts.owner.key();
        let vault_balance = &mut ctx.accounts.vault_balance;
        require!(
            vault_balance.owner == owner_key || vault_balance.owner == Pubkey::default(),
            AlphaError::VaultBalanceMissing
        );

        if vault_balance.owner == Pubkey::default() {
            vault_balance.owner = owner_key;
            vault_balance.bump = *ctx
                .bumps
                .get("vault_balance")
                .expect("vault_balance bump must exist");
        }

        let transfer_accounts = system_program::Transfer {
            from: ctx.accounts.owner.to_account_info(),
            to: ctx.accounts.vault_treasury.to_account_info(),
        };
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                transfer_accounts,
            ),
            amount,
        )?;

        vault_balance.amount = vault_balance
            .amount
            .checked_add(amount)
            .expect("vault balance overflow");

        emit!(VaultDepositEvent {
            vault: ctx.accounts.vault_config.key(),
            owner: owner_key,
            amount,
            balance_after: vault_balance.amount,
        });

        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        require!(amount > 0, AlphaError::AmountMustBePositive);

        let authority_key = ctx.accounts.authority.key();
        let vault_balance = &mut ctx.accounts.vault_balance;

        let is_owner = authority_key == vault_balance.owner;
        let is_operator = ctx
            .accounts
            .vault_config
            .operator
            .map(|op| op == authority_key)
            .unwrap_or(false);
        let is_admin = authority_key == ctx.accounts.vault_config.admin;

        require!(
            is_owner || is_operator || is_admin,
            AlphaError::WithdrawAuthorisationFailed
        );
        require!(
            vault_balance.amount >= amount,
            AlphaError::InsufficientVaultBalance
        );

        vault_balance.amount = vault_balance.amount.checked_sub(amount).unwrap();

        let seeds = &[
            b"vault-treasury",
            ctx.accounts.vault_config.key().as_ref(),
            &[ctx.accounts.vault_treasury.bump],
        ];

        let transfer_accounts = system_program::Transfer {
            from: ctx.accounts.vault_treasury.to_account_info(),
            to: ctx.accounts.recipient.to_account_info(),
        };
        system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                transfer_accounts,
                &[seeds],
            ),
            amount,
        )?;

        emit!(VaultWithdrawalEvent {
            vault: ctx.accounts.vault_config.key(),
            owner: vault_balance.owner,
            recipient: ctx.accounts.recipient.key(),
            amount,
            balance_after: vault_balance.amount,
        });

        Ok(())
    }

    #[allow(clippy::too_many_arguments)]
    pub fn init_wallet(
        ctx: Context<InitWallet>,
        owners: Vec<OwnerShare>,
        threshold: u16,
        guardians: Vec<Pubkey>,
        guardian_quorum: u8,
        guardian_cooldown_slots: u64,
        operator_delegate: Option<Pubkey>,
    ) -> Result<()> {
        validate_owner_set(&owners)?;
        validate_guardians(&guardians, guardian_quorum)?;

        let total_weight: u64 = owners.iter().map(|o| o.weight as u64).sum();
        require!(!owners.is_empty(), AlphaError::OwnerThresholdNotMet);
        require!(
            (threshold as u64) > 0 && (threshold as u64) <= total_weight,
            AlphaError::OwnerThresholdNotMet
        );

        let wallet_state = &mut ctx.accounts.wallet_state;
        wallet_state.owners = owners;
        wallet_state.threshold = threshold;
        wallet_state.guardians = GuardianSet {
            guardians,
            quorum: guardian_quorum,
            cooldown_slots: guardian_cooldown_slots,
            active_recovery: None,
        };
        wallet_state.session_nonce = 0;
        wallet_state.treasury_bump = *ctx
            .bumps
            .get("wallet_treasury")
            .expect("wallet_treasury bump must exist");
        wallet_state.operator_delegate = operator_delegate;

        let wallet_treasury = &mut ctx.accounts.wallet_treasury;
        wallet_treasury.vault = wallet_state.key();
        wallet_treasury.bump = wallet_state.treasury_bump;

        Ok(())
    }

    pub fn set_wallet_operator(
        ctx: Context<WalletOwnerAuthority>,
        new_operator: Option<Pubkey>,
    ) -> Result<()> {
        let wallet = &mut ctx.accounts.wallet_state;
        verify_owner_threshold(wallet, &ctx.accounts.authority, ctx.remaining_accounts)?;
        wallet.operator_delegate = new_operator;
        Ok(())
    }

    pub fn register_session_key(
        ctx: Context<RegisterSessionKey>,
        config: SessionConfig,
    ) -> Result<()> {
        require!(
            config.allowed_programs.len() <= MAX_SESSION_PROGRAMS,
            AlphaError::SessionProgramNotAuthorised
        );

        let wallet = &mut ctx.accounts.wallet_state;
        verify_owner_threshold(wallet, &ctx.accounts.authority, ctx.remaining_accounts)?;

        let session_account = &mut ctx.accounts.session_account;
        session_account.wallet = wallet.key();
        session_account.authority = ctx.accounts.session_authority.key();
        session_account.expires_at_slot = config.expires_at_slot;
        session_account.remaining_calls = config.usage_limit;
        session_account.remaining_value = config.value_limit;
        session_account.allowed_programs = config.allowed_programs;
        session_account.bump = *ctx
            .bumps
            .get("session_account")
            .expect("session_account bump must exist");

        wallet.session_nonce = wallet
            .session_nonce
            .checked_add(1)
            .expect("session nonce overflow");

        emit!(SessionKeyRegistered {
            wallet: wallet.key(),
            authority: session_account.authority,
            expires_at_slot: session_account.expires_at_slot,
            usage_limit: session_account.remaining_calls,
        });

        Ok(())
    }

    pub fn revoke_session_key(ctx: Context<RevokeSessionKey>) -> Result<()> {
        let wallet = &ctx.accounts.wallet_state;
        verify_owner_threshold(wallet, &ctx.accounts.authority, ctx.remaining_accounts)?;

        emit!(SessionKeyRevoked {
            wallet: wallet.key(),
            authority: ctx.accounts.session_account.authority,
        });

        Ok(())
    }

    pub fn execute_transfer(
        ctx: Context<WalletTransferOwner>,
        amount: u64,
        memo: Option<Vec<u8>>,
    ) -> Result<()> {
        require!(amount > 0, AlphaError::AmountMustBePositive);
        if let Some(ref memo_bytes) = memo {
            require!(memo_bytes.len() <= MAX_MEMO_LENGTH, AlphaError::MemoTooLong);
        }

        let wallet = &ctx.accounts.wallet_state;
        verify_owner_threshold(wallet, &ctx.accounts.authority, ctx.remaining_accounts)?;
        transfer_from_wallet(
            wallet,
            &ctx.accounts.wallet_treasury,
            &ctx.accounts.destination,
            amount,
            &ctx.accounts.system_program,
        )?;

        emit!(WalletTransferEvent {
            wallet: wallet.key(),
            actor: ctx.accounts.authority.key(),
            destination: ctx.accounts.destination.key(),
            amount,
            memo,
            via_session: false,
        });

        Ok(())
    }

    pub fn execute_transfer_with_session(
        ctx: Context<SessionTransfer>,
        amount: u64,
        memo: Option<Vec<u8>>,
    ) -> Result<()> {
        require!(amount > 0, AlphaError::AmountMustBePositive);
        if let Some(ref memo_bytes) = memo {
            require!(memo_bytes.len() <= MAX_MEMO_LENGTH, AlphaError::MemoTooLong);
        }

        let session_account = &mut ctx.accounts.session_account;
        let wallet = &ctx.accounts.wallet_state;

        require!(
            session_account.wallet == wallet.key(),
            AlphaError::SessionKeyWalletMismatch
        );
        require!(
            session_account.authority == ctx.accounts.session_authority.key(),
            AlphaError::WithdrawAuthorisationFailed
        );

        if let Some(limit) = session_account.remaining_calls {
            require!(limit > 0, AlphaError::SessionKeyExhausted);
            session_account.remaining_calls = Some(limit - 1);
        }

        if let Some(value_limit) = session_account.remaining_value {
            require!(value_limit >= amount, AlphaError::InsufficientVaultBalance);
            session_account.remaining_value = Some(value_limit - amount);
        }

        if let Some(expiry) = session_account.expires_at_slot {
            let clock = Clock::get()?;
            require!(clock.slot <= expiry, AlphaError::SessionKeyExpired);
        }

        if !session_account.allowed_programs.is_empty() {
            require!(
                session_account
                    .allowed_programs
                    .iter()
                    .any(|program| *program == system_program::ID),
                AlphaError::SessionProgramNotAuthorised
            );
        }

        transfer_from_wallet(
            wallet,
            &ctx.accounts.wallet_treasury,
            &ctx.accounts.destination,
            amount,
            &ctx.accounts.system_program,
        )?;

        emit!(WalletTransferEvent {
            wallet: wallet.key(),
            actor: ctx.accounts.session_authority.key(),
            destination: ctx.accounts.destination.key(),
            amount,
            memo,
            via_session: true,
        });

        Ok(())
    }

    pub fn operator_transfer(
        ctx: Context<OperatorTransfer>,
        amount: u64,
        memo: Option<Vec<u8>>,
    ) -> Result<()> {
        require!(amount > 0, AlphaError::AmountMustBePositive);
        if let Some(ref memo_bytes) = memo {
            require!(memo_bytes.len() <= MAX_MEMO_LENGTH, AlphaError::MemoTooLong);
        }

        let wallet = &ctx.accounts.wallet_state;
        require!(
            wallet
                .operator_delegate
                .map(|op| op == ctx.accounts.operator.key())
                .unwrap_or(false),
            AlphaError::OperatorNotConfigured
        );

        transfer_from_wallet(
            wallet,
            &ctx.accounts.wallet_treasury,
            &ctx.accounts.destination,
            amount,
            &ctx.accounts.system_program,
        )?;

        emit!(WalletTransferEvent {
            wallet: wallet.key(),
            actor: ctx.accounts.operator.key(),
            destination: ctx.accounts.destination.key(),
            amount,
            memo,
            via_session: false,
        });

        Ok(())
    }

    pub fn guardian_initiate_recovery(
        ctx: Context<GuardianAction>,
        new_threshold: u16,
        new_owners: Vec<OwnerShare>,
    ) -> Result<()> {
        validate_owner_set(&new_owners)?;
        let wallet = &mut ctx.accounts.wallet_state;
        ensure_guardian_member(wallet, &ctx.accounts.guardian.key())?;
        require!(
            wallet.guardians.active_recovery.is_none(),
            AlphaError::RecoveryInProgress
        );

        let total_weight: u64 = new_owners.iter().map(|o| o.weight as u64).sum();
        require!(
            (new_threshold as u64) > 0 && (new_threshold as u64) <= total_weight,
            AlphaError::OwnerThresholdNotMet
        );

        let clock = Clock::get()?;
        let execute_after_slot = clock
            .slot
            .checked_add(wallet.guardians.cooldown_slots)
            .expect("slot overflow");

        wallet.guardians.active_recovery = Some(RecoveryProposal {
            proposed_slot: clock.slot,
            execute_after_slot,
            new_threshold,
            new_owners,
            approvals: vec![ctx.accounts.guardian.key()],
        });

        emit!(RecoveryProposed {
            wallet: wallet.key(),
            guardian: ctx.accounts.guardian.key(),
            execute_after_slot,
        });

        Ok(())
    }

    pub fn guardian_vote_recovery(ctx: Context<GuardianAction>) -> Result<()> {
        let wallet = &mut ctx.accounts.wallet_state;
        let guardian_key = ctx.accounts.guardian.key();
        ensure_guardian_member(wallet, &guardian_key)?;

        let recovery = wallet
            .guardians
            .active_recovery
            .as_mut()
            .ok_or(AlphaError::NoActiveRecovery)?;

        require!(
            !recovery.approvals.contains(&guardian_key),
            AlphaError::GuardianAlreadyApproved
        );
        recovery.approvals.push(guardian_key);

        emit!(RecoveryVote {
            wallet: wallet.key(),
            guardian: guardian_key,
            approvals: recovery.approvals.len() as u8,
        });

        Ok(())
    }

    pub fn guardian_execute_recovery(ctx: Context<GuardianAction>) -> Result<()> {
        let wallet = &mut ctx.accounts.wallet_state;
        ensure_guardian_member(wallet, &ctx.accounts.guardian.key())?;
        let recovery = wallet
            .guardians
            .active_recovery
            .as_ref()
            .ok_or(AlphaError::NoActiveRecovery)?
            .clone();

        let clock = Clock::get()?;
        require!(
            clock.slot >= recovery.execute_after_slot,
            AlphaError::RecoveryNotReady
        );

        require!(
            recovery.approvals.len() as u8 >= wallet.guardians.quorum,
            AlphaError::GuardianQuorumNotMet
        );

        wallet.owners = recovery.new_owners;
        wallet.threshold = recovery.new_threshold;
        wallet.guardians.active_recovery = None;

        emit!(RecoveryCompleted {
            wallet: wallet.key(),
            executed_slot: clock.slot,
        });

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitVault<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        init,
        payer = admin,
        space = VaultConfig::LEN,
        seeds = [b"vault", admin.key().as_ref()],
        bump
    )]
    pub vault_config: Account<'info, VaultConfig>,
    #[account(
        init,
        payer = admin,
        space = VaultTreasury::LEN,
        seeds = [b"vault-treasury", vault_config.key().as_ref()],
        bump
    )]
    pub vault_treasury: Account<'info, VaultTreasury>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetVaultOperator<'info> {
    #[account(mut, has_one = admin)]
    pub vault_config: Account<'info, VaultConfig>,
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        mut,
        seeds = [b"vault", vault_config.admin.as_ref()],
        bump = vault_config.bump
    )]
    pub vault_config: Account<'info, VaultConfig>,
    #[account(
        mut,
        seeds = [b"vault-treasury", vault_config.key().as_ref()],
        bump = vault_treasury.bump
    )]
    pub vault_treasury: Account<'info, VaultTreasury>,
    #[account(
        init_if_needed,
        payer = owner,
        space = VaultBalance::LEN,
        seeds = [b"vault-balance", vault_config.key().as_ref(), owner.key().as_ref()],
        bump
    )]
    pub vault_balance: Account<'info, VaultBalance>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [b"vault", vault_config.admin.as_ref()],
        bump = vault_config.bump
    )]
    pub vault_config: Account<'info, VaultConfig>,
    #[account(
        mut,
        seeds = [b"vault-treasury", vault_config.key().as_ref()],
        bump = vault_treasury.bump
    )]
    pub vault_treasury: Account<'info, VaultTreasury>,
    #[account(
        mut,
        seeds = [b"vault-balance", vault_config.key().as_ref(), vault_balance.owner.as_ref()],
        bump = vault_balance.bump
    )]
    pub vault_balance: Account<'info, VaultBalance>,
    /// CHECK: lamports destination validated at runtime
    #[account(mut)]
    pub recipient: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitWallet<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        init,
        payer = payer,
        space = WalletState::space(MAX_OWNERS, MAX_GUARDIANS)
    )]
    pub wallet_state: Account<'info, WalletState>,
    #[account(
        init,
        payer = payer,
        space = VaultTreasury::LEN,
        seeds = [b"wallet-treasury", wallet_state.key().as_ref()],
        bump
    )]
    pub wallet_treasury: Account<'info, VaultTreasury>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct WalletOwnerAuthority<'info> {
    pub authority: Signer<'info>,
    #[account(mut)]
    pub wallet_state: Account<'info, WalletState>,
}

#[derive(Accounts)]
pub struct WalletTransferOwner<'info> {
    pub authority: Signer<'info>,
    #[account(mut)]
    pub wallet_state: Account<'info, WalletState>,
    #[account(
        mut,
        seeds = [b"wallet-treasury", wallet_state.key().as_ref()],
        bump = wallet_state.treasury_bump
    )]
    pub wallet_treasury: Account<'info, VaultTreasury>,
    /// CHECK: destination account validated on transfer
    #[account(mut)]
    pub destination: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterSessionKey<'info> {
    pub authority: Signer<'info>,
    #[account(mut)]
    pub wallet_state: Account<'info, WalletState>,
    #[account(
        init,
        payer = payer,
        space = SessionKeyAccount::space(MAX_SESSION_PROGRAMS),
        seeds = [b"session-key", wallet_state.key().as_ref(), session_authority.key().as_ref()],
        bump
    )]
    pub session_account: Account<'info, SessionKeyAccount>,
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: derived in instruction
    pub session_authority: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RevokeSessionKey<'info> {
    pub authority: Signer<'info>,
    #[account(mut)]
    pub wallet_state: Account<'info, WalletState>,
    #[account(
        mut,
        close = authority,
        seeds = [b"session-key", wallet_state.key().as_ref(), session_account.authority.as_ref()],
        bump = session_account.bump
    )]
    pub session_account: Account<'info, SessionKeyAccount>,
}

#[derive(Accounts)]
pub struct SessionTransfer<'info> {
    #[account(mut)]
    pub session_account: Account<'info, SessionKeyAccount>,
    pub session_authority: Signer<'info>,
    #[account(
        mut,
        constraint = wallet_state.key() == session_account.wallet
    )]
    pub wallet_state: Account<'info, WalletState>,
    #[account(
        mut,
        seeds = [b"wallet-treasury", wallet_state.key().as_ref()],
        bump = wallet_state.treasury_bump
    )]
    pub wallet_treasury: Account<'info, VaultTreasury>,
    /// CHECK: destination validated on transfer
    #[account(mut)]
    pub destination: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct OperatorTransfer<'info> {
    pub operator: Signer<'info>,
    #[account(mut)]
    pub wallet_state: Account<'info, WalletState>,
    #[account(
        mut,
        seeds = [b"wallet-treasury", wallet_state.key().as_ref()],
        bump = wallet_state.treasury_bump
    )]
    pub wallet_treasury: Account<'info, VaultTreasury>,
    /// CHECK: destination validated on transfer
    #[account(mut)]
    pub destination: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct GuardianAction<'info> {
    pub guardian: Signer<'info>,
    #[account(mut)]
    pub wallet_state: Account<'info, WalletState>,
}

#[event]
pub struct VaultDepositEvent {
    pub vault: Pubkey,
    pub owner: Pubkey,
    pub amount: u64,
    pub balance_after: u64,
}

#[event]
pub struct VaultWithdrawalEvent {
    pub vault: Pubkey,
    pub owner: Pubkey,
    pub recipient: Pubkey,
    pub amount: u64,
    pub balance_after: u64,
}

#[event]
pub struct WalletTransferEvent {
    pub wallet: Pubkey,
    pub actor: Pubkey,
    pub destination: Pubkey,
    pub amount: u64,
    pub memo: Option<Vec<u8>>,
    pub via_session: bool,
}

#[event]
pub struct SessionKeyRegistered {
    pub wallet: Pubkey,
    pub authority: Pubkey,
    pub expires_at_slot: Option<u64>,
    pub usage_limit: Option<u64>,
}

#[event]
pub struct SessionKeyRevoked {
    pub wallet: Pubkey,
    pub authority: Pubkey,
}

#[event]
pub struct RecoveryProposed {
    pub wallet: Pubkey,
    pub guardian: Pubkey,
    pub execute_after_slot: u64,
}

#[event]
pub struct RecoveryVote {
    pub wallet: Pubkey,
    pub guardian: Pubkey,
    pub approvals: u8,
}

#[event]
pub struct RecoveryCompleted {
    pub wallet: Pubkey,
    pub executed_slot: u64,
}

fn validate_owner_set(owners: &[OwnerShare]) -> Result<()> {
    require!(!owners.is_empty(), AlphaError::OwnerThresholdNotMet);
    require!(owners.len() <= MAX_OWNERS, AlphaError::TooManyOwners);

    let mut seen: Vec<Pubkey> = Vec::with_capacity(owners.len());
    for owner in owners {
        require!(owner.weight > 0, AlphaError::OwnerThresholdNotMet);
        if seen.contains(&owner.owner) {
            return err!(AlphaError::DuplicateOwner);
        }
        seen.push(owner.owner);
    }
    Ok(())
}

fn validate_guardians(guardians: &[Pubkey], quorum: u8) -> Result<()> {
    require!(
        guardians.len() <= MAX_GUARDIANS,
        AlphaError::TooManyGuardians
    );
    if guardians.is_empty() {
        require!(quorum == 0, AlphaError::GuardianQuorumNotMet);
        return Ok(());
    }
    require!(
        quorum > 0 && quorum as usize <= guardians.len(),
        AlphaError::GuardianQuorumNotMet
    );

    let mut seen: Vec<Pubkey> = Vec::with_capacity(guardians.len());
    for guardian in guardians {
        if seen.contains(guardian) {
            return err!(AlphaError::DuplicateGuardian);
        }
        seen.push(*guardian);
    }
    Ok(())
}

fn verify_owner_threshold<'info>(
    wallet: &WalletState,
    primary: &Signer<'info>,
    remaining: &[AccountInfo<'info>],
) -> Result<()> {
    let mut total_weight: u64 = 0;
    let mut seen: Vec<Pubkey> = Vec::new();

    accumulate_owner_weight(
        wallet,
        &mut total_weight,
        &mut seen,
        &primary.to_account_info(),
    )?;
    for account in remaining {
        accumulate_owner_weight(wallet, &mut total_weight, &mut seen, account)?;
    }

    require!(
        total_weight >= wallet.threshold as u64,
        AlphaError::OwnerThresholdNotMet
    );
    Ok(())
}

fn accumulate_owner_weight<'info>(
    wallet: &WalletState,
    total_weight: &mut u64,
    seen: &mut Vec<Pubkey>,
    account: &AccountInfo<'info>,
) -> Result<()> {
    if !account.is_signer {
        return Ok(());
    }

    if seen.contains(account.key) {
        return Ok(());
    }

    if let Some(weight) = wallet.owner_weight(account.key) {
        *total_weight = total_weight
            .checked_add(weight as u64)
            .expect("weight overflow");
        seen.push(*account.key);
    }

    Ok(())
}

fn ensure_guardian_member(wallet: &WalletState, guardian: &Pubkey) -> Result<()> {
    require!(
        wallet.guardians.guardians.contains(guardian),
        AlphaError::GuardianNotFound
    );
    Ok(())
}

fn transfer_from_wallet<'info>(
    wallet: &Account<'info, WalletState>,
    treasury: &Account<'info, VaultTreasury>,
    destination: &AccountInfo<'info>,
    amount: u64,
    system_program: &Program<'info, System>,
) -> Result<()> {
    require!(
        treasury.vault == wallet.key(),
        AlphaError::VaultBalanceMissing
    );

    let seeds = &[
        b"wallet-treasury",
        wallet.key().as_ref(),
        &[wallet.treasury_bump],
    ];

    let transfer_accounts = system_program::Transfer {
        from: treasury.to_account_info(),
        to: destination.clone(),
    };

    system_program::transfer(
        CpiContext::new_with_signer(
            system_program.to_account_info(),
            transfer_accounts,
            &[seeds],
        ),
        amount,
    )
}
