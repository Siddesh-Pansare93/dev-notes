# Build a Solana Token + Staking Program

> Ek complete, production-style project: apna custom SPL token + staking program jahan users tokens lock karke time-weighted rewards kamayenge.

---

## 🗺️ Kya Bana Rahe Hain

Socho ek bank hai jo tumhare deposit pe interest deta hai. Jitna zyada time paisa jama rehta hai, utna zyada interest milta hai. Staking program bilkul yahi karta hai — bas bank ki jagah, rules immutable code mein likhe hote hain Solana pe.

Is chapter ke end tak tumhare paas hoga:

1. Ek custom SPL token (tumhare project ki currency)
2. Ek Anchor smart contract jahan users woh token stake karke time ke saath rewards kamate hain
3. Ek minimal TypeScript frontend jo Phantom wallet se connect hokar tumhara program call karta hai

---

## 🧭 Poora Architecture Overview

```mermaid
graph TD
    User["User's Wallet"]
    PhantomUI["Frontend (React + Phantom)"]
    AnchorProgram["Staking Program (Anchor/Rust)"]
    StakePool["StakePool Account\n(PDA — program config)"]
    UserStakeInfo["UserStakeInfo Account\n(PDA per user)"]
    PoolVault["Pool Vault\n(PDA token account)"]
    UserTokenAccount["User's Token Account\n(ATA)"]
    MintAuthority["Mint Authority\n(Treasury Wallet)"]
    SPLToken["SPL Token Mint"]

    User -->|"holds tokens"| UserTokenAccount
    PhantomUI -->|"signs txns"| User
    PhantomUI -->|"calls instructions"| AnchorProgram
    AnchorProgram -->|"owns"| StakePool
    AnchorProgram -->|"creates per user"| UserStakeInfo
    AnchorProgram -->|"holds staked tokens"| PoolVault
    MintAuthority -->|"mints supply"| SPLToken
    SPLToken -->|"token type"| UserTokenAccount
    SPLToken -->|"token type"| PoolVault
    UserTokenAccount -->|"stake"| PoolVault
    PoolVault -->|"unstake"| UserTokenAccount
```

---

## 🏗️ Part 1 — Custom SPL Token Banana

### SPL Token Kya Hota Hai?

Solana ke token standard (SPL) ko ek factory blueprint jaisa socho. Blueprint (Token Program) ko pehle se pata hai koi bhi token kaise banana hai. Tumhe bas itna batana hai: "mujhe ek token chahiye jiske 9 decimal places hon, aur naye tokens sirf main mint kar sakoon." Factory ek **Mint account** stamp kar deti hai — tumhare token ki master identity.

```mermaid
graph LR
    TokenProgram["SPL Token Program\n(Solana built-in)"]
    Mint["Mint Account\n(your token's identity)"]
    TreasuryATA["Treasury ATA\n(holds initial supply)"]
    UserATA["User ATA\n(holds user's tokens)"]

    TokenProgram -->|"createMint()"| Mint
    Mint -->|"mintTo()"| TreasuryATA
    TreasuryATA -->|"transfer()"| UserATA
```

### Code Likhne Se Pehle Ke Key Concepts

| Term | Real-World Analogy | Kya Karta Hai |
|------|-------------------|--------------|
| Mint | Printing press | Woh authority jo naye tokens create karti hai |
| Mint Authority | Press ka malik | Sirf yehi keypair naye tokens mint kar sakta hai |
| ATA (Associated Token Account) | Tumhara ek currency ke liye bank account | Ek specific token ko ek wallet ke liye hold karta hai |
| Freeze Authority | Press pe lock | Token accounts freeze kar sakta hai (optional) |

### Custom Token Kab Use Karna Hai

**Use karo jab:**
- Tum DeFi protocol, game, ya DAO bana rahe ho jise apni currency chahiye
- Tum chahte ho users tumhare project ke liye specific value ka unit earn, spend, ya stake karein

**MAT use karo jab:**
- Sirf SOL transfer karna hai — SOL directly use karo
- Simple NFT bana rahe ho — Metaplex use karo

---

### 📦 Setup: Dependencies Install Karo

```bash
# Create project folder
mkdir solana-staking-project && cd solana-staking-project

# Initialize Node project
npm init -y

# Install Solana + SPL token tools
npm install @solana/web3.js @solana/spl-token ts-node typescript dotenv

# Install Anchor for the staking program
cargo install --git https://github.com/coral-xyz/anchor avm --locked
avm install latest && avm use latest
anchor init staking-program
```

---

### 📝 TypeScript: Token Create Aur Deploy Karo

`scripts/create-token.ts` banao:

