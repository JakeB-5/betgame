# BetGame (Solana Smart Contract)

**BetGame** is a decentralized prediction platform where users can tokens on the Solana network and earn rewards by predicting cryptocurrency price movements.  
This repository contains the on-chain logic of BetGame, developed using the Solana blockchain and the Anchor framework.

The full game logic can be understood through the test code.

You can interact with the web frontend here:  
[BetGame Frontend](https://github.com/JakeB-5/betgame-frontend)

---

## 📌 Key Features

- Trustless prediction pool logic built with Solana + Anchor
- On-chain settlement and reward distribution
- Statistics and ranking system based on on-chain data
- CLI tool for testing and simulation

---

## 🛠️ Tech Stack

- **Solana** – High-performance blockchain platform
- **Anchor** – Smart contract framework for Solana (Rust-based)
- **TypeScript** – Used for writing test code

---

## 📂 Project Structure
```
betgame/
    |-- programs/betgame/ # Anchor smart contract (Rust)
    |-- tests/ # Anchor Mocha tests (TypeScript)
    |-- migrations/ # Deployment scripts
    |-- cli/ # Command-line interaction tool
    |-- Anchor.toml # Anchor configuration file
```

---

## 🚀 Build & Deploy

```bash
anchor build      # Build the smart contract
anchor deploy     # Deploy the smart contract
anchor test       # Run tests
```

## ✅ To-Do
- [ ] Add referral program
