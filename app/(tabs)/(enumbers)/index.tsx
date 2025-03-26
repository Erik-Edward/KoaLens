import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, SafeAreaView, KeyboardAvoidingView, Platform, FlatList, Keyboard, StatusBar } from 'react-native';
import { NON_VEGAN_ENUMBERS, UNCERTAIN_ENUMBERS, ENumberStatus, VEGAN_ENUMBERS } from './e-number-database';
import { VEGAN_ENUMBERS_2 } from './e-number-database-2';
import { VEGAN_ENUMBERS_3 } from './e-number-database-3';
import { VEGAN_ENUMBERS_4 } from './e-number-database-4';
import { useNavigation } from 'expo-router';

// Färgkonstanter för E-nummer sidan
export const ENUMBER_HEADER_COLOR = '#1F3A3D';
export const ENUMBER_ACCENT_COLOR = '#4ECDC4';

interface ENumberMatch {
  id: string;
  name: string;
  description: string;
  status: ENumberStatus;
}

export default function ENumbersScreen() {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [result, setResult] = useState<{ name: string; description: string; status: ENumberStatus } | null>(null);
  const [isSearched, setIsSearched] = useState(false);
  const [displayedNumber, setDisplayedNumber] = useState('');
  const [matchingEnumbers, setMatchingEnumbers] = useState<ENumberMatch[]>([]);
  const [showMatches, setShowMatches] = useState(false);

  // StatusBar hantering - återställs när skärmen lämnas
  useEffect(() => {
    // Sätt StatusBar för denna skärm
    if (Platform.OS === 'android') {
      StatusBar.setBarStyle('light-content');
      StatusBar.setBackgroundColor(ENUMBER_HEADER_COLOR);
    }
    
    // Lyssna på när denna skärm får fokus för att återställa StatusBar
    const unsubscribeFocus = navigation.addListener('focus', () => {
      if (Platform.OS === 'android') {
        StatusBar.setBarStyle('light-content');
        StatusBar.setBackgroundColor(ENUMBER_HEADER_COLOR);
      }
    });
    
    return () => {
      unsubscribeFocus();
    };
  }, [navigation]);

  const handleSearch = () => {
    // Stäng tangentbordet när sökning görs
    Keyboard.dismiss();
    
    // Normalisera sökningen: ta bort mellanslag och eventuell inledande "E" eller "e"
    let searchText = searchQuery.trim().replace(/^[eE]/, '');
    
    // Om sökningen är tom, visa inget resultat
    if (!searchText) {
      setResult(null);
      setIsSearched(false);
      setShowMatches(false);
      return;
    }
    
    // Kontrollera om sökningen bara innehåller siffror
    if (/^\d+$/.test(searchText)) {
      // Leta efter alla E-nummer som börjar med dessa siffror
      const matches: ENumberMatch[] = [];
      
      // Funktion för att kontrollera matchningar i en databas
      const checkDatabase = (database: any, status: ENumberStatus) => {
        Object.keys(database).forEach(key => {
          // Förbättrad regex-matchning för att exakt matcha E-nummersekvenser
          // Matchar E följt av exakt de sökta siffrorna, följt av antingen bokstav eller slutet av strängen
          const regex = new RegExp(`^E${searchText}([a-zA-Z]*)$`);
          if (regex.test(key)) {
            matches.push({
              id: key,
              name: database[key].name,
              description: database[key].description,
              status: status
            });
          }
        });
      };
      
      // Kontrollera alla databaser
      checkDatabase(NON_VEGAN_ENUMBERS, 'non-vegan');
      checkDatabase(UNCERTAIN_ENUMBERS, 'uncertain');
      checkDatabase(VEGAN_ENUMBERS, 'vegan');
      checkDatabase(VEGAN_ENUMBERS_2, 'vegan');
      checkDatabase(VEGAN_ENUMBERS_3, 'vegan');
      checkDatabase(VEGAN_ENUMBERS_4, 'vegan');
      
      // Om vi har mer än en matchning, visa listan
      if (matches.length > 1) {
        setMatchingEnumbers(matches);
        setShowMatches(true);
        setIsSearched(false);
        return;
      }
      // Om vi bara har en matchning, visa den direkt
      else if (matches.length === 1) {
        const match = matches[0];
        setResult({
          name: match.name,
          description: match.description,
          status: match.status
        });
        setDisplayedNumber(match.id.substring(1)); // Ta bort E-prefixet
        setIsSearched(true);
        setShowMatches(false);
        return;
      }
    }
    
    // Om vi kommer hit, försök med exakt matchning
    const exactSearch = () => {
      // Extrahera sifferdelen och eventuell bokstavsdel
      const matches = searchText.match(/^(\d+)([a-zA-Z]*)$/);
      
      if (!matches) {
        // Om det inte matchar formatet, sätt result till null
        setResult(null);
        setIsSearched(true);
        setShowMatches(false);
        setDisplayedNumber(searchText);
        return;
      }
      
      const numericPart = matches[1];
      const letterPart = matches[2].toLowerCase();
      
      // Skapa E-numret i rätt format
      const formattedQuery = 'E' + numericPart + (letterPart ? letterPart : '');
      
      // Spara för visning
      setDisplayedNumber(numericPart + (letterPart ? letterPart : ''));
      
      // Kontrollera först NON_VEGAN_ENUMBERS
      if (NON_VEGAN_ENUMBERS[formattedQuery]) {
        setResult({
          name: NON_VEGAN_ENUMBERS[formattedQuery].name,
          description: NON_VEGAN_ENUMBERS[formattedQuery].description,
          status: 'non-vegan'
        });
        setIsSearched(true);
        setShowMatches(false);
        return;
      }
      
      // Kontrollera sedan UNCERTAIN_ENUMBERS
      if (UNCERTAIN_ENUMBERS[formattedQuery]) {
        setResult({
          name: UNCERTAIN_ENUMBERS[formattedQuery].name,
          description: UNCERTAIN_ENUMBERS[formattedQuery].description,
          status: 'uncertain'
        });
        setIsSearched(true);
        setShowMatches(false);
        return;
      }
      
      // Kontrollera alla VEGAN_ENUMBERS databaser
      if (VEGAN_ENUMBERS[formattedQuery]) {
        setResult({
          name: VEGAN_ENUMBERS[formattedQuery].name,
          description: VEGAN_ENUMBERS[formattedQuery].description,
          status: 'vegan'
        });
        setIsSearched(true);
        setShowMatches(false);
        return;
      }
      
      if (VEGAN_ENUMBERS_2[formattedQuery]) {
        setResult({
          name: VEGAN_ENUMBERS_2[formattedQuery].name,
          description: VEGAN_ENUMBERS_2[formattedQuery].description,
          status: 'vegan'
        });
        setIsSearched(true);
        setShowMatches(false);
        return;
      }
      
      if (VEGAN_ENUMBERS_3[formattedQuery]) {
        setResult({
          name: VEGAN_ENUMBERS_3[formattedQuery].name,
          description: VEGAN_ENUMBERS_3[formattedQuery].description,
          status: 'vegan'
        });
        setIsSearched(true);
        setShowMatches(false);
        return;
      }
      
      if (VEGAN_ENUMBERS_4[formattedQuery]) {
        setResult({
          name: VEGAN_ENUMBERS_4[formattedQuery].name,
          description: VEGAN_ENUMBERS_4[formattedQuery].description,
          status: 'vegan'
        });
        setIsSearched(true);
        setShowMatches(false);
        return;
      }
      
      // Om ingen träff, sätt result till null
      setResult(null);
      setIsSearched(true);
      setShowMatches(false);
    };
    
    exactSearch();
  };

  const selectEnumber = (item: ENumberMatch) => {
    setResult({
      name: item.name,
      description: item.description,
      status: item.status
    });
    setDisplayedNumber(item.id.substring(1)); // Ta bort E-prefixet
    setIsSearched(true);
    setShowMatches(false);
  };

  const getResultColor = () => {
    if (!result) return '#757575'; // Grå för inga resultat
    switch (result.status) {
      case 'vegan':
        return '#4CAF50'; // Grön för veganska
      case 'non-vegan':
        return '#F44336'; // Röd för icke-veganska
      case 'uncertain':
        return '#FF9800'; // Orange för osäkra
      default:
        return '#757575'; // Grå som standard
    }
  };

  const getStatusColor = (status: ENumberStatus) => {
    switch (status) {
      case 'vegan':
        return '#4CAF50'; // Grön för veganska
      case 'non-vegan':
        return '#F44336'; // Röd för icke-veganska
      case 'uncertain':
        return '#FF9800'; // Orange för osäkra
      default:
        return '#757575'; // Grå som standard
    }
  };

  const getResultText = () => {
    if (!result) return 'Inget E-nummer hittades';
    
    switch (result.status) {
      case 'vegan':
        return 'Veganskt';
      case 'non-vegan':
        return 'Ej veganskt';
      case 'uncertain':
        return 'Osäker vegansk status';
      default:
        return 'Okänd status';
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <SafeAreaView style={styles.headerSafeArea}>
            <Text style={styles.header}>E-nummer Sökning</Text>
            <Text style={styles.subheader}>Sök efter E-nummer för att kontrollera vegansk status</Text>
          </SafeAreaView>
        </View>
        
        <View style={styles.searchContainer}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputPrefix}>E-</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="100, 150, 901..."
              placeholderTextColor="#888888"
              value={searchQuery}
              onChangeText={setSearchQuery}
              keyboardType="numeric"
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />
          </View>
          <TouchableOpacity
            style={styles.searchButton}
            onPress={handleSearch}
          >
            <Text style={styles.searchButtonText}>Sök</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView 
          style={styles.resultContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.resultContentContainer}
        >
          {showMatches && (
            <View style={styles.matchesContainer}>
              <Text style={styles.matchesTitle}>Flera E-nummer hittades:</Text>
              <Text style={styles.matchesSubtitle}>Tryck på ett E-nummer för mer information</Text>
              {matchingEnumbers.map((item) => (
                <TouchableOpacity 
                  key={item.id} 
                  style={[styles.matchItem, { borderLeftColor: getStatusColor(item.status) }]}
                  onPress={() => selectEnumber(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.matchItemContent}>
                    <Text style={styles.matchItemTitle}>{item.id}: {item.name}</Text>
                    <Text style={[styles.matchItemStatus, { color: getStatusColor(item.status) }]}>
                      {item.status === 'vegan' ? 'Vegansk' : 
                       item.status === 'non-vegan' ? 'Ej vegansk' : 'Osäker'}
                    </Text>
                  </View>
                  <View style={styles.matchItemIcon}>
                    <Text style={styles.arrowIcon}>›</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
          
          {isSearched && (
            <View style={[styles.resultBox, { borderColor: getResultColor() }]}>
              <Text style={[styles.resultStatus, { color: getResultColor() }]}>
                {getResultText()}
              </Text>
              {result ? (
                <>
                  <Text style={styles.resultTitle}>{'E' + displayedNumber}: {result.name}</Text>
                  <Text style={styles.resultDescription}>{result.description}</Text>
                  
                  {result.status === 'uncertain' && (
                    <Text style={styles.uncertainNote}>
                      Vi rekommenderar att du kontaktar tillverkaren för att få ett säkert svar på om det är veganskt.
                    </Text>
                  )}
                </>
              ) : (
                <Text style={styles.noResultText}>
                  Vi hittade inte detta E-nummer i vår databas. Kontrollera att du angivit rätt nummer.
                </Text>
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  headerContainer: {
    backgroundColor: '#1F3A3D', // Mörk grönblå/teal färg
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
    paddingBottom: 20,
    marginTop: 0,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerSafeArea: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 45 : 55,
    paddingBottom: 15,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  subheader: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  searchContainer: {
    flexDirection: 'row',
    margin: 24,
    marginTop: Platform.OS === 'android' ? 200 : 220,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    height: 50,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4ECDC4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
    alignItems: 'center',
  },
  inputPrefix: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4ECDC4',
    paddingLeft: 16,
    paddingRight: 4,
  },
  searchInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#ffffff',
    paddingRight: 12,
  },
  searchButton: {
    backgroundColor: '#2A5459', // Mörkare teal/grön som matchar headern
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 16,
    marginLeft: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  searchButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  resultContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  resultContentContainer: {
    paddingBottom: 40,
  },
  resultBox: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 20,
    borderLeftWidth: 4,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  resultStatus: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    color: '#ffffff',
  },
  resultDescription: {
    fontSize: 16,
    color: '#cccccc',
    lineHeight: 24,
    marginBottom: 12,
  },
  uncertainNote: {
    fontSize: 15,
    fontStyle: 'italic',
    color: '#FFA726',
    lineHeight: 22,
    marginTop: 10,
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    borderRadius: 6,
    padding: 12,
  },
  noResultText: {
    fontSize: 16,
    color: '#cccccc',
    lineHeight: 24,
  },
  matchesContainer: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  matchesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#ffffff',
  },
  matchesSubtitle: {
    fontSize: 16,
    color: '#aaaaaa',
    marginBottom: 16,
  },
  matchItem: {
    padding: 14,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#2a2a2a',
    borderLeftWidth: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  matchItemContent: {
    flex: 1,
  },
  matchItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
    marginBottom: 4,
  },
  matchItemStatus: {
    fontSize: 14,
    fontWeight: '500',
  },
  matchItemIcon: {
    marginLeft: 8,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowIcon: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4ECDC4', // Ljusare teal/turkos för kontrast
  }
}); 