```typescript
import {
  Connection,
  Keypair,
  PublicKey,
  clusterApiUrl,
} from "@solana/web3.js";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  getMint,
} from "@solana/spl-token";
import * as fs from "fs";

// ─── 1. Connect to Devnet ────────────────────────────────────────────────────
// Think of this like dialing into the Solana network's test environment
const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

// ─── 2. Load your treasury wallet keypair ───────────────────────────────────
// This wallet becomes the Mint Authority — it can mint new tokens
// NEVER commit your real keypair to git
const rawKeypair = JSON.parse(fs.readFileSync("./treasury-keypair.json", "utf8"));
const treasuryWallet = Keypair.fromSecretKey(Uint8Array.from(rawKeypair));

async function createToken() {
  console.log("Treasury wallet:", treasuryWallet.publicKey.toBase58());

  // ─── 3. Create the Mint ───────────────────────────────────────────────────
  // decimals: 9 means 1 token = 1_000_000_000 smallest units (like lamports for SOL)
  // mintAuthority: only this keypair can create new tokens
  // freezeAuthority: null means no one can freeze token accounts
  const mint = await createMint(
    connection,
    treasuryWallet,         // payer of the transaction fee
    treasuryWallet.publicKey, // mint authority
    null,                   // freeze authority (null = disabled)
    9                       // decimal places
  );

  console.log("Mint created:", mint.toBase58());

  // ─── 4. Create Treasury's Token Account ──────────────────────────────────
  // ATA = Associated Token Account — the "wallet slot" for this specific token
  // getOrCreate means: if treasury already has one, reuse it
  const treasuryATA = await getOrCreateAssociatedTokenAccount(
    connection,
    treasuryWallet,
    mint,
    treasuryWallet.publicKey
  );

  console.log("Treasury ATA:", treasuryATA.address.toBase58());

  // ─── 5. Mint Initial Supply ───────────────────────────────────────────────
  // Mint 1,000,000 tokens to treasury (multiply by 10^9 for decimals)
  const INITIAL_SUPPLY = 1_000_000 * 10 ** 9;

  await mintTo(
    connection,
    treasuryWallet,           // payer
    mint,                     // the mint
    treasuryATA.address,      // destination
    treasuryWallet,           // mint authority (must sign)
    INITIAL_SUPPLY
  );

  console.log(`Minted 1,000,000 tokens to treasury`);

  // ─── 6. Verify on-chain ───────────────────────────────────────────────────
  const mintInfo = await getMint(connection, mint);
  console.log("Total supply:", Number(mintInfo.supply) / 10 ** 9);

  // Save mint address for use in staking program
  fs.writeFileSync(
    "./mint-address.json",
    JSON.stringify({ mint: mint.toBase58() })
  );
}

createToken().catch(console.error);
```

Run karo:

```bash
# First generate a treasury keypair
solana-keygen new --outfile treasury-keypair.json

# Airdrop SOL for fees (devnet only)
solana airdrop 2 $(solana-keygen pubkey treasury-keypair.json) --url devnet

# Create the token
npx ts-node scripts/create-token.ts
```

---

## ⚙️ Part 2 — Staking Anchor Program (Rust)

### Staking Kaise Kaam Karta Hai — Analogy

Ek restaurant ka coat check counter imagine karo. Tum apna coat (tokens) de dete ho, badle mein ek ticket (UserStakeInfo account) milta hai, aur jab wapas aate ho to coat ke saath ek tip bhi milta hai jo jitna zyada time tumne chhoda utna bada hota hai. Coat room (Pool Vault) locked hota hai — sirf staking program hi use khol sakta hai.

### PDA Structure

PDAs (Program Derived Addresses) aise accounts hain jo tumhare program ke owned hote hain. Inka koi private key exist hi nahi karta — program khud hi in accounts se funds move kar sakta hai.

```mermaid
graph TD
    ProgramID["Your Program ID"]

    subgraph "StakePool PDA"
        SP_Seeds["Seeds: b'stake_pool'"]
        SP_Bump["bump"]
        SP_Data["reward_rate\ntotal_staked\nvault_bump"]
    end

    subgraph "Pool Vault PDA (Token Account)"
        PV_Seeds["Seeds: b'pool_vault'\nmint_address"]
        PV_Data["Holds all staked tokens"]
    end

    subgraph "UserStakeInfo PDA (per user)"
        USI_Seeds["Seeds: b'user_stake'\nuser_pubkey"]
        USI_Data["amount_staked\nlast_stake_time\npending_rewards"]
    end

    ProgramID --> SP_Seeds --> SP_Bump
    ProgramID --> PV_Seeds --> PV_Data
    ProgramID --> USI_Seeds --> USI_Data
```

---

### Poora Anchor Program

`staking-program/programs/staking-program/src/lib.rs` ke andar:

