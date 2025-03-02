// utils/avatarUtils.ts - Uppdaterad med ekorre istället för grodd och kortare beskrivningstexter
import { AvatarStyle } from '@/stores/slices/createAvatarSlice';
import { VeganStatus } from '@/stores/slices/createVeganStatusSlice';
import { useStore } from '@/stores/useStore';

export interface AvatarOption {
  id: string;
  name: string;
  description: string;
  filename: string;
  style: AvatarStyle;
  minYears?: number;
}

// Supporter (icke-veganska) avatarer med kortare fakta
const SUPPORTER_AVATARS: AvatarOption[] = [
  {
    id: 'gorilla',
    name: 'Gorilla',
    description: 'Kan lära sig teckenspråk och använder verktyg för att lösa problem i naturen.',
    filename: 'gorilla',
    style: 'supporter'
  },
  {
    id: 'cow',
    name: 'Ko',
    description: 'Extremt sociala som bygger långvariga vänskaper och kan känna igen över 100 andra kor.',
    filename: 'cow',
    style: 'supporter'
  },
  {
    id: 'ostrich',
    name: 'Struts',
    description: 'Världens snabbaste tvåbenta djur som kan springa i 70 km/h.',
    filename: 'ostrich',
    style: 'supporter'
  },
  {
    id: 'giraffe',
    name: 'Giraff',
    description: 'Har bara sju halskotor, precis som människor, trots sin långa hals.',
    filename: 'giraffe',
    style: 'supporter'
  },
  {
    id: 'deer',
    name: 'Rådjur',
    description: 'Kan rotera öronen 180 grader utan att röra på huvudet.',
    filename: 'deer',
    style: 'supporter'
  },
  {
    id: 'alpaca',
    name: 'Alpacka',
    description: 'Nynnar för att kommunicera och använder 20 olika ljud för att uttrycka känslor.',
    filename: 'alpaca',
    style: 'supporter'
  },
  {
    id: 'panda',
    name: 'Panda',
    description: 'Har en "extra tumme" som hjälper dem att greppa bambu.',
    filename: 'panda',
    style: 'supporter'
  },
  {
    id: 'hippo',
    name: 'Flodhäst',
    description: '"Svettas" röd olja som fungerar som naturlig solkräm.',
    filename: 'hippo',
    style: 'supporter'
  },
  {
    id: 'moose',
    name: 'Älg',
    description: 'Kan dyka ner till 6 meters djup för att äta vattenväxter.',
    filename: 'moose',
    style: 'supporter'
  }
];

// Veganska avatarer med kortare fakta
const VEGAN_AVATARS: AvatarOption[] = [
  {
    id: 'squirrel',
    name: 'Ekorre',
    description: 'Planterar träd när de glömmer var de gömt sina nötter.',
    filename: 'squirrel',
    style: 'cute',
    minYears: 0
  },
  {
    id: 'rabbit',
    name: 'Kanin',
    description: 'Gör "binkies" - hoppar upp och vrider kroppen när de är glada.',
    filename: 'rabbit',
    style: 'cute',
    minYears: 1
  },
  {
    id: 'koala',
    name: 'Koala',
    description: 'Sover upp till 20 timmar per dag för att spara energi.',
    filename: 'koala',
    style: 'cute',
    minYears: 2
  },
  {
    id: 'turtle',
    name: 'Sköldpadda',
    description: 'Navigerar efter jordens magnetfält under långa resor över haven.',
    filename: 'turtle',
    style: 'cute',
    minYears: 3
  }
];

// Hämta tillgängliga avatarer baserat på antalet veganska år och vald stil
export function getAvailableAvatars(veganYears: number, style: AvatarStyle): AvatarOption[] {
  // Hämta veganStatus från store
  const veganStatus = useStore.getState().veganStatus.status;
  
  // Om användaren är supporter (icke-vegan), returnera supporter avatarer
  if (veganStatus === 'supporter') {
    return SUPPORTER_AVATARS;
  }
  
  // För veganska användare, filtrera baserat på antal veganska år
  return VEGAN_AVATARS
    .filter(avatar => (avatar.minYears === undefined || avatar.minYears <= veganYears))
    .map(avatar => ({
      ...avatar,
      style: style // Använd den valda stilen för veganska avatarer
    }));
}

// Hämta supporter-avatarer (oberoende av stil)
export function getSupporterAvatars(): AvatarOption[] {
  return SUPPORTER_AVATARS;
}