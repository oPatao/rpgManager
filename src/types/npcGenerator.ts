export type Gender = 'masculino' | 'feminino' | 'aleatorio';
export type NPCOrigin = 'cidadao' | 'indigena' | 'outro';
export type InfectionStatus = 'nao_infectado' | 'infectado' | 'infectado_avancado';

export interface GeneratedNPC {
  // Identidade
  name: string;
  surname: string;
  gender: 'masculino' | 'feminino';
  origin: NPCOrigin;

  // Status de infecção
  infectionStatus: InfectionStatus;
  modifiedBodyPart: string | null;  // null se não infectado
  modificationDescription: string | null;

  // Personalidade e Relações
  characteristic: string;      // característica marcante
  behavior: string;            // jeito de agir
  initialOpinion: string;      // opinião inicial sobre os players

  // Motivação (tabela 6x6 cruzando 2d6)
  motivation: string;
  motivationRow: number;       // 0-5 (d6 linha)
  motivationCol: number;       // 0-5 (d6 coluna)
}

export interface GeneratorConfig {
  gender: Gender;
  origin: NPCOrigin | 'aleatorio';
}
