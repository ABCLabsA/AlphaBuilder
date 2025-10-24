use anchor_lang::prelude::*;
use anchor_lang::InstructionData;
use solana_program::instruction::Instruction;
use solana_program_test::{processor, ProgramTest, ProgramTestContext};
use solana_sdk::signature::{Keypair, Signer};
use solana_sdk::transaction::Transaction;

pub async fn setup_program_test() -> ProgramTestContext {
    let mut program_test = ProgramTest::new(
        "alpha_builder",
        alpha_builder::ID,
        processor!(alpha_builder::entry),
    );
    program_test.start_with_context().await
}

pub async fn process_instruction(
    ctx: &mut ProgramTestContext,
    instruction: Instruction,
    signers: &[&Keypair],
) -> anyhow::Result<()> {
    let mut transaction = Transaction::new_with_payer(&[instruction], Some(&ctx.payer.pubkey()));
    let recent_blockhash = ctx.banks_client.get_latest_blockhash().await?;
    let mut all_signers = vec![&ctx.payer];
    all_signers.extend_from_slice(signers);
    transaction.try_sign(&all_signers, recent_blockhash)?;
    ctx.banks_client.process_transaction(transaction).await?;
    Ok(())
}
