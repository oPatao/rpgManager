import { GeneratedNPC, GeneratorConfig, InfectionStatus, NPCOrigin } from '../types/npcGenerator';
import {
  NAMES,
  SURNAMES,
  CHARACTERISTICS,
  BEHAVIORS,
  INITIAL_OPINIONS,
  BODY_MODIFICATIONS,
  MOTIVATION_TABLE,
} from '../constants/npcGenerator';

const randomFrom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export function generateNPC(config: GeneratorConfig): GeneratedNPC {
  // 1. Resolver gênero
  const gender: 'masculino' | 'feminino' =
    config.gender === 'aleatorio'
      ? Math.random() < 0.5 ? 'masculino' : 'feminino'
      : config.gender;

  // 2. Resolver origem
  const origin: NPCOrigin =
    config.origin === 'aleatorio'
      ? randomFrom(['cidadao', 'indigena', 'outro'] as NPCOrigin[])
      : config.origin;

  // 3. Nome + sobrenome
  const name = randomFrom(NAMES[origin][gender]);
  const surname = randomFrom(SURNAMES[origin]);

  // 4. Infecção: 45% não infectado, 45% infectado, 10% avançado
  const infectionRoll = Math.random();
  let infectionStatus: InfectionStatus;
  if (infectionRoll < 0.45) {
    infectionStatus = 'nao_infectado';
  } else if (infectionRoll < 0.90) {
    infectionStatus = 'infectado';
  } else {
    infectionStatus = 'infectado_avancado';
  }

  // 5. Modificação corporal (se infectado)
  let modifiedBodyPart: string | null = null;
  let modificationDescription: string | null = null;
  if (infectionStatus !== 'nao_infectado') {
    const mod = randomFrom(BODY_MODIFICATIONS);
    modifiedBodyPart = mod.part;
    modificationDescription =
      infectionStatus === 'infectado_avancado'
        ? `AVANÇADO: ${mod.desc} (mutação visível e grave)`
        : mod.desc;
  }

  // 6. Característica, comportamento, opinião
  const characteristic = randomFrom(CHARACTERISTICS);
  const behavior = randomFrom(BEHAVIORS);
  const initialOpinion = randomFrom(INITIAL_OPINIONS);

  // 7. Motivação (2d6 cruzados na tabela)
  const motivationRow = Math.floor(Math.random() * 6);
  const motivationCol = Math.floor(Math.random() * 6);
  const motivation = MOTIVATION_TABLE[motivationRow][motivationCol];

  return {
    name,
    surname,
    gender,
    origin,
    infectionStatus,
    modifiedBodyPart,
    modificationDescription,
    characteristic,
    behavior,
    initialOpinion,
    motivation,
    motivationRow,
    motivationCol,
  };
}
