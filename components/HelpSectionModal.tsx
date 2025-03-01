// components/HelpSectionModal.tsx
import React, { useState } from 'react';
import { View, Text, Modal, Pressable, ScrollView } from 'react-native';
import { styled } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { logEvent } from '@/lib/analytics';
import { SUPPORT_EMAIL } from '@/constants/config';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledPressable = styled(Pressable);
const StyledScrollView = styled(ScrollView);

interface HelpSectionModalProps {
  visible: boolean;
  onClose: () => void;
}

// FAQ-struktur med frågor och svar
const FAQ_ITEMS = [
  {
    question: 'Hur fungerar KoaLens?',
    answer: 'KoaLens använder artificiell intelligens för att analysera bilder av ingredienslistor. När du tar en bild med appen, skickas den till vår server där Claude-Vision AI analyserar ingredienserna och avgör om produkten är vegansk baserat på innehållet.',
  },
  {
    question: 'Hur pålitlig är KoaLens analys?',
    answer: 'KoaLens ger en procentuell tillförlitlighet för varje analys. Vi rekommenderar alltid att du granskar ingredienslistan själv, särskilt om tillförlitligheten är under 90%. Vissa ingredienser kan vara svårtolkade eller ha olika ursprung.',
  },
  {
    question: 'Kan jag använda KoaLens offline?',
    answer: 'Ja, med begränsad funktionalitet. KoaLens kan ta bilder medan du är offline, men analysen utförs när du återansluter till internet. Bilder sparas i en kö och analyseras automatiskt när du får internetanslutning igen.',
  },
  {
    question: 'Hur lägger jag till bevakade ingredienser?',
    answer: 'Gå till "Inställningar" i profilfliken. Där kan du aktivera bevakning av specifika ingredienser som du vill ha extra koll på, till exempel palmolja eller soja.',
  },
  {
    question: 'Varför visas ingen historik?',
    answer: 'Historiken lagras lokalt på din enhet. Om du har bytt enhet eller raderat appen syns inga tidigare skanningar. Du kan också ha aktiverat "Visa bara favoriter", prova att inaktivera det filtret.',
  },
  {
    question: 'Hur kan jag ändra min avatar?',
    answer: 'Tryck på din avatar på profilsidan för att öppna avatar-väljaren. Där kan du välja mellan olika djurteman och stilar.',
  },
  {
    question: 'Vad gör jag om bilden blir suddig?',
    answer: 'Se till att hålla telefonen stilla och ha bra belysning. KoaLens har beskärningsverktyg som du kan använda för att justera bilden innan analys. Du kan också ta en ny bild om den första inte blev bra.',
  },
  {
    question: 'Fungerar KoaLens med alla språk?',
    answer: 'Ja, KoaLens kan analysera ingredienslistor på alla språk, inklusive asiatiska och andra icke-latinska språk. Vissa ovanliga språk kan ha något lägre tillförlitlighet.',
  },
  {
    question: 'Finns KoaLens för iOS?',
    answer: 'KoaLens finns för närvarande på Android. Vi jobbar på en iOS-version som kommer att lanseras senare i år.',
  },
];

export const HelpSectionModal: React.FC<HelpSectionModalProps> = ({ visible, onClose }) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleExpand = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Logga händelse när en FAQ expanderas
    if (expandedIndex !== index) {
      logEvent('help_faq_opened', {
        faq_index: index,
        faq_question: FAQ_ITEMS[index].question
      });
    }
    
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <StyledView className="flex-1 justify-end bg-black/70">
        <StyledView className="bg-background-main rounded-t-3xl h-5/6">
          {/* Header */}
          <StyledView className="flex-row justify-between items-center p-6 border-b border-background-light">
            <StyledText className="text-text-primary font-sans-bold text-xl">
              Hjälp & Vanliga Frågor
            </StyledText>
            <StyledPressable
              onPress={onClose}
              className="w-10 h-10 rounded-full bg-background-light/50 items-center justify-center"
            >
              <Ionicons name="close" size={24} color="#fff" />
            </StyledPressable>
          </StyledView>

          {/* FAQ List */}
          <StyledScrollView className="flex-1 px-6 pt-2 pb-4">
            <StyledText className="text-text-secondary font-sans mb-4">
              Hitta svar på vanliga frågor om KoaLens nedan. Om du har fler frågor, använd feedbackformuläret för att kontakta oss.
            </StyledText>
            
            {FAQ_ITEMS.map((item, index) => (
              <StyledView 
                key={index} 
                className="mb-4"
              >
                <StyledPressable
                  onPress={() => toggleExpand(index)}
                  className={`flex-row items-center justify-between bg-background-light/40 p-4 rounded-t-lg ${
                    expandedIndex === index ? '' : 'rounded-b-lg'
                  }`}
                >
                  <StyledText className="text-text-primary font-sans-medium flex-1 text-base pr-4">
                    {item.question}
                  </StyledText>
                  <Ionicons
                    name={expandedIndex === index ? 'chevron-up' : 'chevron-down'}
                    size={22}
                    color="#ffffff"
                  />
                </StyledPressable>
                
                {expandedIndex === index && (
                  <StyledView className="bg-background-light/20 p-4 rounded-b-lg">
                    <StyledText className="text-text-secondary font-sans leading-relaxed">
                      {item.answer}
                    </StyledText>
                  </StyledView>
                )}
              </StyledView>
            ))}
            
            {/* Support contact information at the bottom */}
            <StyledView className="mt-2 mb-8 bg-primary/10 p-4 rounded-lg">
              <StyledText className="text-primary font-sans-medium mb-2">
                Behöver du mer hjälp?
              </StyledText>
              <StyledText className="text-text-secondary font-sans leading-relaxed">
                Kontakta oss på {SUPPORT_EMAIL} om du har frågor som inte besvaras här.
              </StyledText>
            </StyledView>
          </StyledScrollView>
        </StyledView>
      </StyledView>
    </Modal>
  );
};