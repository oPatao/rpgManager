import { GroupLevel, DieType, DieUnit, BalanceTableConfig } from '../types/conflict';

export const BALANCE_TABLE: BalanceTableConfig[] = [
  { level: 'iniciante', basePoints: 3, perPlayer: 1, simpleBase: 4, simplePerExtra: 2, climaxBase: 6, climaxPerExtra: 2 },
  { level: 'intermediario', basePoints: 6, perPlayer: 2, simpleBase: 6, simplePerExtra: 3, climaxBase: 8, climaxPerExtra: 3 },
  { level: 'avancado', basePoints: 9, perPlayer: 3, simpleBase: 8, simplePerExtra: 4, climaxBase: 10, climaxPerExtra: 4 },
  { level: 'epico', basePoints: 12, perPlayer: 4, simpleBase: 10, simplePerExtra: 5, climaxBase: 12, climaxPerExtra: 5 },
];

export const DIE_VALUES: Record<DieType, number> = {
  d6: 1,
  d10: 2,
  d12: 3,
};

export function suggestDiceComposition(totalPoints: number): DieUnit[] {
  const dice: DieUnit[] = [];
  let remaining = totalPoints;

  while (remaining >= 3) {
    dice.push({ id: crypto.randomUUID(), type: 'd12', pointValue: 3 });
    remaining -= 3;
  }
  while (remaining >= 2) {
    dice.push({ id: crypto.randomUUID(), type: 'd10', pointValue: 2 });
    remaining -= 2;
  }
  while (remaining >= 1) {
    dice.push({ id: crypto.randomUUID(), type: 'd6', pointValue: 1 });
    remaining -= 1;
  }

  return dice;
}

export function calculateConflictDice(level: GroupLevel, playerCount: number) {
  const config = BALANCE_TABLE.find(b => b.level === level) || BALANCE_TABLE[0];
  const totalPoints = config.basePoints + (config.perPlayer * playerCount);
  return { totalPoints, suggestedDice: suggestDiceComposition(totalPoints) };
}

export function calculateObjectiveCost(level: GroupLevel, playerCount: number, isClimax: boolean): number {
  const config = BALANCE_TABLE.find(b => b.level === level) || BALANCE_TABLE[0];
  const base = isClimax ? config.climaxBase : config.simpleBase;
  const perExtra = isClimax ? config.climaxPerExtra : config.simplePerExtra;
  return base + (perExtra * Math.max(0, playerCount - 1));
}
