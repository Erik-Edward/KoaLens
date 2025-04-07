import React, { useEffect, useState } from 'react';
import * as Updates from 'expo-updates';
import { View, Text, Alert, Platform } from 'react-native';

// Definiera ett interface med en callback som anropas när en uppdatering är klar
interface UpdateHandlerProps {
  onUpdateComplete?: () => void;
}

export const UpdateHandler: React.FC<UpdateHandlerProps> = ({ onUpdateComplete }) => {
  const [checking, setChecking] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  // Funktion för att kontrollera om det finns tillgängliga uppdateringar
  const checkForUpdates = async () => {
    // Undvik att köra i utvecklingsmiljö (expo start)
    if (__DEV__) {
      console.log('UpdateHandler: Kör i utvecklingsläge, hoppar över uppdateringskontroll');
      return;
    }

    try {
      setChecking(true);
      console.log('UpdateHandler: Kontrollerar efter uppdateringar...');
      
      const update = await Updates.checkForUpdateAsync();
      
      if (update.isAvailable) {
        setUpdateAvailable(true);
        console.log('UpdateHandler: Uppdatering hittad, hämtar...');
        
        try {
          await Updates.fetchUpdateAsync();
          console.log('UpdateHandler: Uppdatering hämtad, startar om...');
          
          // Visa en kort meddelande och starta om appen
          Alert.alert(
            "Uppdatering tillgänglig",
            "En uppdatering har laddats ner. Appen kommer nu att starta om för att tillämpa uppdateringen.",
            [
              { 
                text: "OK", 
                onPress: async () => {
                  try {
                    await Updates.reloadAsync();
                  } catch (reloadError) {
                    console.error('UpdateHandler: Fel vid omstart:', reloadError);
                  }
                }
              }
            ]
          );
        } catch (fetchError) {
          console.error('UpdateHandler: Fel vid hämtning av uppdatering:', fetchError);
        }
      } else {
        console.log('UpdateHandler: Ingen uppdatering hittad');
        if (onUpdateComplete) {
          onUpdateComplete();
        }
      }
    } catch (error) {
      console.error('UpdateHandler: Fel vid kontroll efter uppdateringar:', error);
    } finally {
      setChecking(false);
    }
  };

  // Automatisk kontroll av uppdateringar när komponenten renderas
  useEffect(() => {
    checkForUpdates();
    
    // I nyare Expo Updates (0.16+) har addListener ersatts av direkt anrop
    // utan event-hantering, så vi använder bara checkForUpdates direkt
    // Ingen lyssnare behövs längre
  }, []);

  // Denna komponent renderar inget synligt
  return null;
}; 