/**
 * This code was GENERATED using the solita package.
 * Please DO NOT EDIT THIS FILE, instead rerun solita to update it or write a wrapper to add functionality.
 *
 * See: https://github.com/metaplex-foundation/solita
 */

import * as beet from '@metaplex-foundation/beet'
import * as web3 from '@solana/web3.js'
import * as beetSolana from '@metaplex-foundation/beet-solana'

/**
 * Arguments used to create {@link UserData}
 * @category Accounts
 * @category generated
 */
export type UserDataArgs = {
  countWin: number
  countLose: number
  countDraw: number
  countBet: number
  countGame: number
  totalBet: beet.bignum
  totalLongBet: beet.bignum
  totalShortBet: beet.bignum
  totalClaim: beet.bignum
}

export const userDataDiscriminator = [139, 248, 167, 203, 253, 220, 210, 221]
/**
 * Holds the data for the {@link UserData} Account and provides de/serialization
 * functionality for that data
 *
 * @category Accounts
 * @category generated
 */
export class UserData implements UserDataArgs {
  private constructor(
    readonly countWin: number,
    readonly countLose: number,
    readonly countDraw: number,
    readonly countBet: number,
    readonly countGame: number,
    readonly totalBet: beet.bignum,
    readonly totalLongBet: beet.bignum,
    readonly totalShortBet: beet.bignum,
    readonly totalClaim: beet.bignum
  ) {}

  /**
   * Creates a {@link UserData} instance from the provided args.
   */
  static fromArgs(args: UserDataArgs) {
    return new UserData(
      args.countWin,
      args.countLose,
      args.countDraw,
      args.countBet,
      args.countGame,
      args.totalBet,
      args.totalLongBet,
      args.totalShortBet,
      args.totalClaim
    )
  }

  /**
   * Deserializes the {@link UserData} from the data of the provided {@link web3.AccountInfo}.
   * @returns a tuple of the account data and the offset up to which the buffer was read to obtain it.
   */
  static fromAccountInfo(
    accountInfo: web3.AccountInfo<Buffer>,
    offset = 0
  ): [UserData, number] {
    return UserData.deserialize(accountInfo.data, offset)
  }

  /**
   * Retrieves the account info from the provided address and deserializes
   * the {@link UserData} from its data.
   *
   * @throws Error if no account info is found at the address or if deserialization fails
   */
  static async fromAccountAddress(
    connection: web3.Connection,
    address: web3.PublicKey
  ): Promise<UserData> {
    const accountInfo = await connection.getAccountInfo(address)
    if (accountInfo == null) {
      throw new Error(`Unable to find UserData account at ${address}`)
    }
    return UserData.fromAccountInfo(accountInfo, 0)[0]
  }

  /**
   * Provides a {@link web3.Connection.getProgramAccounts} config builder,
   * to fetch accounts matching filters that can be specified via that builder.
   *
   * @param programId - the program that owns the accounts we are filtering
   */
  static gpaBuilder(
    programId: web3.PublicKey = new web3.PublicKey(
      'Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS'
    )
  ) {
    return beetSolana.GpaBuilder.fromStruct(programId, userDataBeet)
  }

  /**
   * Deserializes the {@link UserData} from the provided data Buffer.
   * @returns a tuple of the account data and the offset up to which the buffer was read to obtain it.
   */
  static deserialize(buf: Buffer, offset = 0): [UserData, number] {
    return userDataBeet.deserialize(buf, offset)
  }

  /**
   * Serializes the {@link UserData} into a Buffer.
   * @returns a tuple of the created Buffer and the offset up to which the buffer was written to store it.
   */
  serialize(): [Buffer, number] {
    return userDataBeet.serialize({
      accountDiscriminator: userDataDiscriminator,
      ...this,
    })
  }

  /**
   * Returns the byteSize of a {@link Buffer} holding the serialized data of
   * {@link UserData}
   */
  static get byteSize() {
    return userDataBeet.byteSize
  }

  /**
   * Fetches the minimum balance needed to exempt an account holding
   * {@link UserData} data from rent
   *
   * @param connection used to retrieve the rent exemption information
   */
  static async getMinimumBalanceForRentExemption(
    connection: web3.Connection,
    commitment?: web3.Commitment
  ): Promise<number> {
    return connection.getMinimumBalanceForRentExemption(
      UserData.byteSize,
      commitment
    )
  }

  /**
   * Determines if the provided {@link Buffer} has the correct byte size to
   * hold {@link UserData} data.
   */
  static hasCorrectByteSize(buf: Buffer, offset = 0) {
    return buf.byteLength - offset === UserData.byteSize
  }

  /**
   * Returns a readable version of {@link UserData} properties
   * and can be used to convert to JSON and/or logging
   */
  pretty() {
    return {
      countWin: this.countWin,
      countLose: this.countLose,
      countDraw: this.countDraw,
      countBet: this.countBet,
      countGame: this.countGame,
      totalBet: (() => {
        const x = <{ toNumber: () => number }>this.totalBet
        if (typeof x.toNumber === 'function') {
          try {
            return x.toNumber()
          } catch (_) {
            return x
          }
        }
        return x
      })(),
      totalLongBet: (() => {
        const x = <{ toNumber: () => number }>this.totalLongBet
        if (typeof x.toNumber === 'function') {
          try {
            return x.toNumber()
          } catch (_) {
            return x
          }
        }
        return x
      })(),
      totalShortBet: (() => {
        const x = <{ toNumber: () => number }>this.totalShortBet
        if (typeof x.toNumber === 'function') {
          try {
            return x.toNumber()
          } catch (_) {
            return x
          }
        }
        return x
      })(),
      totalClaim: (() => {
        const x = <{ toNumber: () => number }>this.totalClaim
        if (typeof x.toNumber === 'function') {
          try {
            return x.toNumber()
          } catch (_) {
            return x
          }
        }
        return x
      })(),
    }
  }
}

/**
 * @category Accounts
 * @category generated
 */
export const userDataBeet = new beet.BeetStruct<
  UserData,
  UserDataArgs & {
    accountDiscriminator: number[] /* size: 8 */
  }
>(
  [
    ['accountDiscriminator', beet.uniformFixedSizeArray(beet.u8, 8)],
    ['countWin', beet.u32],
    ['countLose', beet.u32],
    ['countDraw', beet.u32],
    ['countBet', beet.u32],
    ['countGame', beet.u32],
    ['totalBet', beet.u128],
    ['totalLongBet', beet.u128],
    ['totalShortBet', beet.u128],
    ['totalClaim', beet.u128],
  ],
  UserData.fromArgs,
  'UserData'
)
