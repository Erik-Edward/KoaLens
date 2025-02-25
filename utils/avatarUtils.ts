// utils/avatarUtils.ts
export interface AvatarOption {
    id: string;
    name: string;
    description: string;
    filename: string;
    minYears?: number;
  }
  
  export interface SupporterAvatarOption {
    id: string;
    name: string;
    description: string;
    filename: string;
    bgColor: string; // Ny property för bakgrundsfärg
  }
  
  // Ursprungliga avatarer för veganer
  export const AVATARS: Record<'cute' | 'cool', AvatarOption[]> = {
    cute: [
      {
        id: 'sprout',
        name: 'Grodden',
        description: 'Ditt veganska frö har just börjat gro. Varje steg räknas!',
        filename: 'sprout',
        minYears: 0
      },
      {
        id: 'rabbit',
        name: 'Hoppy',
        description: 'Visste du att kaninens öron kan höra nästan 360 grader, vilket gör dem extremt alerta?',
        filename: 'rabbit',
        minYears: 1
      },
      {
        id: 'koala',
        name: 'Kola',
        description: 'Koalor sover upp till 20 timmar per dag – de vet verkligen hur man slappar!',
        filename: 'koala',
        minYears: 3
      },
      {
        id: 'turtle',
        name: 'Sköldy',
        description: 'Sköldpaddor har unika mönster på sina skal, precis som våra fingeravtryck!',
        filename: 'turtle',
        minYears: 5
      }
    ],
    cool: [
      {
        id: 'sprout_cool',
        name: 'Grodden',
        description: 'Med styrka och beslutsamhet börjar din veganska resa!',
        filename: 'sprout',
        minYears: 0
      },
      {
        id: 'rabbit_cool',
        name: 'Hoppy',
        description: 'Visste du att kaninens öron kan höra nästan 360 grader, vilket gör dem extremt alerta?',
        filename: 'rabbit',
        minYears: 1
      },
      {
        id: 'koala_cool',
        name: 'Kola',
        description: 'Koalor sover upp till 20 timmar per dag – de vet verkligen hur man slappar!',
        filename: 'koala',
        minYears: 3
      },
      {
        id: 'turtle_cool',
        name: 'Sköldy',
        description: 'Sköldpaddor har unika mönster på sina skal, precis som våra fingeravtryck!',
        filename: 'turtle',
        minYears: 5
      }
    ]
  };
  
  // Supporter avatarer
  export const SUPPORTER_AVATARS: SupporterAvatarOption[] = [
    {
      id: 'gorilla',
      name: 'Groove Gorilla',
      description: 'Gorillor har unika fingeravtryck precis som människor och älskar att dansa till musik!',
      filename: 'gorilla',
      bgColor: '#2D3748'
    },
    {
      id: 'cow',
      name: 'Cool Ko',
      description: 'Kor har bästa kompisar och blir stressade när de separeras från sina vänner',
      filename: 'cow',
      bgColor: '#44337A'
    },
    {
      id: 'ostrich',
      name: 'Optimist Ostrich',
      description: 'Strutsar kan springa snabbare än en häst och ta steg på över 4 meter!',
      filename: 'ostrich',
      bgColor: '#234E52'
    },
    {
      id: 'giraffe',
      name: 'Gentle Giraffe',
      description: 'Giraffer använder sin långa tunga på 50 cm för att rengöra sina öron',
      filename: 'giraffe',
      bgColor: '#744210'
    },
    {
      id: 'deer',
      name: 'Drömmande Hjort',
      description: 'Hjortar kan simma i upp till 15 km/h och korsa stora sjöar när de vandrar',
      filename: 'deer',
      bgColor: '#553C9A'
    },
    {
      id: 'alpaca',
      name: 'Alvin Alpaca',
      description: 'Alpackor nynnar mjuka melodier till varandra för att kommunicera och visa kärlek',
      filename: 'alpaca',
      bgColor: '#2C5282'
    },
    {
      id: 'panda',
      name: 'Peace Panda',
      description: 'En panda kan äta upp till 12 timmar om dagen och konsumera 12-15 kg bambu!',
      filename: 'panda',
      bgColor: '#276749'
    },
    {
      id: 'hippo',
      name: 'Happy Hippo',
      description: 'Flodhästar svettas en naturlig röd vätska som fungerar som solskydd och antibiotika',
      filename: 'hippo',
      bgColor: '#4C51BF'
    },
    {
      id: 'moose',
      name: 'Mighty Moose',
      description: 'Älgar kan hålla andan i upp till en minut under vatten medan de söker efter vattenväxter',
      filename: 'moose',
      bgColor: '#2F855A'
    }
  ];
  
  // Hjälpfunktioner för veganska avatarer
  export const getAvailableAvatars = (years: number, style: 'cute' | 'cool' = 'cute'): AvatarOption[] => {
    return AVATARS[style].filter(avatar => years >= (avatar.minYears || 0));
  };
  
  // Hjälpfunktioner för supporter avatarer
  export const getSupporterAvatars = (): SupporterAvatarOption[] => {
    return SUPPORTER_AVATARS;
  };
  
  export const getDefaultAvatar = (years: number, style: 'cute' | 'cool' = 'cute'): AvatarOption => {
    const available = getAvailableAvatars(years, style);
    return available[available.length - 1];
  };
  
  export const getDefaultSupporterAvatar = (): SupporterAvatarOption => {
    return SUPPORTER_AVATARS[0];
  };