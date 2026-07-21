use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, Transfer};
use anchor_spl::token_interface::{
    self, Mint, TokenAccount, TokenInterface, TransferChecked,
};

declare_id!("Cw49HSzFECh5HTJN4ZJCirHWTgkbbP7hAGZvmwLFvBjT");

const CONFIG_SEED: &[u8] = b"config";
const SOL_VAULT_SEED: &[u8] = b"sol-vault";
const POSITION_SEED: &[u8] = b"position";
const ESCROW_SEED: &[u8] = b"escrow";
const ROUND_SEED: &[u8] = b"round";
const VOTE_SEED: &[u8] = b"vote";
const CLAIM_SEED: &[u8] = b"claim";
const BPS_DENOMINATOR: u128 = 10_000;
const DAY_SECONDS: i64 = 86_400;

#[program]
pub mod holders_dilemna {
    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        round_length_seconds: u64,
        claim_window_seconds: u64,
        defect_threshold_bps: u16,
        defector_bonus_bps: u16,
    ) -> Result<()> {
        require!(
            (60..=604_800).contains(&round_length_seconds),
            DilemnaError::InvalidRoundLength
        );
        require!(
            (60..=2_592_000).contains(&claim_window_seconds),
            DilemnaError::InvalidClaimWindow
        );
        require!(
            (1..=10_000).contains(&defect_threshold_bps),
            DilemnaError::InvalidThreshold
        );
        require!(
            (10_000..=50_000).contains(&defector_bonus_bps),
            DilemnaError::InvalidBonus
        );

        let now = Clock::get()?.unix_timestamp;
        let config = &mut ctx.accounts.config;
        config.admin = ctx.accounts.admin.key();
        config.token_mint = ctx.accounts.mint.key();
        config.token_program = ctx.accounts.token_program.key();
        config.current_round = 0;
        config.available_pool = 0;
        config.round_length_seconds = round_length_seconds;
        config.claim_window_seconds = claim_window_seconds;
        config.defect_threshold_bps = defect_threshold_bps;
        config.defector_bonus_bps = defector_bonus_bps;
        config.next_round_at = now;
        config.round_active = false;
        config.paused = false;
        config.config_bump = ctx.bumps.config;
        config.vault_bump = ctx.bumps.sol_vault;

        emit!(ProtocolInitialized {
            admin: config.admin,
            token_mint: config.token_mint,
            round_length_seconds,
        });
        Ok(())
    }

    pub fn update_config(
        ctx: Context<UpdateConfig>,
        round_length_seconds: u64,
        claim_window_seconds: u64,
        defect_threshold_bps: u16,
        defector_bonus_bps: u16,
        paused: bool,
    ) -> Result<()> {
        require!(
            (60..=604_800).contains(&round_length_seconds),
            DilemnaError::InvalidRoundLength
        );
        require!(
            (60..=2_592_000).contains(&claim_window_seconds),
            DilemnaError::InvalidClaimWindow
        );
        require!(
            (1..=10_000).contains(&defect_threshold_bps),
            DilemnaError::InvalidThreshold
        );
        require!(
            (10_000..=50_000).contains(&defector_bonus_bps),
            DilemnaError::InvalidBonus
        );

        let config = &mut ctx.accounts.config;
        config.round_length_seconds = round_length_seconds;
        config.claim_window_seconds = claim_window_seconds;
        config.defect_threshold_bps = defect_threshold_bps;
        config.defector_bonus_bps = defector_bonus_bps;
        config.paused = paused;
        Ok(())
    }

    pub fn fund_vault(ctx: Context<FundVault>, lamports: u64) -> Result<()> {
        require!(lamports > 0, DilemnaError::InvalidAmount);
        let config = &mut ctx.accounts.config;
        config.available_pool = config
            .available_pool
            .checked_add(lamports)
            .ok_or(DilemnaError::MathOverflow)?;

        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.key(),
                Transfer {
                    from: ctx.accounts.funder.to_account_info(),
                    to: ctx.accounts.sol_vault.to_account_info(),
                },
            ),
            lamports,
        )?;

        emit!(VaultFunded {
            funder: ctx.accounts.funder.key(),
            lamports,
            available_pool: config.available_pool,
        });
        Ok(())
    }

    pub fn open_round(ctx: Context<OpenRound>, round_number: u64) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let config = &mut ctx.accounts.config;
        require!(!config.paused, DilemnaError::ProtocolPaused);
        require!(!config.round_active, DilemnaError::RoundAlreadyActive);
        require!(now >= config.next_round_at, DilemnaError::RoundNotReady);
        require!(
            round_number == config.current_round.saturating_add(1),
            DilemnaError::InvalidRoundNumber
        );
        require!(config.available_pool > 0, DilemnaError::EmptyFeePool);

        let closes_at = now
            .checked_add(config.round_length_seconds as i64)
            .ok_or(DilemnaError::MathOverflow)?;
        let round = &mut ctx.accounts.round;
        round.round_number = round_number;
        round.opened_at = now;
        round.closes_at = closes_at;
        round.claim_deadline = 0;
        round.pot_lamports = config.available_pool;
        round.remaining_lamports = config.available_pool;
        round.cooperate_weight = 0;
        round.defect_weight = 0;
        round.distribution_weight = 0;
        round.voter_count = 0;
        round.status = RoundStatus::Open as u8;
        round.bump = ctx.bumps.round;

        config.available_pool = 0;
        config.current_round = round_number;
        config.next_round_at = closes_at;
        config.round_active = true;

        emit!(RoundOpened {
            round_number,
            pot_lamports: round.pot_lamports,
            opened_at: now,
            closes_at,
        });
        Ok(())
    }

    pub fn open_position(ctx: Context<OpenPosition>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let position = &mut ctx.accounts.position;
        position.owner = ctx.accounts.owner.key();
        position.amount = 0;
        position.streak_started_at = now;
        position.last_withdraw_at = 0;
        position.locked_until = 0;
        position.bonus_bps = 0;
        position.tier = 0;
        position.bump = ctx.bumps.position;
        emit!(PositionOpened {
            owner: position.owner,
        });
        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        require!(amount > 0, DilemnaError::InvalidAmount);
        require!(!ctx.accounts.config.paused, DilemnaError::ProtocolPaused);

        token_interface::transfer_checked(
            CpiContext::new(
                ctx.accounts.token_program.key(),
                TransferChecked {
                    from: ctx.accounts.owner_token.to_account_info(),
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.escrow.to_account_info(),
                    authority: ctx.accounts.owner.to_account_info(),
                },
            ),
            amount,
            ctx.accounts.mint.decimals,
        )?;

        let now = Clock::get()?.unix_timestamp;
        let position = &mut ctx.accounts.position;
        if position.amount == 0 {
            position.streak_started_at = now;
        }
        position.amount = position
            .amount
            .checked_add(amount)
            .ok_or(DilemnaError::MathOverflow)?;
        position.tier = tier_for(
            now.saturating_sub(position.streak_started_at),
            position.amount,
            ctx.accounts.mint.supply,
        );

        emit!(PositionDeposited {
            owner: position.owner,
            amount,
            position_amount: position.amount,
            streak_started_at: position.streak_started_at,
        });
        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        require!(amount > 0, DilemnaError::InvalidAmount);
        let now = Clock::get()?.unix_timestamp;
        let position = &mut ctx.accounts.position;
        require!(amount <= position.amount, DilemnaError::InsufficientPosition);
        require!(now >= position.locked_until, DilemnaError::PositionLocked);

        let owner_key = ctx.accounts.owner.key();
        let signer_seeds: &[&[&[u8]]] = &[&[
            POSITION_SEED,
            owner_key.as_ref(),
            &[position.bump],
        ]];

        token_interface::transfer_checked(
            CpiContext::new(
                ctx.accounts.token_program.key(),
                TransferChecked {
                    from: ctx.accounts.escrow.to_account_info(),
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.owner_token.to_account_info(),
                    authority: position.to_account_info(),
                },
            )
            .with_signer(signer_seeds),
            amount,
            ctx.accounts.mint.decimals,
        )?;

        let previous_streak = now.saturating_sub(position.streak_started_at);
        position.amount = position
            .amount
            .checked_sub(amount)
            .ok_or(DilemnaError::MathOverflow)?;
        position.streak_started_at = now;
        position.last_withdraw_at = now;
        position.bonus_bps = 0;
        position.tier = 0;

        emit!(PositionWithdrawn {
            owner: position.owner,
            amount,
            position_amount: position.amount,
            forfeited_streak_seconds: previous_streak,
        });
        Ok(())
    }

    pub fn vote(ctx: Context<Vote>, round_number: u64, choice: u8) -> Result<()> {
        require!(
            choice == Choice::Cooperate as u8 || choice == Choice::Defect as u8,
            DilemnaError::InvalidChoice
        );
        require!(!ctx.accounts.config.paused, DilemnaError::ProtocolPaused);
        let now = Clock::get()?.unix_timestamp;
        let round = &mut ctx.accounts.round;
        require!(round.status == RoundStatus::Open as u8, DilemnaError::RoundClosed);
        require!(now < round.closes_at, DilemnaError::RoundClosed);

        let position = &mut ctx.accounts.position;
        require!(position.amount > 0, DilemnaError::EmptyPosition);
        require!(
            ctx.accounts.escrow.amount == position.amount,
            DilemnaError::PositionBalanceMismatch
        );

        let streak_seconds = now.saturating_sub(position.streak_started_at);
        let multiplier_bps = multiplier_bps(streak_seconds, position.bonus_bps);
        let weight = weighted_amount(position.amount, multiplier_bps)?;
        require!(weight > 0, DilemnaError::EmptyPosition);

        if choice == Choice::Cooperate as u8 {
            round.cooperate_weight = round
                .cooperate_weight
                .checked_add(weight)
                .ok_or(DilemnaError::MathOverflow)?;
        } else {
            round.defect_weight = round
                .defect_weight
                .checked_add(weight)
                .ok_or(DilemnaError::MathOverflow)?;
        }
        round.voter_count = round
            .voter_count
            .checked_add(1)
            .ok_or(DilemnaError::MathOverflow)?;

        position.locked_until = position.locked_until.max(round.closes_at);
        position.tier = tier_for(
            streak_seconds,
            position.amount,
            ctx.accounts.mint.supply,
        );

        let vote = &mut ctx.accounts.vote_record;
        vote.round_number = round_number;
        vote.voter = ctx.accounts.voter.key();
        vote.choice = choice;
        vote.weight = weight;
        vote.multiplier_bps = multiplier_bps;
        vote.voted_at = now;
        vote.bump = ctx.bumps.vote_record;

        emit!(VoteCast {
            round_number,
            voter: vote.voter,
            choice,
            weight,
            multiplier_bps,
        });
        Ok(())
    }

    pub fn settle(ctx: Context<Settle>, round_number: u64) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let config = &mut ctx.accounts.config;
        let round = &mut ctx.accounts.round;
        require!(round.status == RoundStatus::Open as u8, DilemnaError::RoundClosed);
        require!(now >= round.closes_at, DilemnaError::RoundStillOpen);

        let total_weight = round
            .cooperate_weight
            .checked_add(round.defect_weight)
            .ok_or(DilemnaError::MathOverflow)?;
        let defect_bps = if total_weight == 0 {
            10_000
        } else {
            ((round.defect_weight as u128)
                .checked_mul(BPS_DENOMINATOR)
                .ok_or(DilemnaError::MathOverflow)?
                / total_weight as u128) as u16
        };

        let rolled_over = total_weight == 0 || defect_bps >= config.defect_threshold_bps;
        if rolled_over {
            config.available_pool = config
                .available_pool
                .checked_add(round.remaining_lamports)
                .ok_or(DilemnaError::MathOverflow)?;
            round.remaining_lamports = 0;
            round.status = RoundStatus::RolledOver as u8;
        } else {
            let boosted_defect = adjusted_weight(
                round.defect_weight,
                Choice::Defect as u8,
                config.defector_bonus_bps,
            )?;
            round.distribution_weight = round
                .cooperate_weight
                .checked_add(boosted_defect)
                .ok_or(DilemnaError::MathOverflow)?;
            round.claim_deadline = now
                .checked_add(config.claim_window_seconds as i64)
                .ok_or(DilemnaError::MathOverflow)?;
            round.status = RoundStatus::Settled as u8;
        }
        config.round_active = false;

        emit!(RoundSettled {
            round_number,
            rolled_over,
            cooperate_weight: round.cooperate_weight,
            defect_weight: round.defect_weight,
            claim_deadline: round.claim_deadline,
        });
        Ok(())
    }

    pub fn claim(ctx: Context<Claim>, round_number: u64) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let config = &ctx.accounts.config;
        let round = &mut ctx.accounts.round;
        require!(round.status == RoundStatus::Settled as u8, DilemnaError::RoundNotSettled);
        require!(now <= round.claim_deadline, DilemnaError::ClaimWindowClosed);
        require!(round.distribution_weight > 0, DilemnaError::NoDistributionWeight);

        let vote = &ctx.accounts.vote_record;
        let voter_weight = adjusted_weight(
            vote.weight,
            vote.choice,
            config.defector_bonus_bps,
        )?;
        let amount = reward_amount(
            round.pot_lamports,
            voter_weight,
            round.distribution_weight,
        )?;
        require!(amount > 0, DilemnaError::RewardTooSmall);
        require!(amount <= round.remaining_lamports, DilemnaError::VaultAccountingMismatch);
        require!(
            ctx.accounts.sol_vault.lamports() >= amount,
            DilemnaError::InsufficientVaultBalance
        );

        let signer_seeds: &[&[&[u8]]] = &[&[
            SOL_VAULT_SEED,
            &[config.vault_bump],
        ]];
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.key(),
                Transfer {
                    from: ctx.accounts.sol_vault.to_account_info(),
                    to: ctx.accounts.claimant.to_account_info(),
                },
            )
            .with_signer(signer_seeds),
            amount,
        )?;

        round.remaining_lamports = round
            .remaining_lamports
            .checked_sub(amount)
            .ok_or(DilemnaError::MathOverflow)?;

        let receipt = &mut ctx.accounts.claim_receipt;
        receipt.round_number = round_number;
        receipt.claimant = ctx.accounts.claimant.key();
        receipt.amount_lamports = amount;
        receipt.claimed_at = now;
        receipt.bump = ctx.bumps.claim_receipt;

        emit!(RewardClaimed {
            round_number,
            claimant: receipt.claimant,
            amount_lamports: amount,
        });
        Ok(())
    }

    pub fn sweep_unclaimed(ctx: Context<SweepUnclaimed>, round_number: u64) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let round = &mut ctx.accounts.round;
        require!(round.status == RoundStatus::Settled as u8, DilemnaError::RoundNotSettled);
        require!(now > round.claim_deadline, DilemnaError::ClaimWindowStillOpen);

        let amount = round.remaining_lamports;
        ctx.accounts.config.available_pool = ctx
            .accounts
            .config
            .available_pool
            .checked_add(amount)
            .ok_or(DilemnaError::MathOverflow)?;
        round.remaining_lamports = 0;
        round.status = RoundStatus::Closed as u8;
        emit!(UnclaimedSwept {
            round_number,
            amount_lamports: amount,
        });
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        init,
        payer = admin,
        space = 8 + ProtocolConfig::INIT_SPACE,
        seeds = [CONFIG_SEED],
        bump,
    )]
    pub config: Account<'info, ProtocolConfig>,
    /// CHECK: PDA system account used only as the SOL fee vault.
    #[account(seeds = [SOL_VAULT_SEED], bump)]
    pub sol_vault: UncheckedAccount<'info>,
    pub mint: InterfaceAccount<'info, Mint>,
    pub token_program: Interface<'info, TokenInterface>,
    #[account(constraint = program.programdata_address()? == Some(program_data.key()) @ DilemnaError::Unauthorized)]
    pub program: Program<'info, crate::program::HoldersDilemna>,
    #[account(constraint = program_data.upgrade_authority_address == Some(admin.key()) @ DilemnaError::Unauthorized)]
    pub program_data: Account<'info, ProgramData>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateConfig<'info> {
    pub admin: Signer<'info>,
    #[account(
        mut,
        seeds = [CONFIG_SEED],
        bump = config.config_bump,
        has_one = admin @ DilemnaError::Unauthorized,
    )]
    pub config: Account<'info, ProtocolConfig>,
}