```rust
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

// ─── Program ID ──────────────────────────────────────────────────────────────
// Anchor generates this when you run `anchor build` for the first time
// Replace with your actual program ID after first build
declare_id!("YourProgramIDHere1111111111111111111111111111");

// ─── Constants ────────────────────────────────────────────────────────────────
// Reward rate: how many token units (smallest unit) earned per second per staked unit
// Example: 1 = 1 lamport-equivalent per second per token
// In production you would tune this carefully
const REWARD_RATE: u64 = 1;

// ─── Program Entry Point ─────────────────────────────────────────────────────
#[program]
pub mod staking_program {
    use super::*;

    // =========================================================================
    // INSTRUCTION 1: initialize_pool
    // Called once by the admin to set up the staking pool.
    // Like opening the coat check room before customers arrive.
    // =========================================================================
    pub fn initialize_pool(ctx: Context<InitializePool>, reward_rate: u64) -> Result<()> {
        let pool = &mut ctx.accounts.stake_pool;

        // Store the admin who initialized — only admin can change pool settings
        pool.admin = ctx.accounts.admin.key();

        // Store which token this pool accepts
        pool.token_mint = ctx.accounts.token_mint.key();

        // Store the vault address so we can verify it later
        pool.vault = ctx.accounts.pool_vault.key();

        // How many reward units are given per second per staked token
        pool.reward_rate = reward_rate;

        // Nobody has staked yet
        pool.total_staked = 0;

        // Save the vault's bump so we can use it to sign transactions later
        // A "bump" is the number that makes a valid PDA address
        pool.vault_bump = ctx.bumps.pool_vault;

        // Save the pool's own bump for the same reason
        pool.bump = ctx.bumps.stake_pool;

        msg!("Staking pool initialized. Reward rate: {}", reward_rate);
        Ok(())
    }

    // =========================================================================
    // INSTRUCTION 2: stake
    // User deposits tokens into the pool vault.
    // Like handing your coat to the coat check.
    // =========================================================================
    pub fn stake(ctx: Context<Stake>, amount: u64) -> Result<()> {
        // ── Validate amount ──────────────────────────────────────────────────
        // You cannot stake zero tokens — that would be meaningless
        require!(amount > 0, StakingError::ZeroAmount);

        let pool = &mut ctx.accounts.stake_pool;
        let user_stake = &mut ctx.accounts.user_stake_info;

        // ── Get current time ─────────────────────────────────────────────────
        // Solana gives us the on-chain clock — this is trustworthy unlike a server clock
        let clock = Clock::get()?;
        let now = clock.unix_timestamp as u64;

        // ── Settle pending rewards BEFORE changing the stake amount ──────────
        // IMPORTANT: Always calculate rewards based on the OLD amount before adding more
        // If you add first then calculate, you would give too many rewards
        if user_stake.amount_staked > 0 {
            let time_elapsed = now - user_stake.last_stake_time;
            // Simple time-weighted reward formula:
            // rewards = amount_staked * time_elapsed * reward_rate
            // Division by a large number prevents overflow for small reward rates
            let earned = user_stake.amount_staked
                .checked_mul(time_elapsed)
                .ok_or(StakingError::MathOverflow)?
                .checked_mul(pool.reward_rate)
                .ok_or(StakingError::MathOverflow)?
                .checked_div(1_000_000)  // scale factor to keep numbers reasonable
                .ok_or(StakingError::MathOverflow)?;

            // Add earned rewards to pending balance (not distributed yet)
            user_stake.pending_rewards = user_stake.pending_rewards
                .checked_add(earned)
                .ok_or(StakingError::MathOverflow)?;
        }

        // ── Transfer tokens from user to vault ───────────────────────────────
        // The Transfer CPI (Cross-Program Invocation) calls the SPL Token program
        // to move tokens. The user must have signed this transaction.
        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_token_account.to_account_info(),
                to: ctx.accounts.pool_vault.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),  // user must sign
            },
        );
        token::transfer(transfer_ctx, amount)?;

        // ── Update user's stake record ────────────────────────────────────────
        user_stake.owner = ctx.accounts.user.key();
        user_stake.amount_staked = user_stake.amount_staked
            .checked_add(amount)
            .ok_or(StakingError::MathOverflow)?;

        // Reset the clock — rewards accumulate from THIS moment forward
        user_stake.last_stake_time = now;
        user_stake.bump = ctx.bumps.user_stake_info;

        // ── Update pool total ─────────────────────────────────────────────────
        pool.total_staked = pool.total_staked
            .checked_add(amount)
            .ok_or(StakingError::MathOverflow)?;

        msg!("User staked {} tokens. Total staked: {}", amount, pool.total_staked);
        Ok(())
    }

    // =========================================================================
    // INSTRUCTION 3: unstake
    // User withdraws their tokens + pending rewards.
    // Like claiming your coat and receiving a tip.
    // =========================================================================
    pub fn unstake(ctx: Context<Unstake>, amount: u64) -> Result<()> {
        require!(amount > 0, StakingError::ZeroAmount);

        let pool = &mut ctx.accounts.stake_pool;
        let user_stake = &mut ctx.accounts.user_stake_info;

        // ── Validate user has enough staked ──────────────────────────────────
        require!(
            user_stake.amount_staked >= amount,
            StakingError::InsufficientStake
        );

        let clock = Clock::get()?;
        let now = clock.unix_timestamp as u64;

        // ── Calculate final rewards before unstaking ─────────────────────────
        let time_elapsed = now - user_stake.last_stake_time;
        let earned = user_stake.amount_staked
            .checked_mul(time_elapsed)
            .ok_or(StakingError::MathOverflow)?
            .checked_mul(pool.reward_rate)
            .ok_or(StakingError::MathOverflow)?
            .checked_div(1_000_000)
            .ok_or(StakingError::MathOverflow)?;

        user_stake.pending_rewards = user_stake.pending_rewards
            .checked_add(earned)
            .ok_or(StakingError::MathOverflow)?;

        // ── Transfer staked tokens back to user ──────────────────────────────
        // IMPORTANT: The vault PDA cannot sign like a regular wallet.
        // We use "signer seeds" — the same seeds that created the PDA.
        // Anchor uses these to prove: "yes, our program controls this account."
        let pool_key = pool.key();
        let signer_seeds: &[&[&[u8]]] = &[&[
            b"pool_vault",
            pool_key.as_ref(),
            &[pool.vault_bump],
        ]];

        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.pool_vault.to_account_info(),
                to: ctx.accounts.user_token_account.to_account_info(),
                authority: ctx.accounts.pool_vault.to_account_info(), // PDA is authority
            },
            signer_seeds,  // PDA "signature" using seeds
        );
        token::transfer(transfer_ctx, amount)?;

        // ── Update records ────────────────────────────────────────────────────
        user_stake.amount_staked = user_stake.amount_staked
            .checked_sub(amount)
            .ok_or(StakingError::MathOverflow)?;

        user_stake.last_stake_time = now;

        pool.total_staked = pool.total_staked
            .checked_sub(amount)
            .ok_or(StakingError::MathOverflow)?;

        msg!("User unstaked {} tokens", amount);
        Ok(())
    }

    // =========================================================================
    // INSTRUCTION 4: claim_rewards
    // User claims accumulated rewards without touching their stake.
    // Like collecting interest without closing your savings account.
    // =========================================================================
    pub fn claim_rewards(ctx: Context<ClaimRewards>) -> Result<()> {
        let pool = &mut ctx.accounts.stake_pool;
        let user_stake = &mut ctx.accounts.user_stake_info;

        let clock = Clock::get()?;
        let now = clock.unix_timestamp as u64;

        // ── Calculate rewards since last action ───────────────────────────────
        let time_elapsed = now - user_stake.last_stake_time;
        let earned = user_stake.amount_staked
            .checked_mul(time_elapsed)
            .ok_or(StakingError::MathOverflow)?
            .checked_mul(pool.reward_rate)
            .ok_or(StakingError::MathOverflow)?
            .checked_div(1_000_000)
            .ok_or(StakingError::MathOverflow)?;

        let total_rewards = user_stake.pending_rewards
            .checked_add(earned)
            .ok_or(StakingError::MathOverflow)?;

        // ── Check there are rewards to claim ─────────────────────────────────
        require!(total_rewards > 0, StakingError::NoRewards);

        // ── Transfer rewards from vault to user ───────────────────────────────
        let pool_key = pool.key();
        let signer_seeds: &[&[&[u8]]] = &[&[
            b"pool_vault",
            pool_key.as_ref(),
            &[pool.vault_bump],
        ]];

        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.pool_vault.to_account_info(),
                to: ctx.accounts.user_token_account.to_account_info(),
                authority: ctx.accounts.pool_vault.to_account_info(),
            },
            signer_seeds,
        );
        token::transfer(transfer_ctx, total_rewards)?;

        // ── Reset reward tracking ─────────────────────────────────────────────
        user_stake.pending_rewards = 0;
        user_stake.last_stake_time = now;

        msg!("Claimed {} reward tokens", total_rewards);
        Ok(())
    }
}

// ─── Account Structs ─────────────────────────────────────────────────────────
// These describe WHICH accounts each instruction needs and HOW to validate them

// ── InitializePool accounts ───────────────────────────────────────────────────
#[derive(Accounts)]
pub struct InitializePool<'info> {
    // The admin who creates the pool — they pay for the new accounts
    #[account(mut)]
    pub admin: Signer<'info>,

    // The SPL token mint that users will stake
    pub token_mint: Account<'info, Mint>,

    // StakePool PDA: seeds = ["stake_pool"], owned by this program
    // init: create it now, space: how many bytes to allocate
    #[account(
        init,
        payer = admin,
        space = 8 + StakePool::INIT_SPACE,  // 8 = Anchor discriminator
        seeds = [b"stake_pool"],
        bump
    )]
    pub stake_pool: Account<'info, StakePool>,

    // Pool Vault: a token account PDA that will hold all staked tokens
    // token::mint = token_mint means this vault only accepts token_mint tokens
    // token::authority = pool_vault means the vault itself is the authority (PDA)
    #[account(
        init,
        payer = admin,
        token::mint = token_mint,
        token::authority = pool_vault,
        seeds = [b"pool_vault", stake_pool.key().as_ref()],
        bump
    )]
    pub pool_vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

// ── Stake accounts ────────────────────────────────────────────────────────────
#[derive(Accounts)]
pub struct Stake<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"stake_pool"],
        bump = stake_pool.bump
    )]
    pub stake_pool: Account<'info, StakePool>,

    // UserStakeInfo PDA: one per user per pool
    // init_if_needed: create on first stake, reuse on subsequent stakes
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + UserStakeInfo::INIT_SPACE,
        seeds = [b"user_stake", user.key().as_ref()],
        bump
    )]
    pub user_stake_info: Account<'info, UserStakeInfo>,

    // The user's personal token account (they send tokens FROM here)
    #[account(
        mut,
        token::mint = stake_pool.token_mint,
        token::authority = user
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    // The vault receives staked tokens
    #[account(
        mut,
        seeds = [b"pool_vault", stake_pool.key().as_ref()],
        bump = stake_pool.vault_bump
    )]
    pub pool_vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

// ── Unstake accounts ──────────────────────────────────────────────────────────
#[derive(Accounts)]
pub struct Unstake<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"stake_pool"],
        bump = stake_pool.bump
    )]
    pub stake_pool: Account<'info, StakePool>,

    #[account(
        mut,
        seeds = [b"user_stake", user.key().as_ref()],
        bump = user_stake_info.bump,
        // constraint: only the owner of this stake info can unstake
        constraint = user_stake_info.owner == user.key() @ StakingError::Unauthorized
    )]
    pub user_stake_info: Account<'info, UserStakeInfo>,

    #[account(
        mut,
        token::mint = stake_pool.token_mint,
        token::authority = user
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"pool_vault", stake_pool.key().as_ref()],
        bump = stake_pool.vault_bump
    )]
    pub pool_vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

// ── ClaimRewards accounts ─────────────────────────────────────────────────────
#[derive(Accounts)]
pub struct ClaimRewards<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"stake_pool"],
        bump = stake_pool.bump
    )]
    pub stake_pool: Account<'info, StakePool>,

    #[account(
        mut,
        seeds = [b"user_stake", user.key().as_ref()],
        bump = user_stake_info.bump,
        constraint = user_stake_info.owner == user.key() @ StakingError::Unauthorized
    )]
    pub user_stake_info: Account<'info, UserStakeInfo>,

    #[account(
        mut,
        token::mint = stake_pool.token_mint,
        token::authority = user
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"pool_vault", stake_pool.key().as_ref()],
        bump = stake_pool.vault_bump
    )]
    pub pool_vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

// ─── Data Structs (on-chain storage) ─────────────────────────────────────────

// StakePool holds global configuration for the pool
#[account]
#[derive(InitSpace)]
pub struct StakePool {
    pub admin: Pubkey,        // 32 bytes — who created this pool
    pub token_mint: Pubkey,   // 32 bytes — which token is staked
    pub vault: Pubkey,        // 32 bytes — where staked tokens live
    pub reward_rate: u64,     // 8 bytes  — rewards per second per token
    pub total_staked: u64,    // 8 bytes  — total tokens staked right now
    pub vault_bump: u8,       // 1 byte   — PDA bump for the vault
    pub bump: u8,             // 1 byte   — PDA bump for this account
}

// UserStakeInfo holds per-user staking data
#[account]
#[derive(InitSpace)]
pub struct UserStakeInfo {
    pub owner: Pubkey,           // 32 bytes — which wallet owns this stake
    pub amount_staked: u64,      // 8 bytes  — how much they have staked
    pub last_stake_time: u64,    // 8 bytes  — unix timestamp of last action
    pub pending_rewards: u64,    // 8 bytes  — accumulated but unclaimed rewards
    pub bump: u8,                // 1 byte   — PDA bump
}

// ─── Custom Errors ────────────────────────────────────────────────────────────
// Clear error messages make debugging much easier
#[error_code]
pub enum StakingError {
    #[msg("Amount must be greater than zero")]
    ZeroAmount,
    #[msg("Insufficient staked balance")]
    InsufficientStake,
    #[msg("Math overflow — numbers got too large")]
    MathOverflow,
    #[msg("No rewards to claim")]
    NoRewards,
    #[msg("You are not authorized to perform this action")]
    Unauthorized,
}
```

