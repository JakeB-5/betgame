
import * as spl from '@solana/spl-token'
import * as anchor from '@project-serum/anchor'
import * as serumCmn from '@project-serum/common'

import {AnchorProvider, Provider} from "@project-serum/anchor";
import {TOKEN_PROGRAM_ID} from "@solana/spl-token";
import {PublicKey} from "@solana/web3.js";

function sleep(ms: number) {
  console.log('Sleeping for', ms / 1000, 'seconds')
  return new Promise((resolve) => setTimeout(resolve, ms))
}
async function getTokenAccount(
  token: spl.Token,
  owner: anchor.web3.PublicKey,
) {

  return await token.getAccountInfo(owner)
  //return (await token.getOrCreateAssociatedAccountInfo(owner))
}


async function getOrCreateAssociatedAccountInfo(
  token: spl.Token,
  owner: anchor.web3.PublicKey
) {
  return await token.getOrCreateAssociatedAccountInfo(owner)
}

async function createMint(
  provider: AnchorProvider,
  decimals = 6,
  authority?: anchor.web3.PublicKey,
  freezeAuthority?: anchor.web3.PublicKey,
) {
  if (authority === undefined) {
    authority = provider.wallet.publicKey
  }
  const mint = await spl.Token.createMint(
    provider.connection,
    anchor.Wallet.local().payer,
    authority,
    freezeAuthority,
    decimals,
    TOKEN_PROGRAM_ID,
  )
  return mint
}

async function createTokenAccount(
  provider,
  mint: anchor.web3.PublicKey,
  owner: anchor.web3.PublicKey,
) {
  const token = new spl.Token(
    provider.connection,
    mint,
    TOKEN_PROGRAM_ID,
    provider.wallet.payer,
  )
  let vault = await token.createAccount(owner)
  return vault
}

export const requestAirdrop = async (
  provider: Provider,
  receiver: PublicKey,
  amount = 100000000000,
) => {
  const tx = await provider.connection.requestAirdrop(receiver, amount)

  await provider.connection.confirmTransaction(tx)
}

export { sleep, getTokenAccount, createTokenAccount, createMint ,getOrCreateAssociatedAccountInfo }
