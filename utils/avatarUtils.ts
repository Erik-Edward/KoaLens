// utils/avatarUtils.ts - Uppdaterad med ekorre istället för grodd
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

// Supporter (icke-veganska) avatarer med intressanta fakta
const SUPPORTER_AVATARS: AvatarOption[] = [
  {
    id: 'gorilla',
    name: 'Gorilla',
    description: 'Visste du att gorillor kan lära sig teckenspråk och kommunicera med människor? De använder också verktyg i naturen.',
    filename: 'gorilla',
    style: 'supporter'
  },
  {
    id: 'cow',
    name: 'Ko',
    description: 'Kor är extremt sociala och bygger livslånga vänskaper. De kan känna igen över 100 andra kor och blir stressade när de separeras från sina vänner.',
    filename: 'cow',
    style: 'supporter'
  },
  {
    id: 'ostrich',
    name: 'Struts',
    description: 'Strutsar är världens snabbaste tvåbenta djur och kan springa i 70 km/h. Deras ögon är större än deras hjärnor!',
    filename: 'ostrich',
    style: 'supporter'
  },
  {
    id: 'giraffe',
    name: 'Giraff',
    description: 'Giraffer har samma antal halskotor som människor - bara sju! Deras tungor kan vara upp till 50 cm långa och är blå-svarta för att skydda mot solbränna.',
    filename: 'giraffe',
    style: 'supporter'
  },
  {
    id: 'deer',
    name: 'Rådjur',
    description: 'Rådjur kan höra frekvenser långt bortom mänsklig hörsel. De kan också rotera öronen 180 grader utan att flytta på huvudet!',
    filename: 'deer',
    style: 'supporter'
  },
  {
    id: 'alpaca',
    name: 'Alpacka',
    description: 'Alpackor nynnar för att kommunicera. De använder 20 olika ljud tillsammans med kroppsspråk för att uttrycka sina känslor.',
    filename: 'alpaca',
    style: 'supporter'
  },
  {
    id: 'panda',
    name: 'Panda',
    description: 'Pandor har en "extra tumme" som hjälper dem att greppa bambu. Trots att de är klassade som rovdjur består 99% av deras diet av växter!',
    filename: 'panda',
    style: 'supporter'
  },
  {
    id: 'hippo',
    name: 'Flodhäst',
    description: 'Flodhästar "svettas" en röd olja som fungerar som naturlig solkräm. Trots sin storlek kan de springa fortare än en människa på land!',
    filename: 'hippo',
    style: 'supporter'
  },
  {
    id: 'moose',
    name: 'Älg',
    description: 'Älgar kan dyka ner till 6 meters djup för att äta vattenväxter. En älgtjurs horn kan väga upp till 35 kg - lika mycket som en 10-åring!',
    filename: 'moose',
    style: 'supporter'
  }
];

// Veganska avatarer med intressanta fakta
const VEGAN_AVATARS: AvatarOption[] = [
  {
    id: 'squirrel',
    name: 'Ekorre',
    description: 'Ekorrar kan komma ihåg tusentals gömställen för nötter! De planterar omedvetet nya träd när de glömmer var de gömt vissa nötter.',
    filename: 'squirrel',
    style: 'cute',
    minYears: 0
  },
  {
    id: 'rabbit',
    name: 'Kanin',
    description: 'När kaniner är extra glada gör de "binkies" - de hoppar upp i luften och vrider kroppen! De har också 360-graders synfält utan att behöva vända på huvudet.',
    filename: 'rabbit',
    style: 'cute',
    minYears: 1
  },
  {
    id: 'koala',
    name: 'Koala',
    description: 'Koalor har fingeravtryck som är nästan identiska med människors. De sover upp till 20 timmar per dag för att spara energi från sin näringsfattiga diet.',
    filename: 'koala',
    style: 'cute',
    minYears: 2
  },
  {
    id: 'turtle',
    name: 'Sköldpadda',
    description: 'Vissa sköldpaddor kan andas genom sin bakdel! Havssköldpaddor kan också känna jordens magnetfält och navigerar efter det under långa resor.',
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