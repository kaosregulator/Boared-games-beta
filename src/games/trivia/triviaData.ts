import { HostCharacter, TriviaQuestion, CustomTriviaPack } from '../../types/trivia';

export const TRIVIA_HOSTS: HostCharacter[] = [
  {
    id: 'buzz',
    name: 'Buzz Sparkler',
    title: 'The Glitz & Glam Showman',
    avatar: '🎙️',
    themeColor: 'from-amber-500 via-purple-600 to-indigo-700',
    accentGlow: 'text-yellow-400 border-yellow-400',
    personality: 'Energetic, snarky, loves dramatic countdowns and game show buzzer sound effects!',
    defaultGreeting: 'WELCOME PLAYERS to the BIGGEST, WILDEST Trivia Party on Discord! Let\'s test those brain cells!'
  },
  {
    id: 'mortimer',
    name: 'Lord Mortimer',
    title: 'Victorian Ghost & Murder Mystery Master',
    avatar: '👻',
    themeColor: 'from-purple-950 via-slate-900 to-rose-950',
    accentGlow: 'text-rose-400 border-rose-500',
    personality: 'Gothic, eerie, politely sinister, welcomes players to his deadly Victorian manor.',
    defaultGreeting: 'Welcome to my humble manor... Answer correctly, or take your chances on the Killing Floor!'
  },
  {
    id: 'pixel8',
    name: 'Pixel-8 Hologram',
    title: 'Retro Arcade System AI',
    avatar: '👾',
    themeColor: 'from-cyan-900 via-blue-950 to-emerald-950',
    accentGlow: 'text-cyan-400 border-cyan-400',
    personality: 'Chiptune loving, glitchy 8-bit enthusiast who speaks in retro video game jargon.',
    defaultGreeting: 'SYSTEM ONLINE: Booting 16-bit memory banks. Prepare for 100% Gaming Trivia!'
  },
  {
    id: 'scarlett',
    name: 'Director Scarlett',
    title: 'Hollywood Film Buff',
    avatar: '🎬',
    themeColor: 'from-rose-900 via-amber-950 to-slate-900',
    accentGlow: 'text-amber-400 border-amber-500',
    personality: 'Fast-talking film critic who quotes classic cinema and tests deep movie knowledge.',
    defaultGreeting: 'QUIET ON SET! Cameras rolling! Let\'s see who actually knows their Oscar winners and cult classics!'
  }
];