---

### Reward Calculation — Simple Bhasha Mein

```mermaid
sequenceDiagram
    participant User
    participant Program
    participant Clock

    User->>Program: stake(100 tokens) at T=0
    Program->>Clock: get current time
    Clock-->>Program: T=0
    Program->>Program: last_stake_time = 0, amount = 100

    Note over Program: Time passes... T=3600 (1 hour)

    User->>Program: claim_rewards()
    Program->>Clock: get current time
    Clock-->>Program: T=3600
    Program->>Program: elapsed = 3600 - 0 = 3600s
    Program->>Program: earned = 100 * 3600 * rate / 1_000_000
    Program->>User: transfer earned tokens
```

Formula jaan-boojh kar simple rakha hai:
```
rewards = amount_staked × time_elapsed × reward_rate ÷ scale_factor
```

Production mein tum yeh add karoge:
- Time ke saath reward rate decay
- Maximum reward caps
- Basis points use karke APY-based calculations

---

### TypeScript Tests

`tests/staking-program.ts` banao:

```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { StakingProgram } from "../target/types/staking_program";
import {
  createMint,
  createAssociatedTokenAccount,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import { assert } from "chai";

describe("staking-program", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.StakingProgram as Program<StakingProgram>;

  let mint: anchor.web3.PublicKey;
  let userTokenAccount: anchor.web3.PublicKey;
  let stakePoolPDA: anchor.web3.PublicKey;
  let poolVaultPDA: anchor.web3.PublicKey;
  let userStakeInfoPDA: anchor.web3.PublicKey;

  const user = provider.wallet;

  before(async () => {
    // ── Create test token ─────────────────────────────────────────────────
    mint = await createMint(
      provider.connection,
      (user as anchor.Wallet).payer,
      user.publicKey,
      null,
      9
    );

    // ── Create user's token account and mint tokens ───────────────────────
    userTokenAccount = await createAssociatedTokenAccount(
      provider.connection,
      (user as anchor.Wallet).payer,
      mint,
      user.publicKey
    );

    await mintTo(
      provider.connection,
      (user as anchor.Wallet).payer,
      mint,
      userTokenAccount,
      user.publicKey,
      1_000 * 10 ** 9  // mint 1000 tokens for testing
    );

    // ── Derive PDAs ───────────────────────────────────────────────────────
    [stakePoolPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("stake_pool")],
      program.programId
    );

    [poolVaultPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("pool_vault"), stakePoolPDA.toBuffer()],
      program.programId
    );

    [userStakeInfoPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("user_stake"), user.publicKey.toBuffer()],
      program.programId
    );
  });

  it("Initializes the staking pool", async () => {
    const REWARD_RATE = new anchor.BN(1);

    await program.methods
      .initializePool(REWARD_RATE)
      .accounts({
        admin: user.publicKey,
        tokenMint: mint,
        stakePool: stakePoolPDA,
        poolVault: poolVaultPDA,
      })
      .rpc();

    const pool = await program.account.stakePool.fetch(stakePoolPDA);
    assert.equal(pool.rewardRate.toNumber(), 1);
    assert.equal(pool.totalStaked.toNumber(), 0);
    console.log("Pool initialized successfully");
  });

  it("Stakes tokens", async () => {
    const STAKE_AMOUNT = new anchor.BN(100 * 10 ** 9); // 100 tokens

    const vaultBefore = await getAccount(provider.connection, poolVaultPDA);

    await program.methods
      .stake(STAKE_AMOUNT)
      .accounts({
        user: user.publicKey,
        stakePool: stakePoolPDA,
        userStakeInfo: userStakeInfoPDA,
        userTokenAccount: userTokenAccount,
        poolVault: poolVaultPDA,
      })
      .rpc();

    const userStake = await program.account.userStakeInfo.fetch(userStakeInfoPDA);
    const vaultAfter = await getAccount(provider.connection, poolVaultPDA);

    assert.equal(userStake.amountStaked.toNumber(), STAKE_AMOUNT.toNumber());
    assert.equal(
      Number(vaultAfter.amount) - Number(vaultBefore.amount),
      STAKE_AMOUNT.toNumber()
    );
    console.log("Staked 100 tokens successfully");
  });

  it("Unstakes tokens", async () => {
    const UNSTAKE_AMOUNT = new anchor.BN(50 * 10 ** 9); // unstake half

    await program.methods
      .unstake(UNSTAKE_AMOUNT)
      .accounts({
        user: user.publicKey,
        stakePool: stakePoolPDA,
        userStakeInfo: userStakeInfoPDA,
        userTokenAccount: userTokenAccount,
        poolVault: poolVaultPDA,
      })
      .rpc();

    const userStake = await program.account.userStakeInfo.fetch(userStakeInfoPDA);
    assert.equal(userStake.amountStaked.toNumber(), 50 * 10 ** 9);
    console.log("Unstaked 50 tokens successfully");
  });

  it("Claims rewards", async () => {
    // Wait a moment so rewards accumulate (in production, you'd advance the clock)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const userAccountBefore = await getAccount(provider.connection, userTokenAccount);

    await program.methods
      .claimRewards()
      .accounts({
        user: user.publicKey,
        stakePool: stakePoolPDA,
        userStakeInfo: userStakeInfoPDA,
        userTokenAccount: userTokenAccount,
        poolVault: poolVaultPDA,
      })
      .rpc();

    const userAccountAfter = await getAccount(provider.connection, userTokenAccount);
    console.log(
      "Rewards claimed:",
      Number(userAccountAfter.amount) - Number(userAccountBefore.amount)
    );
  });
});
```

