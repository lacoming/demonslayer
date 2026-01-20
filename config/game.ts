export const gameConfig = {
  defaultTargetXp: 100,
  rankXpStep: 500,
  streakBonusPer3Days: 0.05,
  maxStreakBonus: 0.25,
  cycleAdvancementRequirements: {
    minDailyPlans: 3,
    minInterviews: 6,
  },
  mockTimerMinutes: 20,
  ranks: [
    "Mizunoto",
    "Mizunoe",
    "Kanoto",
    "Kanoe",
    "Tsuchinoto",
    "Tsuchinoe",
    "Hinoto",
    "Hinoe",
    "Kinoto",
    "Kinoe",
    "Hashira",
  ] as const,
} as const

export type Rank = typeof gameConfig.ranks[number]