#[derive(Accounts)]
pub struct FundVault<'info> {
    #[account(mut)]
    pub funder: Signer<'info>,
    #[account(mut, seeds = [CONFIG_SEED], bump = config.config_bump)]
    pub config: Account<'info, ProtocolConfig>,
    /// CHECK: Seed constraint makes this the program's canonical SOL vault.
    #[account(mut, seeds = [SOL_VAULT_SEED], bump = config.vault_bump)]
    pub sol_vault: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(round_number: u64)]
pub struct OpenRound<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, seeds = [CONFIG_SEED], bump = config.config_bump)]
    pub config: Account<'info, ProtocolConfig>,
    #[account(
        init,
        payer = payer,
        space = 8 + DilemmaRound::INIT_SPACE,
        seeds = [ROUND_SEED, &round_number.to_le_bytes()],
        bump,
    )]
    pub round: Account<'info, DilemmaRound>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct OpenPosition<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.config_bump)]
    pub config: Account<'info, ProtocolConfig>,
    #[account(
        init,
        payer = owner,
        space = 8 + HolderPosition::INIT_SPACE,
        seeds = [POSITION_SEED, owner.key().as_ref()],
        bump,
    )]
    pub position: Account<'info, HolderPosition>,
    #[account(
        init,
        payer = owner,
        seeds = [ESCROW_SEED, owner.key().as_ref()],
        bump,
        token::mint = mint,
        token::authority = position,
        token::token_program = token_program,
    )]
    pub escrow: InterfaceAccount<'info, TokenAccount>,
    #[account(address = config.token_mint)]
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(address = config.token_program)]
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.config_bump)]
    pub config: Account<'info, ProtocolConfig>,
    #[account(
        mut,
        seeds = [POSITION_SEED, owner.key().as_ref()],
        bump = position.bump,
        has_one = owner,
    )]
    pub position: Account<'info, HolderPosition>,
    #[account(
        mut,
        token::mint = mint,
        token::authority = owner,
        token::token_program = token_program,
    )]
    pub owner_token: InterfaceAccount<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [ESCROW_SEED, owner.key().as_ref()],
        bump,
        token::mint = mint,
        token::authority = position,
        token::token_program = token_program,
    )]
    pub escrow: InterfaceAccount<'info, TokenAccount>,
    #[account(address = config.token_mint)]
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(address = config.token_program)]
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.config_bump)]
    pub config: Account<'info, ProtocolConfig>,
    #[account(
        mut,
        seeds = [POSITION_SEED, owner.key().as_ref()],
        bump = position.bump,
        has_one = owner,
    )]
    pub position: Account<'info, HolderPosition>,
    #[account(
        mut,
        token::mint = mint,
        token::authority = owner,
        token::token_program = token_program,
    )]
    pub owner_token: InterfaceAccount<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [ESCROW_SEED, owner.key().as_ref()],
        bump,
        token::mint = mint,
        token::authority = position,
        token::token_program = token_program,
    )]
    pub escrow: InterfaceAccount<'info, TokenAccount>,
    #[account(address = config.token_mint)]
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(address = config.token_program)]
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
#[instruction(round_number: u64)]
pub struct Vote<'info> {
    #[account(mut)]
    pub voter: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.config_bump)]
    pub config: Account<'info, ProtocolConfig>,
    #[account(
        mut,
        seeds = [ROUND_SEED, &round_number.to_le_bytes()],
        bump = round.bump,
    )]
    pub round: Account<'info, DilemmaRound>,
    #[account(
        mut,
        seeds = [POSITION_SEED, voter.key().as_ref()],
        bump = position.bump,
        constraint = position.owner == voter.key() @ DilemnaError::Unauthorized,
    )]
    pub position: Account<'info, HolderPosition>,
    #[account(
        seeds = [ESCROW_SEED, voter.key().as_ref()],
        bump,
        token::mint = mint,
        token::authority = position,
        token::token_program = token_program,
    )]
    pub escrow: InterfaceAccount<'info, TokenAccount>,
    #[account(address = config.token_mint)]
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(address = config.token_program)]
    pub token_program: Interface<'info, TokenInterface>,
    #[account(
        init,
        payer = voter,
        space = 8 + VoteRecord::INIT_SPACE,
        seeds = [VOTE_SEED, &round_number.to_le_bytes(), voter.key().as_ref()],
        bump,
    )]
    pub vote_record: Account<'info, VoteRecord>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(round_number: u64)]
