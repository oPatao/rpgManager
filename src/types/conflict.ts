export type GroupLevel = 'iniciante' | 'intermediario' | 'avancado' | 'epico';
export type ActivationCostType = 'pressao' | 'adaptacao';
export type ObjectiveType = 'principal' | 'secundario';
export type DieType = 'd6' | 'd10' | 'd12';

export interface DieUnit {
  id: string;
  type: DieType;
  pointValue: number; // d6=1, d10=2, d12=3
}

export interface Activation {
  id: string;
  name: string;
  description: string;
  costType: ActivationCostType;
  costAmount: number;
  effect: string;
  isUsed: boolean;
}

export interface Condition {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
}

export interface ConflictObjective {
  id: string;
  name: string;
  description: string;
  type: ObjectiveType;
  requiredSuccesses: number;
  currentSuccesses: number;
  isCompleted: boolean;
  reward?: string;
  endsConflict: boolean;
  isSoloOption?: boolean;
  soloCost?: number;
}

export interface Threat {
  id: string;
  name: string;
  npcId?: string;
  description: string;
  hasOwnDicePool: boolean;
  dicePool: DieUnit[];
  activations: Activation[];
  isActive: boolean;
  isNeutralized: boolean;
  rolledValues?: number[];
}

export interface Conflict {
  id: string;
  campaignId?: string;
  name: string;
  description: string;
  groupLevel: GroupLevel;
  playerCount: number;
  conflictDicePool: DieUnit[];
  totalDicePoints: number;
  conditions: Condition[];
  conflictActivations: Activation[];
  threats: Threat[];
  objectives: ConflictObjective[];
  backgroundId?: string;
  trackId?: string;
  ambientTrackId?: string;
  isActive: boolean;
  currentRound: number;
  currentTurn: 'players' | 'conflict' | 'threats';
  rolledValues?: number[];
  createdAt: number;
  updatedAt: number;
}

export interface BalanceTableConfig {
  level: GroupLevel;
  basePoints: number;
  perPlayer: number;
  simpleBase: number;
  simplePerExtra: number;
  climaxBase: number;
  climaxPerExtra: number;
}
