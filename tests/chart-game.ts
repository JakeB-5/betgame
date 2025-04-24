import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import {IdlTypes, TypeDef} from "@project-serum/anchor/src/program/namespace/types";
import {Token, TOKEN_PROGRAM_ID} from "@solana/spl-token";
import {PublicKey} from "@solana/web3.js";
import chai, {assert, expect} from "chai";
import CBN from 'chai-bn'

import {
  debugAccount,
  debugBetData,
  debugEntrants,
  debugGameData,
  debugGlobalConfigData,
  debugTx,
  debugUserData
} from "./utils/print";
import {
  getBetDataAccount,
  getGameDataAccount,
  getGlobalConfigDataAccount, getRecentlyGamesAccount,
  getTokenVaultAccount, getTopPlayersAccount, getUserDataAccount,
  getUserEntrantsAccount
} from "./utils/account";
import {
  createMint,
  createTokenAccount,
  getOrCreateAssociatedAccountInfo,
  getTokenAccount,
  requestAirdrop
} from "./utils";
import { ChartGame } from "../target/types/chart_game";

chai.use(CBN(anchor.BN)).should()

function PoolBumps() {
  this.globalConfig
}


describe("chart-game", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider);

  const program = anchor.workspace.ChartGame as Program<ChartGame>;

  const oldAuthority = anchor.web3.Keypair.generate()
  const oldManagerAccount = anchor.web3.Keypair.generate()
  const authority = anchor.web3.Keypair.generate()
  const managerAccount = anchor.web3.Keypair.generate()


  let globalConfigDataAccount: PublicKey
  let globalConfigDataAccountBump: number


  let betterA = anchor.web3.Keypair.generate()
  let betterB = anchor.web3.Keypair.generate()

  let betterATokenAccount: PublicKey
  let betterBTokenAccount: PublicKey

  debugAccount(program.programId, 'program')
  debugAccount(oldAuthority, 'oldAuthority')
  debugAccount(authority, 'authority')
  debugAccount(oldManagerAccount, 'oldManagerAccount')
  debugAccount(managerAccount, 'managerAccount')

  let tokenMintAccount: Token
  let tokenMint: PublicKey

  let authorityTokenAccount: PublicKey


  let vaultAccount: PublicKey
  let vaultAccountBump: number

  const tokenDropAmount = new anchor.BN(500_000_000_000)


  let startTime = new anchor.BN(0)
  let endTime = new anchor.BN(0)

  const requestToken = async (recipient: PublicKey, amount: anchor.BN) => {
    await tokenMintAccount.mintTo(
      recipient,
      provider.wallet.publicKey,
      [],
      amount.toNumber()
    )
  }

  const getFormalTime = () => {
    return Math.floor(Date.now()/180000)*180000
  }

  before( async () => {
    tokenMintAccount = await createMint(provider)
    tokenMint = tokenMintAccount.publicKey

    startTime = new anchor.BN(getFormalTime())
    endTime = startTime.addn(179999)

    console.log(`serverTime: `,await provider.connection.getBlockTime(await provider.connection.getSlot()))
    console.log(`startTime: ${startTime.toNumber()}`)

    await requestAirdrop(provider, oldAuthority.publicKey)
    await requestAirdrop(provider, authority.publicKey)
    await requestAirdrop(provider, managerAccount.publicKey)
    await requestAirdrop(provider, betterA.publicKey)
    await requestAirdrop(provider, betterB.publicKey)

    authorityTokenAccount = await createTokenAccount(
      provider,
      tokenMint,
      oldAuthority.publicKey,
      )
    await requestToken(authorityTokenAccount, tokenDropAmount)


    ;[vaultAccount, vaultAccountBump] = await getTokenVaultAccount(program, tokenMint)

    ;[globalConfigDataAccount, globalConfigDataAccountBump] = await getGlobalConfigDataAccount(program)

    betterATokenAccount = await createTokenAccount(provider, tokenMint, betterA.publicKey)
    betterBTokenAccount = await createTokenAccount(provider, tokenMint, betterB.publicKey)

    await requestToken(betterATokenAccount, tokenDropAmount)
    await requestToken(betterBTokenAccount, tokenDropAmount)

    console.log(`tokenInfo`)
    let tokenAccount = await getTokenAccount(tokenMintAccount, authorityTokenAccount)
    debugAccount(tokenAccount.address, 'authorityTokenAccount Address')
    console.log(`Token Minted:`,tokenAccount.amount.toNumber())

  })

  it("Is initialized!", async () => {
    //let bumps = new PoolBumps()
    //bumps.globalConfig = globalConfigDataAccountBump

    let tx
    try {
      tx = await program.methods.initialize(globalConfigDataAccountBump).accounts({
        payer: oldAuthority.publicKey,
        globalConfigData: globalConfigDataAccount,
        authority: oldAuthority.publicKey,
        managerAccount: oldManagerAccount.publicKey,
        tokenMint: tokenMint,
        tokenVault: vaultAccount,
        authorityTokenAccount: authorityTokenAccount,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      }).signers([oldAuthority]).rpc()
    } catch (e) {
      console.log(e)
    }

    debugTx(tx, 'Initialize')

    let globalConfigData = await debugGlobalConfigData(globalConfigDataAccount)
    let tokenVaultAccount = await getTokenAccount(tokenMintAccount, vaultAccount)
    let authorityToken = await getTokenAccount(tokenMintAccount, authorityTokenAccount)

    assert.ok(globalConfigData.authority.equals(oldAuthority.publicKey))
    assert.ok(globalConfigData.managerAccount.equals(oldManagerAccount.publicKey))
    assert.ok(globalConfigData.gameCount.toNumber() === 0)
    expect(globalConfigData.gameState).to.has.own.property('pending')//.eql({ pending: {}})

    expect(globalConfigData.tokenMint).to.eql(tokenMint)

    expect(tokenVaultAccount.amount.toNumber()).to.eql(2_000_000)
    expect(tokenVaultAccount.owner).to.eql(globalConfigDataAccount)
    expect(authorityToken.amount.toNumber()).to.eql(499_998_000_000)

    tx = await program.methods.changeAuthority(authority.publicKey)
      .accounts({
        authority: oldAuthority.publicKey,
        globalConfigData: globalConfigDataAccount,
        tokenMint: tokenMint,
        tokenVault: vaultAccount,
      })
      .signers([oldAuthority]).rpc()

    debugTx(tx, 'changeAuthority')

    try {
      tx = await program.methods.changeManager(managerAccount.publicKey)
        .accounts({
          authority: oldAuthority.publicKey,
          globalConfigData: globalConfigDataAccount,
          tokenMint: tokenMint,
          tokenVault: vaultAccount,
        })
        .signers([oldAuthority]).rpc()
      expect.fail('should not pass')
    } catch (e) {
      expect(e.error.errorCode.code).to.eq('IncorrectOwner')
    }

    tx = await program.methods.changeManager(managerAccount.publicKey)
      .accounts({
        authority: authority.publicKey,
        globalConfigData: globalConfigDataAccount,
        tokenMint: tokenMint,
        tokenVault: vaultAccount,
      })
      .signers([authority]).rpc()

    debugTx(tx, 'changeManager')

    globalConfigData = await debugGlobalConfigData(globalConfigDataAccount)
    tokenVaultAccount = await getTokenAccount(tokenMintAccount, vaultAccount)

    assert.ok(globalConfigData.authority.equals(authority.publicKey))
    assert.ok(globalConfigData.managerAccount.equals(managerAccount.publicKey))

    assert.ok(tokenVaultAccount.amount.toNumber() === 2_000_000)
    //expect(tokenVaultAccount.amount).to.be.bignumber.eq(tokenDropAmount)


    assert.ok(globalConfigData.gameCount.toNumber() === 0)
    expect(globalConfigData.gameState).to.eql({ pending: {}})
    assert.ok(globalConfigData.currentStartTime.toNumber() === 0)
    assert.ok(globalConfigData.currentEndTime.toNumber() === 0)
    assert.ok(globalConfigData.beforeStartTime.toNumber() === 0)
    assert.ok(globalConfigData.beforeEndTime.toNumber() === 0)

  });


  let gameDataAccount: PublicKey
  let gameDataAccountBump: number

  let afterGameDataAccount: PublicKey
  let afterGameDataAccountBump: number

  let topPlayersAccount: PublicKey
  let topPlayersAccountBump: number

  let recentlyGamesAccount: PublicKey
  let recentlyGamesAccountBump: number

  it('Init game', async () => {

    const afterStartTime = startTime.addn(180000)
      const afterEndTime = afterStartTime.addn(179999)

      ;[gameDataAccount, gameDataAccountBump] = await getGameDataAccount(program, startTime, endTime)
    ;[afterGameDataAccount, afterGameDataAccountBump] = await getGameDataAccount(program, afterStartTime, afterEndTime)

    ;[topPlayersAccount, topPlayersAccountBump] = await getTopPlayersAccount(program)

    ;[recentlyGamesAccount, recentlyGamesAccountBump] = await getRecentlyGamesAccount(program)

    try {
      let tx = await program.methods
        .initGame(startTime, endTime, afterStartTime, afterEndTime, new anchor.BN(0))
        .accounts({
          globalConfigData: globalConfigDataAccount,
          gameData: gameDataAccount,
          afterGameData: afterGameDataAccount,
          topPlayersAccount,
          recentlyGamesAccount,
          payer: managerAccount.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        })
        .signers([managerAccount]).rpc()

      debugTx(tx, 'initGame')
    } catch (e) {
      console.log(e)
    }
    let globalConfigData = await debugGlobalConfigData(globalConfigDataAccount)

    expect(globalConfigData.currentStartTime).to.be.bignumber.eq(startTime)
    expect(globalConfigData.currentEndTime).to.be.bignumber.eq(endTime)
    expect(globalConfigData.afterStartTime).to.be.bignumber.eq(afterStartTime)
    expect(globalConfigData.afterEndTime).to.be.bignumber.eq(afterEndTime)
    expect(globalConfigData.gameCount.toNumber()).to.be.eq(1)
    expect(globalConfigData.gameState).to.haveOwnProperty("onGoing")

    let gameData = await debugGameData(gameDataAccount)

    assert.ok(gameData.startTime.toNumber() === startTime.toNumber())
    assert.ok(gameData.endTime.toNumber() === endTime.toNumber())
    assert.ok(gameData.longBetAmount.toNumber() === 1_000_000)
    assert.ok(gameData.shortBetAmount.toNumber() === 1_000_000)
    assert.ok(gameData.longBetCount === 0)
    assert.ok(gameData.shortBetCount === 0)
    assert.ok(gameData.finish === false)

    let afterGameData = await debugGameData(afterGameDataAccount)
    assert.ok(afterGameData.startTime.toNumber() === afterStartTime.toNumber())
    assert.ok(afterGameData.endTime.toNumber() === afterEndTime.toNumber())
    assert.ok(afterGameData.longBetAmount.toNumber() === 1_000_000)
    assert.ok(afterGameData.shortBetAmount.toNumber() === 1_000_000)
    assert.ok(afterGameData.longBetCount === 0)
    assert.ok(afterGameData.shortBetCount === 0)
    assert.ok(afterGameData.finish === false)

  })



  let betADataAccount: PublicKey
  let betADataBump: number
  let betterAEntrantsPDA: PublicKey
  let betterAEntrantsBump: number
  let betterAUserDataPDA: PublicKey
  let betterAUserDataBump: number
  let betBDataAccount: PublicKey
  let betBDataBump: number
  let betterBEntrantsPDA: PublicKey
  let betterBEntrantsBump: number
  let betterBUserDataPDA: PublicKey
  let betterBUserDataBump: number

  let betAmountA = new anchor.BN(5_000_000)
  let betAmountA2 = new anchor.BN(2_000_000)
  let betAmountB = new anchor.BN(15_000_000)
  let betAmountB2 = new anchor.BN(3_000_000)

  it('Betting Game', async () => {

    ;[betADataAccount, betADataBump] = await getBetDataAccount(program, gameDataAccount,  betterA)
    ;[betBDataAccount, betBDataBump] = await getBetDataAccount(program, gameDataAccount,  betterB)

    ;[betterAEntrantsPDA, betterAEntrantsBump] = await getUserEntrantsAccount(program, betterA)
    ;[betterAUserDataPDA, betterAUserDataBump] = await getUserDataAccount(program, betterA)
    ;[betterBEntrantsPDA, betterBEntrantsBump] = await getUserEntrantsAccount(program, betterB)
    ;[betterBUserDataPDA, betterBUserDataBump] = await getUserDataAccount(program, betterB)

    let tx = await program.methods.betGame(startTime, endTime, {long:{}}, betAmountA)
        .accounts({
          payer: betterA.publicKey,
          globalConfigData: globalConfigDataAccount,
          gameData: gameDataAccount,
          betData: betADataAccount,
          userData: betterAUserDataPDA,
          entrants: betterAEntrantsPDA,
          tokenMint: tokenMint,
          tokenVault: vaultAccount,
          payerTokenAccount: betterATokenAccount,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        }).signers([betterA]).rpc()

    debugTx(tx, 'betGame from betterA at first')

    let gameData = await debugGameData(gameDataAccount)
    let betAData = await debugBetData(betADataAccount)
    let betterAToken = await getTokenAccount(tokenMintAccount, betterATokenAccount)
    let tokenVaultAccount = await getTokenAccount(tokenMintAccount, vaultAccount)

    assert.ok(gameData.longBetAmount.toNumber() === 6_000_000)
    assert.ok(gameData.shortBetAmount.toNumber() === 1_000_000)
    assert.ok(gameData.longBetCount === 1)
    assert.ok(gameData.shortBetCount === 0)
    assert.ok(betterAToken.amount.toNumber() === 499_995_000_000)
    expect(betAData.betDirection).to.haveOwnProperty('long')
    assert.ok(betAData.betAmount.toNumber() === 5_000_000)

    expect(tokenVaultAccount.amount.toNumber()).to.eq(7_000_000)

    tx = await program.methods.betGame(startTime, endTime, {long:{}}, betAmountA2)
      .accounts({
        payer: betterA.publicKey,
        globalConfigData: globalConfigDataAccount,
        gameData: gameDataAccount,
        betData: betADataAccount,
        userData: betterAUserDataPDA,
        entrants: betterAEntrantsPDA,
        tokenMint: tokenMint,
        tokenVault: vaultAccount,
        payerTokenAccount: betterATokenAccount,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
      }).signers([betterA]).rpc()

    debugTx(tx, 'betGame from betterA at second')

    gameData = await debugGameData(gameDataAccount)
    betAData = await debugBetData(betADataAccount)
    betterAToken = await getTokenAccount(tokenMintAccount, betterATokenAccount)
    tokenVaultAccount = await getTokenAccount(tokenMintAccount, vaultAccount)

    assert.ok(gameData.longBetAmount.toNumber() === 8_000_000)
    assert.ok(gameData.shortBetAmount.toNumber() === 1_000_000)
    assert.ok(gameData.longBetCount === 1)
    assert.ok(gameData.shortBetCount === 0)
    assert.ok(betterAToken.amount.toNumber() === 499_993_000_000)
    expect(betAData.betDirection).to.has.ownProperty('long')
    assert.ok(betAData.betAmount.toNumber() === 7_000_000)
    expect(tokenVaultAccount.amount.toNumber()).to.eq(9_000_000)


    tx = await program.methods.betGame(startTime, endTime, {short:{}}, betAmountB)
      .accounts({
        payer: betterB.publicKey,
        globalConfigData: globalConfigDataAccount,
        gameData: gameDataAccount,
        betData: betBDataAccount,
        userData: betterBUserDataPDA,
        entrants: betterBEntrantsPDA,
        tokenMint: tokenMint,
        tokenVault: vaultAccount,
        payerTokenAccount: betterBTokenAccount,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
      }).signers([betterB]).rpc()

        debugTx(tx, 'betGame from betterB at first')

    gameData = await debugGameData(gameDataAccount)
    let betBData = await debugBetData(betBDataAccount)
    let betterBToken = await getTokenAccount(tokenMintAccount, betterBTokenAccount)
    tokenVaultAccount = await getTokenAccount(tokenMintAccount, vaultAccount)

    assert.ok(gameData.longBetAmount.toNumber() === 8_000_000)
    assert.ok(gameData.shortBetAmount.toNumber() === 16_000_000)
    assert.ok(gameData.longBetCount === 1)
    assert.ok(gameData.shortBetCount === 1)
    assert.ok(betterBToken.amount.toNumber() === 499_985_000_000)
    expect(betBData.betDirection).to.has.ownProperty('short')
    assert.ok(betBData.betAmount.toNumber() === 15_000_000)
    expect(tokenVaultAccount.amount.toNumber()).to.eq(24_000_000)

    try {
      tx = await program.methods.betGame(startTime, endTime, {short:{}}, betAmountA)
        .accounts({
          payer: betterA.publicKey,
          globalConfigData: globalConfigDataAccount,
          gameData: gameDataAccount,
          betData: betADataAccount,
          userData: betterAUserDataPDA,
          entrants: betterAEntrantsPDA,
          tokenMint: tokenMint,
          tokenVault: vaultAccount,
          payerTokenAccount: betterATokenAccount,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        }).signers([betterA]).rpc()
      expect.fail('should not pass')
    } catch (e) {
      //console.log(e)
      expect(e.error.errorCode.code).to.eq('InvalidBetDirection')
    }
    debugTx(tx, 'betGame from betterA at third (factitious fail)')

        //gameData = await debugGameData(gameDataAccount)

    //assert.ok(gameData.shortBetAmount.toNumber() === 1000000)

    let betAEntrants = await debugEntrants(betterAEntrantsPDA)
    let betBEntrants = await debugEntrants(betterBEntrantsPDA)

    expect(betAEntrants.front).to.eq(0)
    expect(betAEntrants.rear).to.eq(1)
    expect(betAEntrants.entrantsQueue[betAEntrants.rear].toBase58()).to.eq(betADataAccount.toBase58())

    expect(betBEntrants.front).to.eq(0)
    expect(betBEntrants.rear).to.eq(1)
    expect(betBEntrants.entrantsQueue[betBEntrants.rear].toBase58()).to.eq(betBDataAccount.toBase58())

   // let betBData = await debugBetData(betBDataAccount)
  })


  let currentGameDataAccount: PublicKey
  let currentGameDataAccountBump: number


  const openPrice = new anchor.BN(240167820)
  const closePrice = new anchor.BN(242147820)
  const newOpenPrice = new anchor.BN(242147820)

  it('Update Game', async () => {
    const currentStartTime = startTime.addn(180000)
    const currentEndTime = currentStartTime.addn(179999)

    const afterStartTime = currentStartTime.addn(180000)
    const afterEndTime = afterStartTime.addn(179999)

    ;[currentGameDataAccount, currentGameDataAccountBump] = await getGameDataAccount(program, currentStartTime, currentEndTime)
    ;[afterGameDataAccount, afterGameDataAccountBump] = await getGameDataAccount(program, afterStartTime, afterEndTime)


    let tx = await program.methods.updateGame(startTime, endTime, openPrice, closePrice, currentStartTime, currentEndTime, afterStartTime, afterEndTime, new anchor.BN(0))
        .accounts({
          payer: managerAccount.publicKey,
          globalConfigData: globalConfigDataAccount,
          beforeGameData: gameDataAccount,
          currentGameData: currentGameDataAccount,
          afterGameData: afterGameDataAccount,
          recentlyGamesAccount,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        })
        .signers([managerAccount]).rpc()
    debugTx(tx, 'updateGame')

    debugAccount(gameDataAccount, 'beforeGameDataAccount')
    debugAccount(currentGameDataAccount, 'currentGameDataAccount')
    debugAccount(afterGameDataAccount, 'afterGameDataAccount')



    let globalConfigData = await debugGlobalConfigData(globalConfigDataAccount)

    expect(globalConfigData.beforeStartTime).to.be.bignumber.eq(startTime)
    expect(globalConfigData.beforeEndTime).to.be.bignumber.eq(endTime)
    expect(globalConfigData.currentStartTime).to.be.bignumber.eq(currentStartTime)
    expect(globalConfigData.currentEndTime).to.be.bignumber.eq(currentEndTime)
    expect(globalConfigData.afterStartTime).to.be.bignumber.eq(afterStartTime)
    expect(globalConfigData.afterEndTime).to.be.bignumber.eq(afterEndTime)
    expect(globalConfigData.gameCount.toNumber()).to.eq(2)

    let beforeGameData = await debugGameData(gameDataAccount)
    expect(beforeGameData.openPrice).to.be.bignumber.eq(openPrice)
    expect(beforeGameData.closePrice).to.be.bignumber.eq(closePrice)
    expect(beforeGameData.finish).to.be.eq(true)

    let currentGameData = await debugGameData(currentGameDataAccount)
    expect(currentGameData.startTime).to.be.bignumber.eq(currentStartTime)
    expect(currentGameData.endTime).to.be.bignumber.eq(currentEndTime)
    expect(currentGameData.longBetAmount.toNumber()).to.be.eq(1_000_000)
    expect(currentGameData.longBetCount).to.eq(0)
    expect(currentGameData.shortBetAmount.toNumber()).to.be.eq(1_000_000)
    expect(currentGameData.shortBetCount).to.eq(0)
    expect(currentGameData.finish).to.eq(false)


    let afterGameData = await debugGameData(afterGameDataAccount)
    expect(afterGameData.startTime).to.be.bignumber.eq(afterStartTime)
    expect(afterGameData.endTime).to.be.bignumber.eq(afterEndTime)
    expect(afterGameData.longBetAmount.toNumber()).to.be.eq(1_000_000)
    expect(afterGameData.longBetCount).to.eq(0)
    expect(afterGameData.shortBetAmount.toNumber()).to.be.eq(1_000_000)
    expect(afterGameData.shortBetCount).to.eq(0)
    expect(afterGameData.finish).to.eq(false)

  })

  it('claim prize', async () => {
    let tx
    try {
      tx = await program.methods.claimPrize()
        .accounts({
          payer: betterA.publicKey,
          globalConfigData: globalConfigDataAccount,
          userData: betterAUserDataPDA,
          entrants: betterAEntrantsPDA,
          tokenMint: tokenMint,
          tokenVault: vaultAccount,
          payerTokenAccount: betterATokenAccount,
          topPlayersAccount,
        })
        .remainingAccounts([
          {pubkey: betADataAccount, isWritable: false, isSigner: false},
          {pubkey: gameDataAccount, isWritable: false, isSigner: false},
        ])
        .signers([betterA]).rpc()
    } catch (e) {
      console.log(e)
    }

    let betAEntrants = await debugEntrants(betterAEntrantsPDA)
    let betAUserData = await debugUserData(betterAUserDataPDA)
    let betterAToken = await getTokenAccount(tokenMintAccount, betterATokenAccount)
    let tokenVaultAccount = await getTokenAccount(tokenMintAccount, vaultAccount)

    expect(betAUserData.countWin).to.eq(1)
    expect(betAUserData.countLose).to.eq(0)
    expect(betAUserData.countDraw).to.eq(0)
    expect(betAUserData.countBet).to.eq(2)
    expect(betAUserData.countGame).to.eq(1)
    expect(betAUserData.totalBet.toNumber()).to.eq(7_000_000)
    expect(betAUserData.totalLongBet.toNumber()).to.eq(7_000_000)
    expect(betAUserData.totalClaim.toNumber()).to.eq(19_600_000)

    expect(betAEntrants.front).to.eq(1)
    expect(betAEntrants.rear).to.eq(1)

    expect(betterAToken.amount).to.be.bignumber.eq(tokenDropAmount.subn(7_000_000).addn(19_600_000))
    expect(tokenVaultAccount.amount.toNumber()).to.eq(4_400_000)

    console.log(`betterAToken: ${betterAToken.amount.toNumber()}`)
    console.log(`tokenVaultAccount: ${tokenVaultAccount.amount.toNumber()}`)
  })

  it.skip('bet second game', async () => {

    ;[betADataAccount, betADataBump] = await getBetDataAccount(program, newGameDataAccount,  betterA)
    ;[betBDataAccount, betBDataBump] = await getBetDataAccount(program, newGameDataAccount,  betterB)

    let tx = await program.methods.betGame(newStartTime, newEndTime, {short:{}}, betAmountA)
      .accounts({

        payer: betterA.publicKey,
        globalConfigData: globalConfigDataAccount,
        gameData: newGameDataAccount,
        betData: betADataAccount,
        userData: betterAUserDataPDA,
        entrants: betterAEntrantsPDA,
        tokenMint: tokenMint,
        tokenVault: vaultAccount,
        payerTokenAccount: betterATokenAccount,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
      })
      .signers([betterA]).rpc()

    debugTx(tx, 'betGame from betterA at first of second game')

    let gameData = await debugGameData(newGameDataAccount)

    assert.ok(gameData.longBetAmount.toNumber() === 80_000)
    assert.ok(gameData.shortBetAmount.toNumber() === 5_080_000)
    assert.ok(gameData.longBetCount === 0)
    assert.ok(gameData.shortBetCount === 1)

    let betAData = await debugBetData(betADataAccount)

    expect(betAData.betDirection).to.haveOwnProperty('short')
    assert.ok(betAData.betAmount.toNumber() === 5_000_000)

    let betterAToken = await getTokenAccount(tokenMintAccount, betterATokenAccount)
    let tokenVaultAccount = await getTokenAccount(tokenMintAccount, vaultAccount)
    assert.ok(betterAToken.amount.toNumber() === 499_988_000_000)
    expect(tokenVaultAccount.amount.toNumber()).to.eq(29_000_000)


    let betAEntrants = await debugEntrants(betterAEntrantsPDA)

    expect(betAEntrants.front).to.eq(0)
    expect(betAEntrants.rear).to.eq(2)
    expect(betAEntrants.entrantsQueue[betAEntrants.rear].toBase58()).to.eq(betADataAccount.toBase58())

    /*const allBetDataAccounts = await program.account.betData.all()
    console.log(`allBetDataAccounts Length: ${allBetDataAccounts.length}`)

    const allBetDataAccountsByBetterA = await program.account.betData.all([
      {
        memcmp: {
          offset: 8+32, // Discriminator + gamePubkey
          bytes: betterA.publicKey.toBase58(),
        }
      }
    ])
    console.log(`allBetDataAccountsByBetterA Length: ${allBetDataAccountsByBetterA.length}`)
    console.log(allBetDataAccountsByBetterA.map(v => v.publicKey.toBase58()).join(','))
    console.log(allBetDataAccountsByBetterA.map(v => v.account.betAmount.toNumber()).join(','))
*/
  })
});