export const TRIVIA_QUESTIONS: TriviaQuestion[] = [
  // ----------------------------------------------------
  // 1. MOVIE QUOTES & DIALOGUE
  // ----------------------------------------------------
  {
    id: 'mq1',
    category: 'movie_quotes',
    type: 'quote',
    question: 'Finish this iconic quote from Casablanca (1942): "Here\'s looking at you, _____."',
    options: ['darling', 'kid', 'sweetheart', 'beautiful'],
    correctIndex: 1,
    explanation: 'Humphrey Bogart famously delivered the immortal line "Here\'s looking at you, kid" to Ingrid Bergman in Casablanca.',
    hint: 'A youthful nickname for Rick to call Ilsa.',
    points: 1000,
    mediaClue: {
      type: 'quote_speaker',
      content: 'Humphrey Bogart as Rick Blaine',
      subtext: 'Casablanca (1942)'
    }
  },
  {
    id: 'mq2',
    category: 'movie_quotes',
    type: 'quote',
    question: 'Which 1992 courtroom thriller features Jack Nicholson screaming: "YOU CAN\'T HANDLE THE TRUTH!"?',
    options: ['A Few Good Men', 'Primal Fear', 'The Pelican Brief', 'The Firm'],
    correctIndex: 0,
    explanation: 'Colonel Nathan R. Jessep (Jack Nicholson) delivers the unforgettable outburst to Tom Cruise in A Few Good Men.',
    hint: 'Directed by Rob Reiner and written by Aaron Sorkin.',
    points: 1000,
    mediaClue: {
      type: 'quote_speaker',
      content: 'Col. Nathan R. Jessep',
      subtext: 'Courtroom Cross-examination'
    }
  },
  {
    id: 'mq3',
    category: 'movie_quotes',
    type: 'quote',
    question: 'In The Terminator (1984), what is Arnold Schwarzenegger\'s classic 3-word catchphrase before returning in a car?',
    options: ['"I will return"', '"I\'ll be back"', '"Hasta la vista"', '"Target is locked"'],
    correctIndex: 1,
    explanation: 'Schwarzenegger famously says "I\'ll be back" to the police station clerk before driving a vehicle right through the front desk.',
    hint: '3 words, 9 letters.',
    points: 1000,
    mediaClue: {
      type: 'quote_speaker',
      content: 'Cyberdyne Systems Model 101',
      subtext: 'The Terminator (1984)'
    }
  },
  {
    id: 'mq4',
    category: 'movie_quotes',
    type: 'quote',
    question: 'In The Godfather (1972), Don Vito Corleone promises: "I\'m gonna make him an offer he _____."',
    options: ['cannot resist', 'won\'t decline', 'can\'t refuse', 'will agree to'],
    correctIndex: 2,
    explanation: '"I\'m gonna make him an offer he can\'t refuse" is ranked the #2 greatest movie quote in American cinema history by the AFI.',
    points: 1000,
    mediaClue: {
      type: 'quote_speaker',
      content: 'Marlon Brando as Don Vito',
      subtext: 'The Godfather'
    }
  },
  {
    id: 'mq5',
    category: 'movie_quotes',
    type: 'quote',
    question: 'Which line comes next in Star Wars: The Empire Strikes Back after Luke yells "He told me enough! He told me YOU killed him!"?',
    options: [
      '"No, he died an honorable man."',
      '"No, I am your father."',
      '"Luke, I am your father."',
      '"Search your feelings, he is gone."'
    ],
    correctIndex: 1,
    explanation: 'A famously misquoted line! Darth Vader actually says "No, I am your father", NOT "Luke, I am your father".',
    hint: 'It begins with the word "No", not "Luke".',
    points: 1200
  },

  // ----------------------------------------------------
  // 2. "THIS ACTOR STARRED IN..."
  // ----------------------------------------------------
  {
    id: 'act1',
    category: 'actors',
    type: 'actor_star',
    question: 'Which of the following movies did Leonardo DiCaprio NOT star in?',
    options: ['Inception', 'The Revenant', 'The Wolf of Wall Street', 'Interstellar'],
    correctIndex: 3,
    explanation: 'Matthew McConaughey starred as Cooper in Interstellar (2014), directed by Christopher Nolan. DiCaprio starred in Nolan\'s Inception (2010).',
    points: 1000,
    mediaClue: {
      type: 'actor_name',
      content: 'Leonardo DiCaprio',
      subtext: 'Academy Award Winner'
    }
  },
  {
    id: 'act2',
    category: 'actors',
    type: 'actor_star',
    question: 'Keanu Reeves portrayed the title assassin in John Wick and Neo in The Matrix, but which 1994 high-octane bus movie made him an action superstar?',
    options: ['Speed', 'Point Break', 'Con Air', 'Die Hard 3'],
    correctIndex: 0,
    explanation: 'Keanu Reeves starred alongside Sandra Bullock in Jan de Bont\'s action masterpiece Speed (1994).',
    points: 1000,
    mediaClue: {
      type: 'actor_name',
      content: 'Keanu Reeves & Sandra Bullock',
      subtext: 'Bus Bomb Action Classic'
    }
  },
  {
    id: 'act3',
    category: 'actors',
    type: 'actor_star',
    question: 'Which multi-talented actor voiced Genie in Aladdin (1992), played Mrs. Doubtfire, and won an Oscar for Good Will Hunting?',
    options: ['Tom Hanks', 'Robin Williams', 'Jim Carrey', 'Billy Crystal'],
    correctIndex: 1,
    explanation: 'Robin Williams brought legendary improvisational comedy and deep dramatic mastery to all of these beloved films.',
    points: 1000,
    mediaClue: {
      type: 'actor_name',
      content: 'Robin Williams',
      subtext: 'Genie / Mrs. Doubtfire / Dr. Sean Maguire'
    }
  },
  {
    id: 'act4',
    category: 'actors',
    type: 'actor_star',
    question: 'Pedro Pascal has starred in The Mandalorian and The Last of Us, but which unforgettable prince did he play in Game of Thrones?',
    options: ['Oberyn Martell (The Red Viper)', 'Rhaegar Targaryen', 'Renly Baratheon', 'Loras Tyrell'],
    correctIndex: 0,
    explanation: 'Pedro Pascal played Prince Oberyn Martell of Dorne in Season 4 of Game of Thrones, fighting The Mountain in trial by combat.',
    points: 1000
  },
  {
    id: 'act5',
    category: 'actors',
    type: 'actor_star',
    question: 'Sigourney Weaver received an Academy Award nomination for her role as Ellen Ripley in which sci-fi franchise?',
    options: ['Alien', 'Predator', 'Blade Runner', 'Starship Troopers'],
    correctIndex: 0,
    explanation: 'Sigourney Weaver\'s portrayal of Ellen Ripley in James Cameron\'s Aliens (1986) earned a rare Best Actress Oscar nomination for a sci-fi film.',
    points: 1000
  },

  // ----------------------------------------------------
  // 3. GUESS THE MOVIE (FROM CLUES & EMOJIS)
  // ----------------------------------------------------
  {
    id: 'mov1',
    category: 'movies',
    type: 'multiple_choice',
    question: 'Guess the movie from these 3 clues: 🚢 + 🧊 + 💎 ("Heart of the Ocean", 11 Oscars, 1997)',
    options: ['Poseidon', 'Titanic', 'The Perfect Storm', 'Cast Away'],
    correctIndex: 1,
    explanation: 'James Cameron\'s Titanic (1997) won 11 Academy Awards and featured the famous Heart of the Ocean sapphire necklace.',
    points: 1000,
    mediaClue: {
      type: 'badge',
      content: '🚢 🧊 💎',
      subtext: 'Box Office Giant (1997)'
    }
  },
  {
    id: 'mov2',
    category: 'movies',
    type: 'multiple_choice',
    question: 'Which Christopher Nolan dream heist film features a spinning metal totem and Paris folding onto itself?',
    options: ['Tenet', 'Memento', 'Inception', 'The Prestige'],
    correctIndex: 2,
    explanation: 'Inception (2010) follows Dom Cobb navigating multi-layered dreams, using a spinning top to verify reality.',
    points: 1000
  },
  {
    id: 'mov3',
    category: 'movies',
    type: 'multiple_choice',
    question: 'In Quentin Tarantino\'s Pulp Fiction (1994), what glowing object inside the leather briefcase do Vincent and Jules retrieve for Marsellus Wallace?',
    options: ['A golden statue', 'It is never explicitly revealed', 'Diamonds from Reservoir Dogs', 'The Holy Grail'],
    correctIndex: 1,
    explanation: 'The briefcase contents are an intentional "MacGuffin" that emits an amber glow; Quentin Tarantino confirmed it was never scripted as any specific object.',
    points: 1200
  },

  // ----------------------------------------------------
  // 4. VIDEO GAMES & HARDWARE SYSTEMS
  // ----------------------------------------------------
  {
    id: 'sys1',
    category: 'game_systems',
    type: 'system_guess',
    question: 'Which groundbreaking 1996 home console introduced an analog 3D thumbstick, three-pronged trident controller, and cartridge-based 64-bit graphics?',
    options: ['Sega Saturn', 'Sony PlayStation 1', 'Nintendo 64 (N64)', 'Panasonic 3DO'],
    correctIndex: 2,
    explanation: 'The Nintendo 64 launched in 1996 with Super Mario 64, pioneering analog stick 3D camera and movement control.',
    points: 1000,
    mediaClue: {
      type: 'retro_sprite',
      content: '🎮 3-Pronged Controller with Z-Trigger',
      subtext: '64-Bit Cartridge Era'
    }
  },
  {
    id: 'sys2',
    category: 'game_systems',
    type: 'system_guess',
    question: 'What is the highest-selling video game console of all time, surpassing 160 million units worldwide?',
    options: ['Nintendo Switch', 'Sony PlayStation 2 (PS2)', 'Nintendo DS', 'PlayStation 4'],
    correctIndex: 1,
    explanation: 'The PlayStation 2, launched in 2000, remains the best-selling video game console in history with over 160 million units sold.',
    points: 1000,
    mediaClue: {
      type: 'badge',
      content: '160,000,000+ Units Sold',
      subtext: 'Built-in DVD Drive Revolution'
    }
  },
  {
    id: 'sys3',
    category: 'game_systems',
    type: 'system_guess',
    question: 'Sega\'s final home video game console launched in North America on 9/9/99 and featured built-in 56k online modem and VMU memory cards. What was it called?',
    options: ['Sega Saturn', 'Sega Dreamcast', 'Sega Genesis 32X', 'Sega Master System'],
    correctIndex: 1,
    explanation: 'The Sega Dreamcast pioneered online multiplayer console gaming and Visual Memory Units before Sega transitioned to third-party software publishing in 2001.',
    points: 1000,
    mediaClue: {
      type: 'retro_sprite',
      content: 'Spiral Logo & VMU Screen',
      subtext: 'Launched 9/9/1999'
    }
  },
  {
    id: 'sys4',
    category: 'game_systems',
    type: 'system_guess',
    question: 'What famous gaming handheld originally shipped bundled with Alexey Pajitnov\'s puzzle phenomenon Tetris in 1989?',
    options: ['Sega Game Gear', 'Nintendo Game Boy (Dot Matrix)', 'Atari Lynx', 'WonderSwan'],
    correctIndex: 1,
    explanation: 'The 8-bit Nintendo Game Boy bundled with Tetris became one of the most successful cultural phenomena in gaming history.',
    points: 1000
  },
  {
    id: 'sys5',
    category: 'game_systems',
    type: 'system_guess',
    question: 'Which legendary 1983 Nintendo console resurrected the North American video game industry after the Atari market crash of 1983?',
    options: ['NES (Nintendo Entertainment System)', 'Super Nintendo (SNES)', 'Atari 7800', 'ColecoVision'],
    correctIndex: 0,
    explanation: 'The NES (Famicom in Japan) with its "Robotic Operating Buddy (R.O.B.)" and strict Nintendo Seal of Quality revived the American video game market in 1985.',
    points: 1000
  },

  // ----------------------------------------------------
  // 5. GUESS THE VIDEO GAME (LORE, BOSSES, CLUES)
  // ----------------------------------------------------
  {
    id: 'vg1',
    category: 'video_games',
    type: 'multiple_choice',
    question: 'In Elden Ring (2022), which notoriously difficult demigod boss is known as the "Blade of Miquella" and "has never known defeat"?',
    options: ['Radahn', 'Malenia', 'Godrick', 'Morgott'],
    correctIndex: 1,
    explanation: 'Malenia, Blade of Miquella, is famed for her Waterfowl Dance attack and Phase 2 Scarlet Aeonia transformation.',
    points: 1000,
    mediaClue: {
      type: 'badge',
      content: '⚔️ "I am Malenia, Blade of Miquella..."',
      subtext: 'FromSoftware / Lands Between'
    }
  },
  {
    id: 'vg2',
    category: 'video_games',
    type: 'multiple_choice',
    question: 'In Valve\'s Half-Life series, what is the iconic melee weapon wielded by theoretical physicist Gordon Freeman?',
    options: ['Wrench', 'Crowbar', 'Gravity Hammer', 'Stun Baton'],
    correctIndex: 1,
    explanation: 'The red steel crowbar is the signature weapon and symbol of Dr. Gordon Freeman throughout the Black Mesa and City 17 uprisings.',
    points: 1000
  },
  {
    id: 'vg3',
    category: 'video_games',
    type: 'multiple_choice',
    question: 'In The Legend of Zelda: Ocarina of Time (1998), what instrument does Link play to alter time, call his horse Epona, and warp across Hyrule?',
    options: ['Harp of Ages', 'Wind Waker', 'Ocarina of Time', 'Flute of Winds'],
    correctIndex: 2,
    explanation: 'The blue ceramic Ocarina of Time is given to Link by Princess Zelda to protect the Sacred Realm.',
    points: 1000
  },
  {
    id: 'vg4',
    category: 'video_games',
    type: 'multiple_choice',
    question: 'Which legendary 1993 id Software FPS popularized deathmatch multiplayer and featured the BFG 9000 weapon on Mars moons?',
    options: ['Wolfenstein 3D', 'DOOM', 'Quake', 'Duke Nukem 3D'],
    correctIndex: 1,
    explanation: 'DOOM (1993), created by John Carmack and John Romero, defined the first-person shooter genre.',
    points: 1000
  },
  {
    id: 'vg5',
    category: 'video_games',
    type: 'multiple_choice',
    question: 'What is the full title of the protagonist in CD Projekt Red\'s Cyberpunk 2077?',
    options: ['V', 'Johnny', 'Jackie', 'Alt'],
    correctIndex: 0,
    explanation: 'The customizable mercenary protagonist of Cyberpunk 2077 is simply known as "V" (Valerie or Vincent).',
    points: 1000
  },

  // ----------------------------------------------------
  // 6. CHIPTUNE & 8-BIT AUDIO SYNTHESIS GUESSES
  // ----------------------------------------------------
  {
    id: 'chip1',
    category: 'chiptune_sound',
    type: 'sound_guess',
    question: 'Listen to the synthesized 8-bit melody: Which iconic platforming plumber world is this melody from?',
    options: ['Sonic the Hedgehog (Green Hill)', 'Super Mario Bros (World 1-1)', 'Mega Man 2 (Dr. Wily)', 'Castlevania (Vampire Killer)'],
    correctIndex: 1,
    explanation: 'Koji Kondo\'s legendary 1985 Super Mario Bros. Ground Theme is the most recognized video game melody in history.',
    points: 1500,
    chiptuneId: 'mario_run',
    mediaClue: {
      type: 'sound_clip',
      content: '🎵 Playing 8-Bit Overworld Synthesizer Chiptune...',
      subtext: 'Click Play Melody in the Game to Hear!'
    }
  },
  {
    id: 'chip2',
    category: 'chiptune_sound',
    type: 'sound_guess',
    question: 'Listen to this adventurous fantasy chiptune arpeggio: Which Nintendo franchise uses this dungeon theme?',
    options: ['Metroid', 'The Legend of Zelda', 'Kid Icarus', 'Fire Emblem'],
    correctIndex: 1,
    explanation: 'The mysterious cave and dungeon motifs composed by Koji Kondo have guided Link through Hyrule since 1986.',
    points: 1500,
    chiptuneId: 'zelda_cave'
  },
  {
    id: 'chip3',
    category: 'chiptune_sound',
    type: 'sound_guess',
    question: 'Listen to this fast-paced neon cyberpunk bassline: Which genre of intense gaming climax is this?',
    options: ['Cyberpunk Arcade Boss Battle', 'Cozy Farming Simulator', 'Golf Game Menu', 'Chess Clock'],
    correctIndex: 0,
    explanation: 'Fast square waves and rapid saw arpeggios are the hallmark of 90s cyberpunk arcade boss showdowns!',
    points: 1500,
    chiptuneId: 'cyber_boss'
  },

  // ----------------------------------------------------
  // 7. TRIVIA MURDER MYSTERY (DEADLY TRIVIA)
  // ----------------------------------------------------
  {
    id: 'mm1',
    category: 'murder_mystery',
    type: 'murder_trap',
    question: 'In Agatha Christie\'s "And Then There Were None", how many guests are lured to Soldier Island to face judgment?',
    options: ['7 guests', '10 guests', '12 guests', '13 guests'],
    correctIndex: 1,
    explanation: 'Ten strangers are invited to an isolated island by an unknown host, matching the nursery rhyme.',
    hint: 'A clean round double-digit number.',
    points: 1200
  },
  {
    id: 'mm2',
    category: 'murder_mystery',
    type: 'murder_trap',
    question: 'Which notorious Victorian serial killer operated in Whitechapel, London in 1888 and was never officially identified?',
    options: ['The Zodiac Killer', 'Jack the Ripper', 'Sweeney Todd', 'The Black Dahlia'],
    correctIndex: 1,
    explanation: 'Jack the Ripper terrorized the Whitechapel district in 1888, creating one of history\'s most infamous unsolved mysteries.',
    points: 1200
  },
  {
    id: 'mm3',
    category: 'murder_mystery',
    type: 'murder_trap',
    question: 'Which classic Clue (Cluedo) murder weapon is NOT one of the original 6 weapons included in the 1949 board game?',
    options: ['Candlestick', 'Poison Bottle', 'Lead Pipe', 'Rope'],
    correctIndex: 1,
    explanation: 'The original 6 Clue weapons were Candlestick, Dagger, Lead Pipe, Revolver, Rope, and Wrench. Poison was introduced in later special editions!',
    points: 1400
  },
  {
    id: 'mm4',
    category: 'murder_mystery',
    type: 'murder_trap',
    question: 'What deadly poison with the chemical formula HCN smells faintly of bitter almonds to those genetically able to detect it?',
    options: ['Arsenic', 'Hydrogen Cyanide', 'Belladonna', 'Strychnine'],
    correctIndex: 1,
    explanation: 'Hydrogen cyanide (and cyanide salts) produce a faint bitter almond scent that approximately 60% of people can genetically perceive.',
    points: 1400
  }
];

