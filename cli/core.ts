
import {Program, Wallet} from "@project-serum/anchor";
import * as anchor from "@project-serum/anchor";
import {TOKEN_PROGRAM_ID} from "@solana/spl-token";
import * as spl from "@solana/spl-token";
import {Commitment, Connection, Keypair, PublicKey} from "@solana/web3.js";
import { InvalidArgumentError, program } from 'commander';
import fs from "fs";
import {
  getGameDataAccount,
  getGlobalConfigDataAccount,
  getRecentlyGamesAccount,
  getTokenVaultAccount, getTopPlayersAccount
} from "../tests/utils/account";
import { ChartGame } from "../target/types/chart_game";
import { Faucet } from "../target/types/faucet";

program.version('0.0.2');

export function loadWalletKey(keypair): Keypair {
  if (!keypair || keypair == '') {
    throw new Error('Keypair is required!');
  }
  const loaded = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(keypair).toString())),
  );
  console.info(`wallet public key: ${loaded.publicKey}`);
  return loaded;
}

programCommand('sol-airdrop').action(async (directory, cmd) => {
  const { keypair, env, cacheName } = cmd.opts()
  const walletKeyPair = loadWalletKey(keypair);

  const commitment: Commitment = 'confirmed'
  const connection = new Connection('http://localhost:8899/', { commitment})
  const options = anchor.AnchorProvider.defaultOptions()
  const wallet = new Wallet(walletKeyPair)
  const provider = new anchor.AnchorProvider(connection, wallet, options)
  anchor.setProvider(provider);

  const program = anchor.workspace.ChartGame as Program<ChartGame>;
  let tx = await provider.connection.requestAirdrop(wallet.publicKey, 100000000000)
  console.log(tx)
  tx = await provider.connection.requestAirdrop(loadWalletKey('./authority.json').publicKey, 100000000000)
  console.log(tx)
  tx = await provider.connection.requestAirdrop(loadWalletKey('./manager.json').publicKey, 100000000000)
  console.log(tx)
})

programCommand('deploy-token').action(async (directory, cmd) => {
  const { keypair, env, cacheName } = cmd.opts()
  const walletKeyPair = loadWalletKey(keypair);

  const commitment: Commitment = 'confirmed'
  const connection = new Connection('https://api.devnet.solana.com', { commitment})
//  const connection = new Connection('http://localhost:8899/', { commitment})
  const options = anchor.AnchorProvider.defaultOptions()
  const wallet = new Wallet(walletKeyPair)
  const provider = new anchor.AnchorProvider(connection, wallet, options)
  anchor.setProvider(provider);

  const mint = await spl.Token.createMint(
    provider.connection,
    wallet.payer,
    wallet.publicKey,
    wallet.publicKey,
    6,
    TOKEN_PROGRAM_ID,
  )
  console.log(`mint token key: ${mint.publicKey}`)

  //let tokenAccount = await mint.createAccount(wallet.publicKey)
  const authorityTokenAccount = await mint.getOrCreateAssociatedAccountInfo(authorityPubKey)

  console.log(`authorityTokenAccount: ${authorityTokenAccount.address}`)

  //mint token key: GvXxiUK2299wYgXtqQ7HraYn32MMdbk1o4GGmbBQmxx
  // token account: EHsACTMcw6eDEvFdEiwPNHrgbJxvXCwdjZ3hLcbBasD2
  // ata token account: DLSoSdkSvi6YQ8KZffnLcKbfn7iDgdChXeEThyT3YyQJ

  /*const mint = new spl.Token(
    provider.connection,
    new PublicKey('GvXxiUK2299wYgXtqQ7HraYn32MMdbk1o4GGmbBQmxx'),
    TOKEN_PROGRAM_ID,
    wallet.payer
  )*/

  await mint.mintTo(
    authorityTokenAccount.address,
    //new PublicKey('3iYZtfYWRYNUiHn9HqFE1Q46kL3r2mz5K2YHsiRoUmbP'),
    provider.wallet.publicKey,
    [],
    new anchor.BN(10_000_000_000_000).toNumber()
  )

})
const tokenMint = new PublicKey('Aprd94iaNbLY6s856feWQq3panwrtEmNkzDLFmZ1dd4q')
//const tokenMint = new PublicKey('HwjA4uPv2xExPiPTVtanJRrVdGo1gkW5kQWNk5RZUpch')
const managerPubKey = loadWalletKey('./manager.json').publicKey
const authorityPubKey = loadWalletKey('./authority.json').publicKey

