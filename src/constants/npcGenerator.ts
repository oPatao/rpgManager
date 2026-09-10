// === NOMES POR ORIGEM E GÊNERO ===
export const NAMES = {
  cidadao: {
    masculino: [
      'Lucas', 'Gabriel', 'Miguel', 'Theo', 'Davi', 'Arthur', 'Bernardo',
      'Heitor', 'Ravi', 'Kauê', 'Noah', 'Bento', 'Caio', 'Enzo', 'Felipe',
      'Gustavo', 'Henrique', 'Igor', 'João', 'Leonardo', 'Marcelo', 'Rafael',
      'Bruno', 'Carlos', 'Eduardo', 'Fernando', 'Paulo', 'Ricardo', 'Sergio',
      'Vinicius', 'André', 'Diego', 'Júnior', 'Wesley', 'Iuri', 'Mauro',
      'Rodrigo', 'Thiago', 'Matheus', 'Danilo'
    ],
    feminino: [
      'Helena', 'Alice', 'Laura', 'Manuela', 'Valentina', 'Sophia', 'Heloísa',
      'Lívia', 'Cecília', 'Maria', 'Antonella', 'Beatriz', 'Catarina', 'Eduarda',
      'Fernanda', 'Gabriela', 'Isabela', 'Joana', 'Larissa', 'Mariana', 'Ana',
      'Bianca', 'Camila', 'Daniela', 'Erika', 'Gisele', 'Patrícia', 'Renata',
      'Sandra', 'Tatiane', 'Vanessa', 'Yasmin', 'Amanda', 'Carla', 'Juliana'
    ],
  },
  indigena: {
    masculino: [
      'Abaeté', 'Acará', 'Aguinaldo', 'Aracy', 'Bororo', 'Cauã', 'Cunha',
      'Guaçui', 'Iberê', 'Iracema', 'Jaci', 'Kadiwéu', 'Mairiporã', 'Moacir',
      'Poti', 'Tupã', 'Ubirajara', 'Ubiracy', 'Xavante', 'Yandra', 'Aimore',
      'Aracé', 'Bento', 'Caubi', 'Goiânia', 'Ibiuna', 'Jaguaretê', 'Tibiriçá',
      'Raoni', 'Aritana'
    ],
    feminino: [
      'Anahi', 'Araci', 'Cecy', 'Cunhã', 'Iara', 'Icamiaba', 'Jaciara',
      'Jandira', 'Maíra', 'Moema', 'Nalú', 'Potira', 'Rudá', 'Saci',
      'Tainá', 'Ubiraci', 'Yara', 'Yasmin', 'Zahy', 'Aruana',
      'Cacilda', 'Jaci', 'Maira', 'Nambi', 'Paraná', 'Bartira', 'Maiara'
    ],
  },
  outro: {
    masculino: [
      'Kael', 'Drex', 'Vorag', 'Naxos', 'Zyran', 'Kruhl', 'Garran', 'Thael',
      'Morgrath', 'Vex', 'Draven', 'Skarn', 'Ulthar', 'Zael', 'Kreios',
      'Gnash', 'Vorr', 'Thrax', 'Maul', 'Drogan', 'Elias', 'Soren',
      'Aldric', 'Bran', 'Cormac', 'Doran', 'Evan', 'Finn', 'Gareth', 'Luther'
    ],
    feminino: [
      'Zara', 'Vyrna', 'Kreia', 'Morwen', 'Nyx', 'Thess', 'Vael', 'Skarn',
      'Lyrith', 'Vorah', 'Kaelia', 'Zephra', 'Morgath', 'Draka', 'Thyss',
      'Venna', 'Ursa', 'Karia', 'Morath', 'Zenna', 'Elara', 'Sable',
      'Mira', 'Nara', 'Ophelia', 'Rhea', 'Sera', 'Thalia', 'Yvaine'
    ],
  },
};

