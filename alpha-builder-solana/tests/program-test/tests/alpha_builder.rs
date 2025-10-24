use alpha_builder::instruction as program_ix;
use alpha_builder::state::{OwnerShare, SessionConfig, SessionKeyAccount, VaultBalance};
use alpha_builder_program_test::utils::{process_instruction, setup_program_test};
use anchor_lang::prelude::*;
use anchor_lang::AccountDeserialize;
use solana_program::instruction::AccountMeta;
use solana_program::system_program;
use solana_sdk::native_token::LAMPORTS_PER_SOL;
use solana_sdk::signature::{Keypair, Signer};

#[tokio::test]
async fn vault_deposit_withdraw_flow() -> anyhow::Result<()> {
    let mut ctx = setup_program_test().await;
    let admin = Keypair::new();
    let owner = Keypair::new();

    ctx.banks_client
        .request_airdrop(admin.pubkey(), 10 * LAMPORTS_PER_SOL)
        .await?;
    ctx.banks_client
        .request_airdrop(owner.pubkey(), 10 * LAMPORTS_PER_SOL)
        .await?;

    let (vault_config, _) =
        Pubkey::find_program_address(&[b"vault", admin.pubkey().as_ref()], &alpha_builder::ID);
    let (vault_treasury, _) = Pubkey::find_program_address(
        &[b"vault-treasury", vault_config.as_ref()],
        &alpha_builder::ID,
    );
    let (vault_balance, _) = Pubkey::find_program_address(
        &[
            b"vault-balance",
            vault_config.as_ref(),
            owner.pubkey().as_ref(),
        ],
        &alpha_builder::ID,
    );

    let init_accounts = alpha_builder::accounts::InitVault {
        admin: admin.pubkey(),
        vault_config,
        vault_treasury,
        system_program: system_program::ID,
    };
    let init_ix = program_ix::init_vault(alpha_builder::ID, init_accounts, None);
    process_instruction(&mut ctx, init_ix, &[&admin]).await?;

    let deposit_amount = 2 * LAMPORTS_PER_SOL;
    let deposit_accounts = alpha_builder::accounts::Deposit {
        owner: owner.pubkey(),
        vault_config,
        vault_treasury,
        vault_balance,
        system_program: system_program::ID,
    };
    let deposit_ix = program_ix::deposit(alpha_builder::ID, deposit_accounts, deposit_amount);
    process_instruction(&mut ctx, deposit_ix, &[&owner]).await?;

    let account = ctx
        .banks_client
        .get_account(vault_balance)
        .await?
        .expect("vault balance account");
    let mut data_slice: &[u8] = &account.data;
    let balance_state = VaultBalance::try_deserialize(&mut data_slice)?;
    assert_eq!(balance_state.amount, deposit_amount);

    let withdraw_accounts = alpha_builder::accounts::Withdraw {
        authority: owner.pubkey(),
        vault_config,
        vault_treasury,
        vault_balance,
        recipient: owner.pubkey(),
        system_program: system_program::ID,
    };
    let withdraw_ix = program_ix::withdraw(alpha_builder::ID, withdraw_accounts, deposit_amount);
    process_instruction(&mut ctx, withdraw_ix, &[&owner]).await?;

    let withdrawn_account = ctx
        .banks_client
        .get_account(vault_balance)
        .await?
        .expect("vault balance account");
    let mut withdrawn_slice: &[u8] = &withdrawn_account.data;
    let withdrawn_state = VaultBalance::try_deserialize(&mut withdrawn_slice)?;
    assert_eq!(withdrawn_state.amount, 0);

    Ok(())
}