pub struct Settle<'info> {
    pub keeper: Signer<'info>,
    #[account(mut, seeds = [CONFIG_SEED], bump = config.config_bump)]
    pub config: Account<'info, ProtocolConfig>,
    #[account(
        mut,
        seeds = [ROUND_SEED, &round_number.to_le_bytes()],
        bump = round.bump,
    )]
    pub round: Account<'info, DilemmaRound>,
}

#[derive(Accounts)]
#[instruction(round_number: u64)]
pub struct Claim<'info> {
    #[account(mut)]
    pub claimant: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.config_bump)]
    pub config: Account<'info, ProtocolConfig>,
    /// CHECK: Canonical program vault constrained by config bump.
    #[account(mut, seeds = [SOL_VAULT_SEED], bump = config.vault_bump)]
    pub sol_vault: UncheckedAccount<'info>,
    #[account(
        mut,
        seeds = [ROUND_SEED, &round_number.to_le_bytes()],
        bump = round.bump,
    )]
    pub round: Account<'info, DilemmaRound>,
    #[account(
        seeds = [VOTE_SEED, &round_number.to_le_bytes(), claimant.key().as_ref()],
        bump = vote_record.bump,
        constraint = vote_record.voter == claimant.key() @ DilemnaError::Unauthorized,
    )]
    pub vote_record: Account<'info, VoteRecord>,
    #[account(
        init,
        payer = claimant,
        space = 8 + ClaimReceipt::INIT_SPACE,
        seeds = [CLAIM_SEED, &round_number.to_le_bytes(), claimant.key().as_ref()],
        bump,
    )]
    pub claim_receipt: Account<'info, ClaimReceipt>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(round_number: u64)]