Tests run karo:

```bash
cd staking-program
anchor test
```

---

### Trade-offs: Reward Models

| Model | Kaise Kaam Karta Hai | Fayde | Nuksan |
|-------|-------------|------|------|
| Time-weighted (yeh chapter) | rewards ∝ time × amount | Simple, predictable | Inflation zyada ho sakta hai |
| Emissions-based | fixed tokens/day sabhi stakers mein split | Pool badhne pe fair | Zyada stakers aane pe per-user reward gir jata hai |
| NFT-boosted | NFT holders zyada kamate hain | Community engage hoti hai | Implement karna complex |
| Lock-up periods | X din stake karo, zyada kamao | Sell pressure kam hoti hai | Users ke liye kam flexible |

---

## 🖥️ Part 3 — Frontend (React + Phantom)

### Wallet Connection Flow

```mermaid
sequenceDiagram
    participant Browser
    participant PhantomExtension
    participant SolanaRPC
    participant YourProgram

    Browser->>PhantomExtension: window.solana.connect()
    PhantomExtension-->>Browser: publicKey
    Browser->>SolanaRPC: getAccountInfo(userStakeInfoPDA)
    SolanaRPC-->>Browser: stake amount + pending rewards
    Browser->>PhantomExtension: signTransaction(stakeIx)
    PhantomExtension-->>Browser: signed tx
    Browser->>SolanaRPC: sendRawTransaction(signedTx)
    SolanaRPC->>YourProgram: execute stake instruction
    YourProgram-->>SolanaRPC: success
    SolanaRPC-->>Browser: tx signature
```