export const PRESET_CUSTOM_PACKS: CustomTriviaPack[] = [
  {
    id: 'pack_retro_90s',
    title: '90s Nostalgia & Cartoons',
    description: 'Throwback questions on 90s Saturday morning cartoons, commercials, VHS tapes, and snacks.',
    author: 'TriviaBot_Curator',
    category: '90s Pop Culture',
    createdAt: '2026',
    questions: [
      {
        id: 'c90_1',
        category: 'custom',
        type: 'multiple_choice',
        question: 'Which 90s animated series featured Tommy, Chuckie, Phil, Lil, and Angelica Pickles?',
        options: ['Hey Arnold!', 'Rugrats', 'Rocket Power', 'Doug'],
        correctIndex: 1,
        explanation: 'Rugrats aired on Nickelodeon starting in 1991 and ran for over a decade.',
        points: 1000
      },
      {
        id: 'c90_2',
        category: 'custom',
        type: 'multiple_choice',
        question: 'What electronic virtual pet keyring took the world by storm starting in Japan in 1996?',
        options: ['Tamagotchi', 'Furby', 'Digimon', 'Giga Pet'],
        correctIndex: 0,
        explanation: 'Bandai\'s Tamagotchi handheld egg-shaped digital pet sold tens of millions of units worldwide.',
        points: 1000
      }
    ]
  },
  {
    id: 'pack_horror_cinema',
    title: 'Slasher & Cult Horror',
    description: 'From Camp Crystal Lake to Elm Street and the Overlook Hotel.',
    author: 'Lord_Mortimer',
    category: 'Horror Films',
    createdAt: '2026',
    questions: [
      {
        id: 'hor_1',
        category: 'custom',
        type: 'multiple_choice',
        question: 'Who was the ACTUAL killer in the original Friday the 13th (1980) film?',
        options: ['Jason Voorhees', 'Mrs. Pamela Voorhees (his mother)', 'Freddy Krueger', 'Michael Myers'],
        correctIndex: 1,
        explanation: 'Pamela Voorhees was the killer seeking revenge for her son Jason drowning at Camp Crystal Lake in 1957.',
        points: 1000
      },
      {
        id: 'hor_2',
        category: 'custom',
        type: 'multiple_choice',
        question: 'What room number in The Shining (1980 film) was Danny Torrance told to stay away from?',
        options: ['Room 217', 'Room 237', 'Room 1408', 'Room 666'],
        correctIndex: 1,
        explanation: 'In Stanley Kubrick\'s film, it was changed to Room 237 (in Stephen King\'s book it was Room 217).',
        points: 1000
      }
    ]
  }
];

