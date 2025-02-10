use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("92euoM8vtuUV8MJpy5qKN51XzosCgETo9KcZ1zKbMEK2");

#[program]
pub mod solana_taxed_token {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, marketing_wallet: Pubkey) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.marketing_wallet = marketing_wallet;
        config.tax_basis_points = 150; // 1.5% tax (150 / 10000)
        Ok(())
    }

    pub fn transfer_hook(ctx: Context<TransferHook>, amount: u64) -> Result<()> {
        let config = &ctx.accounts.config;
        let tax_amount = (amount * config.tax_basis_points as u64) / 10_000; // 1.5% tax

        let remaining = amount - tax_amount;

        // Transfer tax to marketing wallet
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.source.to_account_info(),
                    to: ctx.accounts.marketing_wallet.to_account_info(),
                    authority: ctx.accounts.source_authority.to_account_info(),
                },
            ),
            tax_amount,
        )?;

        // Transfer remaining tokens to recipient
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.source.to_account_info(),
                    to: ctx.accounts.destination.to_account_info(),
                    authority: ctx.accounts.source_authority.to_account_info(),
                },
            ),
            remaining,
        )?;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(init, payer = payer, space = 8 + 32 + 32 + 8)]
    pub config: Account<'info, Config>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct TransferHook<'info> {
    #[account(mut)]
    pub source: Account<'info, TokenAccount>,
    #[account(mut)]
    pub destination: Account<'info, TokenAccount>,
    #[account(mut)]
    pub marketing_wallet: Account<'info, TokenAccount>,
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    #[account(signer)]
    pub source_authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
    #[account(seeds = [b"config"], bump)]
    pub config: Account<'info, Config>,
}

#[account]
pub struct Config {
    pub marketing_wallet: Pubkey,
    pub tax_basis_points: u16,
}