// === SOBRENOMES POR ORIGEM ===
export const SURNAMES = {
  cidadao: [
    'Silva', 'Santos', 'Oliveira', 'Souza', 'Costa', 'Pereira', 'Almeida',
    'Ferreira', 'Rodrigues', 'Gomes', 'Martins', 'Araújo', 'Barbosa', 'Ribeiro',
    'Carvalho', 'Nascimento', 'Mendes', 'Freitas', 'Campos', 'Pinto', 'Cardoso',
    'Teixeira', 'Moraes', 'Cavalcanti', 'Dias', 'Monteiro', 'Cardim', 'Vieira',
    'Nogueira', 'Batista'
  ],
  indigena: [
    'Guarani', 'Tupinambá', 'Carajá', 'Xavante', 'Kayapó', 'Pataxó',
    'Yanomami', 'Waiãpi', 'Bororo', 'Karajá', 'Terena', 'Kaingang',
    'Tukano', 'Mawé', 'Mura', 'Guajajara', 'Potiguara', 'Krahô', 'Munduruku'
  ],
  outro: [
    'o Errante', 'o Solitário', 'o Sobrevivente', 'o Caçador', 'a Lâmina',
    'o Mutante', 'o Corrompido', 'o Assimilado', 'o Devorado', 'a Sombra',
    'o Renascido', 'o Adaptado', 'o Quebrado', 'o Evoluído', 'o Abissal',
    'o Contaminado', 'o Hospedeiro', 'o Simbionte', 'o Metamorfo', 'Vondrak',
    'Kessler', 'Sterling', 'Crowe', 'Vane', 'Drathos', 'Ashford', 'Blackwood'
  ],
};

// === CARACTERÍSTICAS MARCANTES ===
export const CHARACTERISTICS = [
  'Cicatrizes profundas cobrem o rosto, marcas de garras',
  'Olhos de coloração anormal, quase luminosos no escuro',
  'Pele com textura diferente, lembra casca de árvore endurecida',
  'Mãos deformadas com dedos extras fundidos',
  'Cabelo branco prematuro, apesar da idade jovem',
  'Estatura imponente, musculatura densa não natural',
  'Vestes rasgadas e manchadas de seiva escura',
  'Pigmentação irregular na pele, manchas escuras e púrpuras',
  'Dentes afiados demais para um humano normal',
  'Movimentos erráticos, como se articulações fossem diferentes',
  'Voz rouca e sussurrante, difícil de localizar a origem',
  'Um dos olhos é completamente negro, sem íris visível',
  'Braço esquerdo visivelmente mais longo que o direito',
  'Pele fria ao toque, mesmo sob sol escaldante',
  'Tatuagens tribais que parecem se mover na penumbra',
  'Manchas de sangue seco permanente sob as unhas',
  'Torso coberto de cicatrizes cirúrgicas irregulares',
  'Dedos anormalmente longos e articulados como gavinhas',
  'Face parcialmente paralisada, sorriso torto permanente',
  'Calvície total com símbolos rituais tatuados no couro cabeludo',
  'Respiração pesada acompanhada de um sibilo metálico',
  'Postura encurvada e vigilante, nunca dá as costas para portas'
];

// === JEITO DE AGIR ===
export const BEHAVIORS = [
  'Desconfiado de todos, especialmente de estranhos armados',
  'Otimista irredutível, mesmo diante do horror e destruição',
  'Calmo e metódico, fala pouco e age com precisão cirúrgica',
  'Instável emocionalmente, oscila entre esperança e desespero',
  'Leal até a morte a quem ganhar sua confiança',
  'Cínico e sarcástico, usa humor ácido como escudo psicológico',
  'Silencioso e observador, prefere agir com firmeza a falar',
  'Protetor ferrenho dos mais fracos e necessitados',
  'Ambicioso, busca poder e vantagens a qualquer custo',
  'Arrependido de erros do passado, busca redenção desesperada',
  'Curioso e investigativo, fascinado por artefatos desconhecidos',
  'Paranoico, vê ameaças e conspirações em toda parte',
  'Generoso ao extremo, mesmo colocando a própria vida em risco',
  'Friamente lógico, ignora emoções e hesitações em decisões difíceis',
  'Tagarela incansável, preenche silêncios tensos com conversas fiadas',
  'Receptivo e acolhedor, trata estranhos como se fossem família',
  'Solene e cerimonioso, fala com a cadência de rituais sagrados',
  'Brincalhão e irreverente, quebra momentos tensos com piadas inapropriadas',
  'Melancólico, carrega o fardo insuportável de perdas antigas',
  'Determinado e inflexível, não aceita "não" nem meio-termo como resposta'
];