export const MOCK_TRIVIA_AI_BOTS = [
  {
    id: 'bot_carl',
    name: 'Cinephile Carl',
    avatar: '🍿',
    color: 'bg-rose-600',
    botPersonality: 'cinephile' as const,
    botAccuracy: 0.9,
    score: 0,
    lives: 3,
    isGhost: false,
    streak: 0,
    selectedAnswer: null,
    answerTimeMs: null,
    isAnswerCorrect: null,
    isBot: true
  },
  {
    id: 'bot_pete',
    name: 'Pixel Pete',
    avatar: '🕹️',
    color: 'bg-cyan-600',
    botPersonality: 'gamer' as const,
    botAccuracy: 0.88,
    score: 0,
    lives: 3,
    isGhost: false,
    streak: 0,
    selectedAnswer: null,
    answerTimeMs: null,
    isAnswerCorrect: null,
    isBot: true
  },
  {
    id: 'bot_bot9000',
    name: 'TriviaBot 9000',
    avatar: '🤖',
    color: 'bg-indigo-600',
    botPersonality: 'genius' as const,
    botAccuracy: 0.82,
    score: 0,
    lives: 3,
    isGhost: false,
    streak: 0,
    selectedAnswer: null,
    answerTimeMs: null,
    isAnswerCorrect: null,
    isBot: true
  },
  {
    id: 'bot_polly',
    name: 'Panic Polly',
    avatar: '😱',
    color: 'bg-amber-600',
    botPersonality: 'panic' as const,
    botAccuracy: 0.65,
    score: 0,
    lives: 3,
    isGhost: false,
    streak: 0,
    selectedAnswer: null,
    answerTimeMs: null,
    isAnswerCorrect: null,
    isBot: true
  }
];
