import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { PublicKey, Keypair, Connection, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createAssociatedTokenAccount, getAssociatedTokenAddress } from "@solana/spl-token";
import * as fs from "fs";

// Load wallet keypair
const WALLET = Keypair.fromSecretKey(
  new Uint8Array(JSON.parse(fs.readFileSync("wallet.json", "utf-8")))
);

const PROGRAM_ID = new PublicKey("DGEeo1Nt4C6F2HEUqJ6A4j3HMpQc1kEYNHtMXzVLbSjP");
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

// Load Anchor Provider
const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(WALLET), {
  preflightCommitment: "confirmed",
});
anchor.setProvider(provider);

// Load the program
const idl = JSON.parse(fs.readFileSync("target/idl/solana_taxed_token.json", "utf-8"));
const program = new Program(idl, PROGRAM_ID, provider);

const burnWallet = Keypair.generate(); // Burn wallet
const marketingWallet = Keypair.generate(); // Marketing wallet

async function initialize() {
  // Generate PDA for config storage
  const [configPDA] = PublicKey.findProgramAddressSync([Buffer.from("config")], PROGRAM_ID);

  // Create accounts for burn and marketing wallet
  console.log(`Creating burn wallet: ${burnWallet.publicKey.toBase58()}`);
  console.log(`Creating marketing wallet: ${marketingWallet.publicKey.toBase58()}`);

  // Send SOL to burn and marketing wallets
  const tx = await provider.connection.requestAirdrop(burnWallet.publicKey, 1e9);
  await provider.connection.confirmTransaction(tx);
  const tx2 = await provider.connection.requestAirdrop(marketingWallet.publicKey, 1e9);
  await provider.connection.confirmTransaction(tx2);

  console.log("initialize function calling...")

  // Initialize the contract
  const txSig = await program.methods
    .initialize(marketingWallet.publicKey, burnWallet.publicKey)
    .accounts({
      payer: WALLET.publicKey,
      config: configPDA,
      systemProgram: SystemProgram.programId,
    })
    .signers([WALLET])
    .rpc();

  console.log("Initialized successfully. Transaction:", txSig);
}

// Call the function
initialize().catch(console.error);