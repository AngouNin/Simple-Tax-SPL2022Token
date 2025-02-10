import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { PublicKey, Keypair, Connection, SystemProgram } from "@solana/web3.js";
import * as fs from "fs";

// Load wallet keypair
const WALLET = Keypair.fromSecretKey(
  new Uint8Array(JSON.parse(fs.readFileSync("wallet.json", "utf-8")))
);

const PROGRAM_ID = new PublicKey("92euoM8vtuUV8MJpy5qKN51XzosCgETo9KcZ1zKbMEK2");
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

// Load Anchor Provider
const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(WALLET), {
  preflightCommitment: "confirmed",
});
anchor.setProvider(provider);

// Load the program
const idl = JSON.parse(fs.readFileSync("target/idl/solana_taxed_token.json", "utf-8"));
const program = new Program(idl, PROGRAM_ID, provider);


const marketingWallet = Keypair.fromSecretKey(
  new Uint8Array(JSON.parse(fs.readFileSync("marketing_wallet.json", "utf-8"))) // Load marketing wallet
);

// Replace these with your existing wallet public keys
const marketingWalletPublicKey = marketingWallet.publicKey; // Use public key from loaded marketing wallet

async function initialize() {
  // Check if required files exist
  if (!fs.existsSync("wallet.json") || !fs.existsSync("marketing_wallet.json") || !fs.existsSync("target/idl/solana_taxed_token.json")) {
    console.error("One or more required files are missing.");
    return;
  }

  // Create a new keypair for the config account
  const configAccount = Keypair.generate();
  const configPublicKey = configAccount.publicKey;

  // Generate PDA for config storage
  const [configPDA] = PublicKey.findProgramAddressSync([Buffer.from("config")], PROGRAM_ID);

  console.log(`Using marketing wallet: ${marketingWalletPublicKey.toBase58()}`);

  console.log("initialize function calling...");

  try {
    // Initialize the contract
    const txSig = await program.methods
      .initialize(marketingWalletPublicKey)
      .accounts({
        payer: WALLET.publicKey,
        config: configPublicKey,
        systemProgram: SystemProgram.programId,
      }).signers([WALLET, configAccount]).rpc();

    console.log("Initialized successfully. Transaction:", txSig);
  } catch (error) {
    console.error("Error during transaction:", error);
  }
}

// Call the function
initialize().catch(console.error);