pub struct SweepUnclaimed<'info> {
    pub keeper: Signer<'info>,
    #[account(mut, seeds = [CONFIG_SEED], bump = config.config_bump)]
    pub config: Account<'info, ProtocolConfig>,
    #[account(
        mut,
        seeds = [ROUND_SEED, &round_number.to_le_bytes()],
        bump = round.bump,
    )]
    pub round: Account<'info, DilemmaRound>,
}

#[account]
#[derive(InitSpace)]
pub struct ProtocolConfig {
    pub admin: Pubkey,
    pub token_mint: Pubkey,
    pub token_program: Pubkey,
    pub current_round: u64,
    pub available_pool: u64,
    pub round_length_seconds: u64,
    pub claim_window_seconds: u64,
    pub defect_threshold_bps: u16,
    pub defector_bonus_bps: u16,
    pub next_round_at: i64,
    pub round_active: bool,
    pub paused: bool,
    pub config_bump: u8,
    pub vault_bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct HolderPosition {
    pub owner: Pubkey,
    pub amount: u64,
    pub streak_started_at: i64,
    pub last_withdraw_at: i64,
    pub locked_until: i64,
    pub bonus_bps: u16,
    pub tier: u8,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct DilemmaRound {
    pub round_number: u64,
    pub opened_at: i64,
    pub closes_at: i64,
    pub claim_deadline: i64,
    pub pot_lamports: u64,
    pub remaining_lamports: u64,
    pub cooperate_weight: u64,
    pub defect_weight: u64,
    pub distribution_weight: u64,
    pub voter_count: u32,
    pub status: u8,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct VoteRecord {
    pub round_number: u64,
    pub voter: Pubkey,
    pub choice: u8,
    pub weight: u64,
    pub multiplier_bps: u32,
    pub voted_at: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct ClaimReceipt {
    pub round_number: u64,
    pub claimant: Pubkey,
    pub amount_lamports: u64,
    pub claimed_at: i64,
    pub bump: u8,
}

#[repr(u8)]
pub enum Choice {
    Cooperate = 0,
    Defect = 1,
}

#[repr(u8)]
pub enum RoundStatus {
    Open = 0,
    Settled = 1,
    RolledOver = 2,
    Closed = 3,
}

fn multiplier_bps(streak_seconds: i64, bonus_bps: u16) -> u32 {
    let base = if streak_seconds >= DAY_SECONDS * 14 {
        let extra_weeks = ((streak_seconds - DAY_SECONDS * 14) / (DAY_SECONDS * 7)) as u32;
        30_000u32.saturating_add(extra_weeks.saturating_mul(1_000)).min(100_000)
    } else if streak_seconds >= DAY_SECONDS * 7 {
        20_000
    } else if streak_seconds >= DAY_SECONDS * 3 {
        15_000
    } else {
        10_000
    };
    base.saturating_add(bonus_bps as u32).min(100_000)
}

fn weighted_amount(amount: u64, multiplier: u32) -> Result<u64> {
    let weighted = (amount as u128)
        .checked_mul(multiplier as u128)
        .ok_or(DilemnaError::MathOverflow)?
        / BPS_DENOMINATOR;
    u64::try_from(weighted).map_err(|_| error!(DilemnaError::MathOverflow))
}

fn adjusted_weight(weight: u64, choice: u8, defector_bonus_bps: u16) -> Result<u64> {
    if choice == Choice::Defect as u8 {
        weighted_amount(weight, defector_bonus_bps as u32)
    } else {
        Ok(weight)
    }
}

fn reward_amount(pot: u64, adjusted_voter_weight: u64, distribution_weight: u64) -> Result<u64> {
    require!(distribution_weight > 0, DilemnaError::NoDistributionWeight);
    let amount = (pot as u128)
        .checked_mul(adjusted_voter_weight as u128)
        .ok_or(DilemnaError::MathOverflow)?
        / distribution_weight as u128;
    u64::try_from(amount).map_err(|_| error!(DilemnaError::MathOverflow))
}

fn tier_for(streak_seconds: i64, amount: u64, supply: u64) -> u8 {
    if supply == 0 {
        return 0;
    }
    let supply_bps = (amount as u128)
        .saturating_mul(BPS_DENOMINATOR)
        .checked_div(supply as u128)
        .unwrap_or(0);
    if streak_seconds >= DAY_SECONDS * 30 && supply_bps >= 100 {
        3
    } else if streak_seconds >= DAY_SECONDS * 14 && supply_bps >= 25 {
        2
    } else if streak_seconds >= DAY_SECONDS * 3 {
        1
    } else {
        0
    }
}

#[event]
pub struct ProtocolInitialized {
    pub admin: Pubkey,
    pub token_mint: Pubkey,
    pub round_length_seconds: u64,
}

#[event]
pub struct VaultFunded {
    pub funder: Pubkey,
    pub lamports: u64,
    pub available_pool: u64,
}

#[event]
pub struct RoundOpened {
    pub round_number: u64,
    pub pot_lamports: u64,
    pub opened_at: i64,
    pub closes_at: i64,
}

#[event]
pub struct PositionOpened {
    pub owner: Pubkey,
}

#[event]
pub struct PositionDeposited {
    pub owner: Pubkey,
    pub amount: u64,
    pub position_amount: u64,
    pub streak_started_at: i64,
}

#[event]
pub struct PositionWithdrawn {
    pub owner: Pubkey,
    pub amount: u64,
    pub position_amount: u64,
    pub forfeited_streak_seconds: i64,
}

#[event]
pub struct VoteCast {
    pub round_number: u64,
    pub voter: Pubkey,
    pub choice: u8,
    pub weight: u64,
    pub multiplier_bps: u32,
}

#[event]
pub struct RoundSettled {
    pub round_number: u64,
    pub rolled_over: bool,
    pub cooperate_weight: u64,
    pub defect_weight: u64,
    pub claim_deadline: i64,
}

#[event]
pub struct RewardClaimed {
    pub round_number: u64,
    pub claimant: Pubkey,
    pub amount_lamports: u64,
}

#[event]
pub struct UnclaimedSwept {
    pub round_number: u64,
    pub amount_lamports: u64,
}

#[error_code]
pub enum DilemnaError {
    #[msg("The caller is not authorized for this instruction.")]
    Unauthorized,
    #[msg("The protocol is paused.")]
    ProtocolPaused,
    #[msg("The round duration is outside the supported range.")]
    InvalidRoundLength,
    #[msg("The claim window is outside the supported range.")]
    InvalidClaimWindow,
    #[msg("The defect threshold is invalid.")]
    InvalidThreshold,
    #[msg("The defector bonus is invalid.")]
    InvalidBonus,
    #[msg("The supplied amount must be greater than zero.")]
    InvalidAmount,
    #[msg("The requested operation overflowed protocol arithmetic.")]
    MathOverflow,
    #[msg("A round is already active.")]
    RoundAlreadyActive,
    #[msg("The next round cannot be opened yet.")]
    RoundNotReady,
    #[msg("The round number is not the next sequential round.")]
    InvalidRoundNumber,
    #[msg("The fee pool is empty.")]
    EmptyFeePool,
    #[msg("The active position is too small for this withdrawal.")]
    InsufficientPosition,
    #[msg("The position is locked until the active vote closes.")]
    PositionLocked,
    #[msg("The selected choice is invalid.")]
    InvalidChoice,
    #[msg("The round is closed.")]
    RoundClosed,
    #[msg("The round is still open.")]
    RoundStillOpen,
    #[msg("The holder has no active position.")]
    EmptyPosition,
    #[msg("The escrowed balance does not match the recorded position.")]
    PositionBalanceMismatch,
    #[msg("The round has not produced a payable outcome.")]
    RoundNotSettled,
    #[msg("The claim window has closed.")]
    ClaimWindowClosed,
    #[msg("The claim window is still open.")]
    ClaimWindowStillOpen,
    #[msg("The round has no distribution weight.")]
    NoDistributionWeight,
    #[msg("The calculated reward is below one lamport.")]
    RewardTooSmall,
    #[msg("The round and vault accounting do not match.")]
    VaultAccountingMismatch,
    #[msg("The program vault cannot cover this reward.")]
    InsufficientVaultBalance,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn conviction_multiplier_matches_the_published_curve() {
        assert_eq!(multiplier_bps(DAY_SECONDS, 0), 10_000);
        assert_eq!(multiplier_bps(DAY_SECONDS * 3, 0), 15_000);
        assert_eq!(multiplier_bps(DAY_SECONDS * 7, 0), 20_000);
        assert_eq!(multiplier_bps(DAY_SECONDS * 14, 0), 30_000);
        assert_eq!(multiplier_bps(DAY_SECONDS * 21, 0), 31_000);
    }

    #[test]
    fn defector_bonus_increases_a_successful_defectors_share() {
        let coop_weight = 100;
        let defect_weight = adjusted_weight(100, Choice::Defect as u8, 15_000).unwrap();
        let denominator = coop_weight + defect_weight;
        let coop_reward = reward_amount(1_000, coop_weight, denominator).unwrap();
        let defect_reward = reward_amount(1_000, defect_weight, denominator).unwrap();
        assert_eq!(coop_reward, 400);
        assert_eq!(defect_reward, 600);
    }

    #[test]
    fn tier_uses_streak_and_supply_position() {
        assert_eq!(tier_for(DAY_SECONDS, 1_000, 1_000_000), 0);
        assert_eq!(tier_for(DAY_SECONDS * 3, 1_000, 1_000_000), 1);
        assert_eq!(tier_for(DAY_SECONDS * 14, 2_500, 1_000_000), 2);
        assert_eq!(tier_for(DAY_SECONDS * 30, 10_000, 1_000_000), 3);
    }
}