// === OPINIÃO INICIAL SOBRE OS PLAYERS ===
export const INITIAL_OPINIONS = [
  'Hostil — vê os jogadores como ameaça imediata',
  'Desconfiado — observa à distância, não se aproxima',
  'Neutro — não ajuda nem atrapalha, espera para ver',
  'Interessado — curioso sobre os jogadores e suas intenções',
  'Amigável — disposto a cooperar e conversar',
  'Admirado — vê os jogadores como referência ou liderança',
];

// === PARTES DO CORPO MODIFICADAS (se infectado) ===
export const BODY_MODIFICATIONS = [
  { part: 'Braço direito', desc: 'coberto por placas quitinosas escuras' },
  { part: 'Olhos', desc: 'ambos com íris bifurcada, como de réptil' },
  { part: 'Pele', desc: 'com textura de casca de árvore e coloração esverdeada' },
  { part: 'Mãos', desc: 'dedos fundidos em garras curtas mas afiadas' },
  { part: 'Coluna', desc: 'protuberâncias ósseas visíveis sob a pele' },
  { part: 'Cordas vocais', desc: 'voz distorcida, soa como dois tons sobrepostos' },
  { part: 'Pernas', desc: 'articulações invertidas, como patas traseiras de animal' },
  { part: 'Dentes', desc: 'afilados e em número excessivo, bocarra permanente' },
  { part: 'Crânio', desc: 'formato alongado, com crista óssea visível' },
  { part: 'Pulmões', desc: 'respiração visivelmente anormal, exala vapor escuro' },
  { part: 'Unhas', desc: 'transformadas em garras retráteis permanentes' },
  { part: 'Língua', desc: 'bifurcada e preênsil, pode estender até 30cm' },
  { part: 'Olho esquerdo', desc: 'substituído por massa orgânica pulsante e luminosa' },
  { part: 'Palmas das mãos', desc: 'secreção viscosa que endurece em contato com o ar' },
  { part: 'Costas', desc: 'brânquias e espículas em formação, ainda sensíveis' },
  { part: 'Pescoço', desc: 'brânquias funcionais laterais, respira debaixo d\'água' },
  { part: 'Pele do tronco', desc: 'translúcida em alguns pontos, revelando órgãos e veias brilhantes' },
  { part: 'Mandíbula', desc: 'desarticulável, abre muito além do padrão humano' },
];

// === TABELA DE MOTIVAÇÕES 6x6 (CRUZANDO 2d6) ===
// Linha = d6 (1-6, índice 0-5), Coluna = d6 (1-6, índice 0-5)
export const MOTIVATION_TABLE: string[][] = [
  // Col 0        Col 1        Col 2        Col 3        Col 4        Col 5
  ['Sobreviver', 'Proteger',  'Vingar',    'Explorar',  'Dominar',   'Fugir'],     // Linha 0 (d6 = 1)
  ['Curar',      'Liderar',   'Destruir',  'Coletar',   'Negociar',  'Esconder'],  // Linha 1 (d6 = 2)
  ['Evangelizar','Unir',      'Isolar',    'Construir', 'Sabotar',   'Observar'],  // Linha 2 (d6 = 3)
  ['Recordar',   'Testar',    'Ensinar',   'Estudar',   'Caçar',     'Resgatar'],  // Linha 3 (d6 = 4)
  ['Servir',     'Comandar',  'Rebelar',   'Investigar','Negociar',  'Proteger'],  // Linha 4 (d6 = 5)
  ['Reconhecer', 'Consumir',  'Adaptar',   'Mutar',     'Assimilar', 'Transcender'],// Linha 5 (d6 = 6)
];
