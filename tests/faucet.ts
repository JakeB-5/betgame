import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import {IdlTypes, TypeDef} from "@project-serum/anchor/src/program/namespace/types";
import {ASSOCIATED_TOKEN_PROGRAM_ID, Token, TOKEN_PROGRAM_ID} from "@solana/spl-token";
import {PublicKey} from "@solana/web3.js";
import chai, {assert, expect} from "chai";
import CBN from 'chai-bn'
import {debugAccount, debugTx} from "./utils/print";
import {createMint, createTokenAccount, getTokenAccount, requestAirdrop} from "./utils";
import { Faucet } from "../target/types/faucet";

chai.use(CBN(anchor.BN)).should()

describe.skip("faucet", () => {
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider);

  const program = anchor.workspace.Faucet as Program<Faucet>;

  const authority = anchor.web3.Keypair.generate()
  const user = anchor.web3.Keypair.generate()

  let tokenMintAccount: Token
  let tokenMint: PublicKey

  let authorityTokenAccount: PublicKey

  let faucetAccount: PublicKey
  let faucetAccountBump: number
  let faucetHistoryAccount: PublicKey
  let faucetHistoryAccountBump: number

  let vaultAccount: PublicKey
  let vaultAccountBump: number
  const tokenDropAmount = new anchor.BN(50_000_000_000_000)

  let userTokenAccount: PublicKey

  const requestToken = async (recipient: PublicKey, amount: anchor.BN) => {
    await tokenMintAccount.mintTo(
      recipient,
      provider.wallet.publicKey,
      [],
      amount.toNumber()
    )
  }

  const getTokenVaultAccount = (program: Program<any>) => {
    return PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode('token-vault'))],
      program.programId,
    )
  }
  const getFaucetAccount = (program: Program<any>) => {
    return PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode('faucet-account'))],
      program.programId,
    )
  }
  const getFaucetHistoryAccount = (program: Program<any>, user: PublicKey) => {
    return PublicKey.findProgramAddress(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode('faucet-history')),
        user.toBuffer(),
      ],
      program.programId,
    )
  }

  const getAtaForMint = async (
    mint: PublicKey,
    owner: PublicKey
  ):Promise<[PublicKey, number]> => {
    return await PublicKey.findProgramAddress([
      owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()
    ], ASSOCIATED_TOKEN_PROGRAM_ID)
  }
  before(async () => {
    tokenMintAccount = await createMint(provider)
    tokenMint = tokenMintAccount.publicKey

    await requestAirdrop(provider, authority.publicKey)
    await requestAirdrop(provider, user.publicKey)

    authorityTokenAccount = await createTokenAccount(
      provider,
      tokenMint,
      authority.publicKey,
    )
    await requestToken(authorityTokenAccount, tokenDropAmount)

    ;[userTokenAccount] = await getAtaForMint(tokenMint, user.publicKey)

    ;[faucetAccount, faucetAccountBump] = await getFaucetAccount(program)
    ;[faucetHistoryAccount, faucetHistoryAccountBump] = await getFaucetHistoryAccount(program, user.publicKey)
    ;[vaultAccount, vaultAccountBump] = await getTokenVaultAccount(program)

    debugAccount(authority, 'authority')
    debugAccount(authorityTokenAccount, 'authorityTokenAccount')
    debugAccount(faucetAccount, 'faucetAccount')
    debugAccount(faucetHistoryAccount, 'faucetHistoryAccount')
    debugAccount(vaultAccount, 'vaultAccount')

  })
  let tx
  const HOUR = new anchor.BN(60*60)
  it("Is initialized!", async () => {
    try {
      tx = await program.methods.initialize(
        faucetAccountBump, new anchor.BN(10_000_000_000), HOUR
      )
        .accounts({
          payer: authority.publicKey,
          faucetAccount,
          tokenVault: vaultAccount,
          tokenMint,
          authorityTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,

        }).signers([authority]).rpc()
    } catch(e) {
      console.log(e)
    }
    debugTx(tx, 'Initialize')

    let tokenVaultAccount = await getTokenAccount(tokenMintAccount, vaultAccount)
    expect(tokenVaultAccount.amount.toNumber()).to.eql(10_000_000_000_000)
    let authorityTokenVaultAccount = await getTokenAccount(tokenMintAccount, authorityTokenAccount)
    expect(authorityTokenVaultAccount.amount.toNumber()).to.eql(40_000_000_000_000)


    const faucetAccountData = await program.account.faucetAccount.fetch(faucetAccount)
    assert.ok(faucetAccountData.faucetAccountBump == faucetAccountBump)
    assert.ok(faucetAccountData.faucetAmount.toNumber() == 10_000_000_000)
    assert.ok(faucetAccountData.faucetPeriod.toNumber() == HOUR.toNumber())

  })

  it('faucet1', async () => {
    try {
      tx = await program.methods.faucet()
        .accounts({
          payer: user.publicKey,
          faucetAccount,
          faucetHistory: faucetHistoryAccount,
          tokenVault: vaultAccount,
          tokenMint,
          payerTokenAccount: userTokenAccount,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        }).signers([user]).rpc()
    } catch (e) {
      console.log(e)
    }
    debugTx(tx, 'Faucet')
    let tokenVaultAccount = await getTokenAccount(tokenMintAccount, vaultAccount)
    expect(tokenVaultAccount.amount.toNumber()).to.eql(9_990_000_000_000)

    let userTokenAccountData = await getTokenAccount(tokenMintAccount, userTokenAccount)
    expect(userTokenAccountData.amount.toNumber()).to.eql(10_000_000_000)


  })
})
