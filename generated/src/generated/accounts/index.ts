export * from './BetData'
export * from './GameData'
export * from './GlobalConfigData'
export * from './UserData'
export * from './UserEntrantData'

import { GlobalConfigData } from './GlobalConfigData'
import { GameData } from './GameData'
import { BetData } from './BetData'
import { UserData } from './UserData'
import { UserEntrantData } from './UserEntrantData'

export const accountProviders = {
  GlobalConfigData,
  GameData,
  BetData,
  UserData,
  UserEntrantData,
}