### Minimal React Component

```tsx
// src/StakingDashboard.tsx
import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Connection, PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";

// ─── Constants ────────────────────────────────────────────────────────────────
const PROGRAM_ID = new PublicKey("YourProgramIDHere1111111111111111111111111111");
const TOKEN_MINT = new PublicKey("YourMintAddressHere111111111111111111111111");
const RPC_URL = "https://api.devnet.solana.com";

export function StakingDashboard() {
  const { publicKey, signTransaction, connected } = useWallet();
  const [stakeAmount, setStakeAmount] = useState("");
  const [stakedBalance, setStakedBalance] = useState<number>(0);
  const [pendingRewards, setPendingRewards] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  // ── Derive PDAs deterministically on the frontend ─────────────────────────
  // This must match the exact same seeds as in your Rust program
  const getStakePoolPDA = () =>
    PublicKey.findProgramAddressSync([Buffer.from("stake_pool")], PROGRAM_ID)[0];

  const getUserStakeInfoPDA = (userPubkey: PublicKey) =>
    PublicKey.findProgramAddressSync(
      [Buffer.from("user_stake"), userPubkey.toBuffer()],
      PROGRAM_ID
    )[0];

  // ── Load user's current stake data ───────────────────────────────────────
  useEffect(() => {
    if (!connected || !publicKey) return;

    async function loadStakeData() {
      const connection = new Connection(RPC_URL);
      const provider = new anchor.AnchorProvider(connection, {
        publicKey: publicKey!,
        signTransaction: signTransaction!,
        signAllTransactions: async (txs) => txs,
      }, {});

      // Load IDL (the program's type definitions)
      // In production, import this from your generated types
      const idl = await anchor.Program.fetchIdl(PROGRAM_ID, provider);
      if (!idl) return;

      const program = new anchor.Program(idl, PROGRAM_ID, provider);
      const userStakePDA = getUserStakeInfoPDA(publicKey!);

      try {
        const userStake = await (program.account as any).userStakeInfo.fetch(userStakePDA);
        setStakedBalance(userStake.amountStaked.toNumber() / 10 ** 9);
        setPendingRewards(userStake.pendingRewards.toNumber() / 10 ** 9);
      } catch {
        // Account doesn't exist yet — user hasn't staked
        setStakedBalance(0);
        setPendingRewards(0);
      }
    }

    loadStakeData();
  }, [connected, publicKey]);

  // ── Handle Stake ──────────────────────────────────────────────────────────
  async function handleStake() {
    if (!publicKey || !stakeAmount) return;
    setLoading(true);

    try {
      const connection = new Connection(RPC_URL);
      const provider = new anchor.AnchorProvider(connection, {
        publicKey,
        signTransaction: signTransaction!,
        signAllTransactions: async (txs) => txs,
      }, {});

      const idl = await anchor.Program.fetchIdl(PROGRAM_ID, provider);
      const program = new anchor.Program(idl!, PROGRAM_ID, provider);

      const amount = new BN(parseFloat(stakeAmount) * 10 ** 9);
      const stakePoolPDA = getStakePoolPDA();
      const userStakePDA = getUserStakeInfoPDA(publicKey);

      // Build and send the stake transaction
      // Anchor handles instruction building — you just call the method by name
      await (program.methods as any)
        .stake(amount)
        .accounts({
          user: publicKey,
          stakePool: stakePoolPDA,
          userStakeInfo: userStakePDA,
          // userTokenAccount and poolVault auto-resolved from IDL constraints
        })
        .rpc();

      alert(`Successfully staked ${stakeAmount} tokens!`);
      setStakeAmount("");
    } catch (err) {
      console.error("Stake failed:", err);
      alert("Stake failed. Check console for details.");
    } finally {
      setLoading(false);
    }
  }

  // ── Handle Claim ──────────────────────────────────────────────────────────
  async function handleClaim() {
    if (!publicKey) return;
    setLoading(true);

    try {
      const connection = new Connection(RPC_URL);
      const provider = new anchor.AnchorProvider(connection, {
        publicKey,
        signTransaction: signTransaction!,
        signAllTransactions: async (txs) => txs,
      }, {});

      const idl = await anchor.Program.fetchIdl(PROGRAM_ID, provider);
      const program = new anchor.Program(idl!, PROGRAM_ID, provider);

      await (program.methods as any)
        .claimRewards()
        .accounts({
          user: publicKey,
          stakePool: getStakePoolPDA(),
          userStakeInfo: getUserStakeInfoPDA(publicKey),
        })
        .rpc();

      alert("Rewards claimed!");
    } catch (err) {
      console.error("Claim failed:", err);
    } finally {
      setLoading(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="staking-dashboard">
      <h1>Token Staking</h1>

      {/* Phantom wallet connect button */}
      <WalletMultiButton />

      {connected && (
        <div className="stake-info">
          <div className="stat-card">
            <h3>Your Staked Balance</h3>
            <p>{stakedBalance.toFixed(4)} tokens</p>
          </div>

          <div className="stat-card">
            <h3>Pending Rewards</h3>
            <p>{pendingRewards.toFixed(6)} tokens</p>
          </div>

          <div className="stake-actions">
            <input
              type="number"
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
              placeholder="Amount to stake"
              min="0"
            />
            <button onClick={handleStake} disabled={loading}>
              {loading ? "Processing..." : "Stake"}
            </button>
            <button onClick={handleClaim} disabled={loading || pendingRewards === 0}>
              Claim Rewards ({pendingRewards.toFixed(4)})
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## 🔒 Security Checklist

Mainnet pe jaane se pehle har item verify karo:

| Risk | Kya Galat Ho Sakta Hai | Hum Kaise Handle Karte Hain |
|------|-----------------|------------------|
| Integer overflow | Reward math galat numbers de sakta hai | Har jagah `checked_mul`, `checked_add` |
| Wrong signer | Koi vault drain kar sakta hai | `constraint = user_stake_info.owner == user.key()` |
| PDA seed collision | Do accounts ko same address mil jaye | Har account type ke liye unique seeds |
| Re-entrancy | Callback exploits | Solana ka account model isse naturally rok deta hai |
| Admin key loss | Pool hamesha ke liye stuck ho jaye | Production mein admin key ek multisig mein rakho |
| Vault drain | Rewards vault balance se zyada ho jayein | Users ke stake karne SE PEHLE vault ko fund karo |

---

## 📊 Staking Program Kab Use Karo / Kab Nahi

### Staking Use Karo Jab:
- Tum chahte ho users long-term tumhara token hold karein (sell pressure kam hoti hai)
- Governance mechanism chahiye (stakers = voters)
- Liquidity incentives ke saath DeFi bana rahe ho
- Token rewards wala loyalty system chahiye

### Staking MAT Use Karo Jab:
- Tumhare project mein koi token economy nahi hai — sirf DeFi jaisa dikhne ke liye ek mat jodo
- Tumhara reward rate funded nahi hai — empty vaults matlab broken promises
- Tumne math audit nahi karwaya — reward exploits catastrophic hote hain
- Instant liquidity chahiye — lock-up periods kuch apps ke liye user experience kharab karte hain

---

## 🧩 PDAs Kaise Fit Hote Hain — Poora Map

```mermaid
graph LR
    subgraph "On-chain Accounts"
        SP["StakePool PDA\nseeds: stake_pool\nStores: config, total_staked"]
        PV["Pool Vault PDA\nseeds: pool_vault + pool_key\nToken Account: holds staked tokens"]
        USI["UserStakeInfo PDA\nseeds: user_stake + user_pubkey\nPer-user: amount, time, rewards"]
    end

    subgraph "User's Side"
        UW["User Wallet\n(signs transactions)"]
        UTA["User's ATA\n(personal token balance)"]
    end

    UW -->|"stake tx"| USI
    UTA -->|"tokens move in"| PV
    PV -->|"tokens move out"| UTA
    SP -->|"controls"| PV
    USI -->|"references"| SP
