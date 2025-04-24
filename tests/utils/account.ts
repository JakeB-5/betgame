import * as anchor from "@project-serum/anchor";
import {PublicKey, Keypair} from "@solana/web3.js";
import { Program } from '@project-serum/anchor'
import { ChartGame } from "../../target/types/chart_game";

export const getGlobalConfigDataAccount = (program: Program<any>) => {
  return PublicKey.findProgramAddress(
    [Buffer.from(anchor.utils.bytes.utf8.encode('global-config'))],
    program.programId,
  )
}

export const getGameDataAccount = (program: Program<any>, startTime: anchor.BN, endTime: anchor.BN) => {
  return PublicKey.findProgramAddress(
    [
      Buffer.from(anchor.utils.bytes.utf8.encode('game-data')),
      startTime.toBuffer('be', 8),
      endTime.toBuffer('be', 8),
    ],
    program.programId,
  )
}

export const getBetDataAccount = (program: Program<any>, gameDataAccount: PublicKey, better: Keypair) => {
  return PublicKey.findProgramAddress(
    [
      Buffer.from(anchor.utils.bytes.utf8.encode('bet-data')),
      gameDataAccount.toBuffer(),
      better.publicKey.toBuffer(),
    ],
    program.programId,
  )
}

export const getTokenVaultAccount = (program: Program<any>, tokenMint: PublicKey) => {
  return PublicKey.findProgramAddress(
    [
      Buffer.from(anchor.utils.bytes.utf8.encode('token-vault')),
      tokenMint.toBuffer(),
    ],
    program.programId,
  )
}

export const getUserEntrantsAccount = (program: Program<any>, better: Keypair) => {
  return PublicKey.findProgramAddress(
    [
      Buffer.from(anchor.utils.bytes.utf8.encode('user-entrants')),
      better.publicKey.toBuffer(),
    ],
    program.programId,
  )
}

export const getUserDataAccount = (program: Program<any>, better: Keypair) => {
  return PublicKey.findProgramAddress(
    [
      Buffer.from(anchor.utils.bytes.utf8.encode('user-data')),
      better.publicKey.toBuffer(),
    ],
    program.programId,
  )
}

export const getTopPlayersAccount = (program: Program<any>) => {
  return PublicKey.findProgramAddress(
    [
      Buffer.from(anchor.utils.bytes.utf8.encode('top-players')),
    ],
    program.programId,
  )
}
export const getRecentlyGamesAccount = (program: Program<any>) => {
  return PublicKey.findProgramAddress(
    [
      Buffer.from(anchor.utils.bytes.utf8.encode('recently-games')),
    ],
    program.programId,
  )
}