#[tokio::test]
async fn wallet_owner_and_session_flow() -> anyhow::Result<()> {
    let mut ctx = setup_program_test().await;
    let payer_pubkey = ctx.payer.pubkey();
    let wallet_state = Keypair::new();
    let owner_a = Keypair::new();
    let owner_b = Keypair::new();
    let session_authority = Keypair::new();
    let recipient = Keypair::new();

    for key in [&owner_a, &owner_b, &session_authority, &recipient] {
        ctx.banks_client
            .request_airdrop(key.pubkey(), 5 * LAMPORTS_PER_SOL)
            .await?;
    }

    let (wallet_treasury, _) = Pubkey::find_program_address(
        &[b"wallet-treasury", wallet_state.pubkey().as_ref()],
        &alpha_builder::ID,
    );

    let init_accounts = alpha_builder::accounts::InitWallet {
        payer: payer_pubkey,
        wallet_state: wallet_state.pubkey(),
        wallet_treasury,
        system_program: system_program::ID,
    };
    let owners = vec![
        OwnerShare {
            owner: owner_a.pubkey(),
            weight: 1,
        },
        OwnerShare {
            owner: owner_b.pubkey(),
            weight: 1,
        },
    ];
    let guardians = vec![payer_pubkey];
    let init_ix = program_ix::init_wallet(
        alpha_builder::ID,
        init_accounts,
        owners.clone(),
        2,
        guardians,
        5,
        None,
    );
    process_instruction(&mut ctx, init_ix, &[&wallet_state]).await?;

    let top_up = solana_sdk::system_instruction::transfer(
        &payer_pubkey,
        &wallet_treasury,
        3 * LAMPORTS_PER_SOL,
    );
    process_instruction(&mut ctx, top_up, &[]).await?;

    let transfer_accounts = alpha_builder::accounts::WalletTransferOwner {
        authority: owner_a.pubkey(),
        wallet_state: wallet_state.pubkey(),
        wallet_treasury,
        destination: recipient.pubkey(),
        system_program: system_program::ID,
    };
    let mut owner_transfer_ix =
        program_ix::execute_transfer(alpha_builder::ID, transfer_accounts, LAMPORTS_PER_SOL, None);
    owner_transfer_ix
        .accounts
        .push(AccountMeta::new_readonly(owner_b.pubkey(), true));
    process_instruction(&mut ctx, owner_transfer_ix, &[&owner_a, &owner_b]).await?;

    let (session_account, _) = Pubkey::find_program_address(
        &[
            b"session-key",
            wallet_state.pubkey().as_ref(),
            session_authority.pubkey().as_ref(),
        ],
        &alpha_builder::ID,
    );
    let session_accounts = alpha_builder::accounts::RegisterSessionKey {
        authority: owner_a.pubkey(),
        wallet_state: wallet_state.pubkey(),
        session_account,
        payer: owner_a.pubkey(),
        session_authority: session_authority.pubkey(),
        system_program: system_program::ID,
    };
    let session_config = SessionConfig {
        expires_at_slot: None,
        usage_limit: Some(1),
        value_limit: Some(LAMPORTS_PER_SOL),
        allowed_programs: vec![system_program::ID],
    };
    let mut register_ix =
        program_ix::register_session_key(alpha_builder::ID, session_accounts, session_config);
    register_ix
        .accounts
        .push(AccountMeta::new_readonly(owner_b.pubkey(), true));
    process_instruction(&mut ctx, register_ix, &[&owner_a, &owner_b]).await?;

    let session_transfer_accounts = alpha_builder::accounts::SessionTransfer {
        session_account,
        session_authority: session_authority.pubkey(),
        wallet_state: wallet_state.pubkey(),
        wallet_treasury,
        destination: recipient.pubkey(),
        system_program: system_program::ID,
    };
    let session_transfer_ix = program_ix::execute_transfer_with_session(
        alpha_builder::ID,
        session_transfer_accounts,
        LAMPORTS_PER_SOL / 2,
        None,
    );
    process_instruction(&mut ctx, session_transfer_ix, &[&session_authority]).await?;

    let session_account_data = ctx
        .banks_client
        .get_account(session_account)
        .await?
        .expect("session account");
    let mut session_slice: &[u8] = &session_account_data.data;
    let session_state = SessionKeyAccount::try_deserialize(&mut session_slice)?;
    assert_eq!(session_state.remaining_calls, Some(0));

    Ok(())
}