```

---

## 🚀 Deployment Steps

```bash
# 1. Build the Anchor program
cd staking-program
anchor build

# 2. Get your program ID from the build output
anchor keys list
# Copy the program ID into declare_id!() in lib.rs and Anchor.toml

# 3. Deploy to devnet
anchor deploy --provider.cluster devnet

# 4. Run tests against devnet
anchor test --provider.cluster devnet

# 5. Create your token (Part 1)
cd ..
npx ts-node scripts/create-token.ts

# 6. Fund the pool vault with reward tokens
# Send tokens from treasury to poolVaultPDA using spl-token CLI:
spl-token transfer <MINT> <REWARD_AMOUNT> <POOL_VAULT_ADDRESS> --fund-recipient

# 7. Initialize the pool
# Call initialize_pool via your frontend or a script
```

---

## 🗝️ Key Takeaways

1. **SPL tokens ek factory pattern follow karte hain** — ek Token Program sabhi tokens handle karta hai; tum bas apne rules ke saath ek Mint account create karte ho.

2. **PDAs Solana programs ka backbone hain** — yeh aise accounts hain jinka koi private key nahi hota, tumhare program ke owned, seed-based authority se signed.

3. **Stake amount badalne se pehle hamesha rewards settle karo** — purane amount ke basis pe calculate karo, phir update karo. Order matter karta hai.

4. **Har jagah `checked_*` math use karo** — `checked_mul`, `checked_add`, `checked_sub` overflow ko silently tumhare reward calculations kharab karne se rokte hain.

5. **PDA vault signatures signer_seeds use karte hain** — jab program ko vault se tokens BAAHAR move karne hote hain, woh unhi seeds se sign karta hai jinse vault PDA banaya gaya tha.

6. **`init_if_needed` user accounts ke liye best friend hai** — pehle stake pe UserStakeInfo create karo, har baad wali call mein reuse karo.

7. **Staking formula simple hai lekin edge cases nahi** — empty vault, zero stake, first stake, multiple stakes — sabko carefully handle karna padta hai.

8. **Pehle locally `anchor test` se test karo** — local validator time ko predictably advance karta hai, isliye reward tests reliable rehte hain.

9. **Launch se pehle reward vault fund karo** — bina reward tokens wala vault claim pe fail ho jayega. Apne projected reward emission ke basis pe hamesha pre-fund karo.

10. **Mainnet ke liye audits optional nahi hain** — staking programs mein math exploits ne millions drain kar diye hain. Real tokens involve karne se pehle professional audit karwao.

---

## 📚 Aage Kya Banayein

| Extension | Difficulty | Description |
|-----------|-----------|-------------|
| Lock-up periods | Medium | Unstake se pehle minimum stake duration required karo |
| Tiered rewards | Medium | Longer stakes ke liye higher rate |
| Governance voting | Hard | Staked tokens = proposals pe voting power |
| Auto-compounding | Hard | Rewards claim karke automatically re-stake karo |
| Multi-token rewards | Hard | Token A stake karke Token B kamao |
| NFT reward boosts | Expert | NFT holders ko multiplied rewards milte hain |

---

*Next Chapter: Governance Program — Apne Staked Tokens Se On-Chain Voting Banao*
</content>
