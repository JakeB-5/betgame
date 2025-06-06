/**
 * This code was GENERATED using the solita package.
 * Please DO NOT EDIT THIS FILE, instead rerun solita to update it or write a wrapper to add functionality.
 *
 * See: https://github.com/metaplex-foundation/solita
 */

import * as splToken from '@solana/spl-token'
import * as web3 from '@solana/web3.js'
import * as beet from '@metaplex-foundation/beet'
import * as beetSolana from '@metaplex-foundation/beet-solana'

/**
 * @category Instructions
 * @category ChangeAuthority
 * @category generated
 */
export type ChangeAuthorityInstructionArgs = {
  newAuthority: beet.COption<web3.PublicKey>
}
/**
 * @category Instructions
 * @category ChangeAuthority
 * @category generated
 */
export const changeAuthorityStruct = new beet.FixableBeetArgsStruct<
  ChangeAuthorityInstructionArgs & {
    instructionDiscriminator: number[] /* size: 8 */
  }
>(
  [
    ['instructionDiscriminator', beet.uniformFixedSizeArray(beet.u8, 8)],
    ['newAuthority', beet.coption(beetSolana.publicKey)],
  ],
  'ChangeAuthorityInstructionArgs'
)
/**
 * Accounts required by the _changeAuthority_ instruction
 *
 * @property [**signer**] authority
 * @property [_writable_] globalConfigData
 * @property [_writable_] tokenMint
 * @property [_writable_] tokenVault
 * @category Instructions
 * @category ChangeAuthority
 * @category generated
 */
export type ChangeAuthorityInstructionAccounts = {
  authority: web3.PublicKey
  globalConfigData: web3.PublicKey
  tokenMint: web3.PublicKey
  tokenVault: web3.PublicKey
  tokenProgram?: web3.PublicKey
}

export const changeAuthorityInstructionDiscriminator = [
  50, 106, 66, 104, 99, 118, 145, 88,
]

/**
 * Creates a _ChangeAuthority_ instruction.
 *
 * @param accounts that will be accessed while the instruction is processed
 * @param args to provide as instruction data to the program
 *
 * @category Instructions
 * @category ChangeAuthority
 * @category generated
 */
export function createChangeAuthorityInstruction(
  accounts: ChangeAuthorityInstructionAccounts,
  args: ChangeAuthorityInstructionArgs,
  programId = new web3.PublicKey('Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS')
) {
  const [data] = changeAuthorityStruct.serialize({
    instructionDiscriminator: changeAuthorityInstructionDiscriminator,
    ...args,
  })
  const keys: web3.AccountMeta[] = [
    {
      pubkey: accounts.authority,
      isWritable: false,
      isSigner: true,
    },
    {
      pubkey: accounts.globalConfigData,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.tokenMint,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.tokenVault,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.tokenProgram ?? splToken.TOKEN_PROGRAM_ID,
      isWritable: false,
      isSigner: false,
    },
  ]

  const ix = new web3.TransactionInstruction({
    programId,
    keys,
    data,
  })
  return ix
}