programCommand('program-initialize').action(async (directory, cmd) => {
  const { keypair, env, cacheName } = cmd.opts()
  const walletKeyPair = loadWalletKey(keypair);

  const commitment: Commitment = 'confirmed'
  const connection = new Connection('https://api.devnet.solana.com', { commitment})
//  const connection = new Connection('http://localhost:8899/', { commitment})
  const options = anchor.AnchorProvider.defaultOptions()
  const wallet = new Wallet(loadWalletKey('./authority.json'))
  const provider = new anchor.AnchorProvider(connection, wallet, options)
  anchor.setProvider(provider);

  const program = anchor.workspace.ChartGame as Program<ChartGame>;

  console.log(`program: ${program.programId.toBase58()}`)
  //return

  //const managerPubKey = new PublicKey('5KduNEPi3s7xCt2semCU9WXqgm8WoUiynqEW71Tf2fNp')
  const [vaultAccount, vaultAccountBump] = await getTokenVaultAccount(program, tokenMint)

  const [globalConfigDataAccount, globalConfigDataAccountBump] = await getGlobalConfigDataAccount(program)


  const mint = new spl.Token(
    provider.connection,
    tokenMint,
    TOKEN_PROGRAM_ID,
    wallet.payer
  )

  const authorityTokenAccount = await mint.getOrCreateAssociatedAccountInfo(authorityPubKey)
  console.log(`authorityTokenAccount: ${authorityTokenAccount.address.toBase58()}`)

  console.log(`program: `,program.programId.toBase58())

  let tx
  try {
    tx = await program.methods.initialize(globalConfigDataAccountBump).accounts({
      payer: wallet.publicKey,
      globalConfigData: globalConfigDataAccount,
      authority: wallet.publicKey,
      managerAccount: managerPubKey,
      tokenMint: tokenMint,
      tokenVault: vaultAccount,
      authorityTokenAccount: authorityTokenAccount.address,
      systemProgram: anchor.web3.SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    }).signers([wallet.payer]).rpc()
  } catch (e) {
    console.log(e)
  }

  console.log(tx)
})

programCommand('faucet-initialize').action(async (directory, cmd) => {
  const { keypair, env, cacheName } = cmd.opts()
  const walletKeyPair = loadWalletKey(keypair);

  const commitment: Commitment = 'confirmed'
  const connection = new Connection('https://api.devnet.solana.com', { commitment})
//  const connection = new Connection('http://localhost:8899/', { commitment})
  const options = anchor.AnchorProvider.defaultOptions()
  const wallet = new Wallet(walletKeyPair)
  const provider = new anchor.AnchorProvider(connection, wallet, options)
  anchor.setProvider(provider);

  const program = anchor.workspace.Faucet as Program<Faucet>;

  //const tokenMint = new PublicKey('GvXxiUK2299wYgXtqQ7HraYn32MMdbk1o4GGmbBQmxx')

  const mint = new spl.Token(
    provider.connection,
    tokenMint,
    TOKEN_PROGRAM_ID,
    wallet.payer
  )

  const authorityTokenAccount = await mint.getOrCreateAssociatedAccountInfo(wallet.publicKey)

  await mint.mintTo(
    authorityTokenAccount.address,
    provider.wallet.publicKey,
    [],
    new anchor.BN(50_000_000_000_000).toNumber()
  )

  const [faucetAccount, faucetAccountBump] = await PublicKey.findProgramAddress(
    [Buffer.from(anchor.utils.bytes.utf8.encode('faucet-account'))],
    program.programId,
  )
  const [vaultAccount, vaultAccountBump] = await PublicKey.findProgramAddress(
    [Buffer.from(anchor.utils.bytes.utf8.encode('token-vault'))],
    program.programId,
  )

  let tx
  try {
    tx = await program.methods.initialize(
      faucetAccountBump, new anchor.BN(10_000_000_000), new anchor.BN(60*60)
    )
      .accounts({
        payer: wallet.publicKey,
        faucetAccount,
        tokenVault: vaultAccount,
        tokenMint,
        authorityTokenAccount: authorityTokenAccount.address,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,

      }).signers([wallet.payer]).rpc()
  } catch (e) {
    console.log(e)
  }

  console.log(tx)

})

programCommand('modify-game').action(async (directory, cmd) => {
  const { keypair, env, cacheName } = cmd.opts()
  const walletKeyPair = loadWalletKey(keypair);

  const commitment: Commitment = 'confirmed'
  const connection = new Connection('http://localhost:8899/', { commitment})
  const options = anchor.AnchorProvider.defaultOptions()
  const wallet = new Wallet(walletKeyPair)
  const provider = new anchor.AnchorProvider(connection, wallet, options)
  anchor.setProvider(provider);

  const program = anchor.workspace.ChartGame as Program<ChartGame>;

  console.log(`program: ${program.programId.toBase58()}`)
  const [globalConfigDataAccount, globalConfigDataAccountBump] = await getGlobalConfigDataAccount(program)

  const startTime = new anchor.BN(1662435480000)
  const [gameDataAccount] = await getGameDataAccount(program, startTime, startTime.addn(59999))
  let tx
  try {
    tx = await program.methods.modifyGame(
      startTime,
      startTime.addn(59999),
      startTime,
      startTime.addn(59999),

    )
      .accounts({
        payer: wallet.publicKey,
        globalConfigData: globalConfigDataAccount,
        gameData: gameDataAccount
      })
      .signers([wallet.payer]).rpc()
  } catch(e) {
    console.log(e)
  }

  console.log(tx)
})

function programCommand(
  name: string,
  options: { requireWallet: boolean } = { requireWallet: true },
) {
  let cmProgram = program
    .command(name)
    .option(
      '-e, --env <string>',
      'Solana cluster env name',
      'localnet', //mainnet-beta, testnet, devnet
    )

  if (options.requireWallet) {
    cmProgram = cmProgram.requiredOption(
      '-k, --keypair <path>',
      `Solana wallet location`,
      './local-key.json'
    );

  }

  return cmProgram;
}

program.parse(process.argv);
