import * as anchor from "@project-serum/anchor";
import {IdlAccountDef} from "@project-serum/anchor/dist/esm/idl";
import {AllAccountsMap, TypeDef} from "@project-serum/anchor/dist/esm/program/namespace/types";
import {Keypair, PublicKey} from "@solana/web3.js";
import {ChartGame} from "../../target/types/chart_game";
import {AccountNamespace, IdlTypes, Program, ProgramErrorStack} from "@project-serum/anchor";

const arrayPrepareStackTrace = (err: Error, stack: Array<NodeJS.CallSite>): Array<NodeJS.CallSite> => {

  return stack
}

export const debugGlobalConfigData = async (globalConfigDataAccount: PublicKey) => {
  const account = await fetchAccount('globalConfigData', globalConfigDataAccount)

  console.log(`\x1b[33m [DEBUG] globalConfigData: ${globalConfigDataAccount}\x1b[0m`)
  console.log(`\x1b[90m  authority: ${account.authority.toBase58()}`)
  console.log(`  managerAccount: ${account.managerAccount.toBase58()}`)
  console.log(`  gameCount: ${account.gameCount.toNumber()},  gameState: ${Object.keys(account.gameState).join(',')}`)
  console.log(`  currentStartTime: ${account.currentStartTime.toNumber()} currentEndTime: ${account.currentEndTime.toNumber()}`)
  console.log(`  beforeStartTime: ${account.beforeStartTime.toNumber()} beforeEndTime: ${account.beforeEndTime.toNumber()}`)
  console.log(`  afterStartTime: ${account.afterStartTime.toNumber()} afterEndTime: ${account.afterEndTime.toNumber()}`)
  console.log(`  tokenMint: ${account.tokenMint.toBase58()}`)
  //console.log(`  tokenVault: ${account.tokenVault.toBase58()}`)
  console.log(`\x1b[33m [END DEBUG]\x1b[0m `)

  return account
}

export const debugGameData = async (gameDataAccount: PublicKey) => {
  const account = await fetchAccount('gameData', gameDataAccount)
  console.log(`\x1b[33m [DEBUG] gameData: ${gameDataAccount}\x1b[0m`)
  console.log(`\x1b[90m  startTime: ${account.startTime}, endTime: ${account.endTime}, finish: ${account.finish}`)

  console.log(`  openPrice: ${account.openPrice}, closePrice: ${account.closePrice}`)
  console.log(`  longBetAmount: ${account.longBetAmount}, longBetCount: ${account.longBetCount}`)
  console.log(`  shortBetAmount: ${account.shortBetAmount}, shortBetCount: ${account.shortBetCount}`)
  console.log(`\x1b[33m [END DEBUG]\x1b[0m `)

  return account
}

export const debugBetData = async (betDataAccount: PublicKey) => {
  const account = await fetchAccount('betData', betDataAccount)
  console.log(`\x1b[33m [DEBUG] betData: ${betDataAccount}\x1b[0m`)
  console.log(`\x1b[90m  game: ${account.game.toBase58()}`)
  console.log(`  user: ${account.user.toBase58()}`)
  console.log(`  betDirection: ${Object.keys(account.betDirection).join()},  betAmount: ${account.betAmount.toNumber()}`)
  console.log(`\x1b[33m [END DEBUG]\x1b[0m `)

  return account
}

export const debugEntrants = async (entrantAccount: PublicKey) => {
  const account = await fetchAccount('userEntrantData', entrantAccount)
  console.log(`\x1b[33m [DEBUG] userEntrantData: ${entrantAccount}\x1b[0m`)
  console.log(`  front: ${account.front}, rear: ${account.rear}`)
  console.log(`  entrants: ${account.entrantsQueue}`)

  return account
}

export const debugUserData = async (userDataAccount: PublicKey) => {
  const account = await fetchAccount('userData', userDataAccount)
  console.log(`\x1b[33m [DEBUG] userData: ${userDataAccount}\x1b[0m`)

  console.log(`  countWin: ${account.countWin}, countLose: ${account.countLose}, countDraw: ${account.countDraw}`)
  console.log(`  countBet: ${account.countBet}, countGame: ${account.countGame}`)
  console.log(`  totalBet: ${account.totalBet}, totalClaim: ${account.totalClaim}`)
  console.log(`  totalLongBet: ${account.totalLongBet}, totalShortBet: ${account.totalShortBet}`)


  console.log(`\x1b[33m [END DEBUG]\x1b[0m `)

  return account
}

export const debugTx = (txSignature: string, txName: string = '') => {
  console.log(`\x1b[33m [TX] ${txName}: ${txSignature}\x1b[0m`)
}
export const debugAccount = (account: Keypair | PublicKey, accountName: string = '') => {
  console.log(`\x1b[33m [ACCOUNT] ${accountName}: ${account instanceof Keypair ? account.publicKey.toBase58() : account.toBase58()}\x1b[0m`)
}

export const fetchAccount = async (
  accountName: keyof AllAccountsMap<ChartGame>,
  accountKey: PublicKey
): Promise<TypeDef<ChartGame["accounts"] extends undefined
  ? IdlAccountDef
  : NonNullable<ChartGame["accounts"][number]>,
  IdlTypes<ChartGame>>> => {
  const program = anchor.workspace.ChartGame as Program<ChartGame>;

  return await program.account[accountName].fetch(accountKey)
}

const getCallFrom = () => {
  const priorPrepareStackTrace = Error.prepareStackTrace
  Error.prepareStackTrace = arrayPrepareStackTrace
  const stack = ((new Error()).stack)
  Error.prepareStackTrace = priorPrepareStackTrace

}
