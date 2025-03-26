# KoaLens Test Guide

Tack för att du testar KoaLens - appen som hjälper dig identifiera veganska produkter genom att scanna ingredienslistor!

## Installation (Android)

1. **Ladda ner APK-filen:**
   - Öppna [denna länk](https://drive.google.com/file/d/XXXX) på din Android-enhet
   - Klicka på nedladdningsknappen för att hämta filen

2. **Aktivera installation från okända källor:**
   - Öppna Inställningar på din enhet
   - Gå till "Säkerhet" eller "Appar & notiser" (varierar beroende på Android-version)
   - Aktivera "Installera från okända källor" eller "Installera okända appar"
   - Om du uppmanas att välja en app, välj "Google Drive" eller "Filhanterare"

3. **Installera appen:**
   - Öppna den nedladdade APK-filen
   - Följ instruktionerna på skärmen för att slutföra installationen
   - När installationen är klar, hitta "KoaLens" i din applista

![Installation Guide](https://i.imgur.com/PLACEHOLDER.png)

## Registrering och onboarding

1. **Skapa ett konto:**
   - Öppna appen och följ introduktionsguiden
   - Välj "Skapa konto" när du uppmanas att logga in
   - Använd din egen e-postadress och välj ett lösenord
   - Välj din avatar och statusnivå som vegansk

2. **Första användningen:**
   - Följ den guidade introduktionen för att lära dig appens funktioner
   - Notera hur tydliga instruktionerna är och om något känns oklart

**Viktigt:** Varje konto har en gräns på 15 analyser per månad i denna testversion.

## Huvudfunktioner att testa

### 1. Scanna ingredienslista

1. Tryck på kameraikonen i nedre menyn
2. Rikta kameran mot en ingredienslista på en produkt
3. Tap-to-focus om det behövs
4. Klicka på knappen för att ta ett foto
5. Använd beskärningsverktyget för att markera ingredienslistan
6. Vänta medan appen analyserar ingredienserna

![Scanning Example](https://i.imgur.com/PLACEHOLDER2.png)

### 2. Tolka resultat

- Se om produkten identifieras som vegansk eller inte
- Kontrollera att säkerhetsprocenten (confidence) är rimlig
- Granska listan över identifierade ingredienser
- Testa att spara resultatet till historiken

### 3. E-nummer sökning (NY FUNKTION)

- Gå till E-nr fliken i nedre menyn (med förstoringsglas symbol)
- Sök på ett E-nummer, t.ex. "E120" eller "E440"
- Kontrollera att resultatet visar korrekt information om:
  * Om tillsatsen är vegansk, icke-vegansk eller osäker
  * Namn och beskrivning av tillsatsen
- Testa flera olika E-nummer för att se variationer i resultat
- Notera hur snabbt sökresultaten visas

### 4. Testa delningsfunktionen

- På resultatskärmen, klicka på delningsikonen
- Välj vilken app du vill dela resultatet genom
- Verifiera att delningen innehåller korrekt information:
  * Vegansk/icke-vegansk status
  * Säkerhetsprocent
  * Ingredienslista
  * Analysbeskrivning

### 5. Hantera sparade produkter

- Gå till historikfliken och bläddra bland dina sparade produkter
- Testa att markera produkter som favoriter
- Testa att filtrera dina produkter
- Testa att ta bort produkter från historiken

## Specifik feedback vi söker

Vi uppskattar all feedback, men är särskilt intresserade av:

1. **Registreringsprocessen:** Hur upplevde du den? Var något otydligt eller svårt?

2. **E-nummerssökning:** Hur användbar är den nya funktionen för att söka efter E-nummer? Var informationen tydlig och hjälpsam?

3. **Delningsfunktionen:** Hur fungerade delningsfunktionen? Var den intuitiv?

4. **Analysresultat:** Hur korrekta var analyserna? Hur användbara var förklaringarna?

5. **Allmän användarupplevelse:** Finns det någon funktion du saknar? Vad var bra? Vad kan förbättras?

## Rapportera problem

Om du stöter på problem, vänligen notera följande information:

1. Vilken Android-enhet och version använder du?
2. Vilken funktion testade du när problemet uppstod?
3. Steg för att återskapa problemet
4. Bifoga skärmdumpar om möjligt

Skicka feedback till: koalens.app@gmail.com

## Vanliga frågor

### Används min riktiga e-postadress?
Ja, men endast för testningen. Vi använder den inte för marknadsföring och delar inte din information med tredje part.

### Hur uppdaterar jag appen när en ny version finns?
Du får en ny APK-fil och installationsanvisningar via e-post när en ny version är tillgänglig.

### Har jag verkligen bara 15 analyser per månad?
Ja, testversionen har samma begränsningar som standardversionen. Detta hjälper oss utvärdera hur användare hanterar denna gräns.

### Vad händer med mitt konto när testperioden är över?
Ditt konto kommer att finnas kvar, och du kan fortsätta använda det i den officiella versionen när den lanseras.

### Fungerar appen offline?
Appen kräver en internetanslutning för att analysera ingredienser, men kan ta bilder offline som analyseras när du återansluter. E-nummerssökningen fungerar helt offline.

---

Tack för din hjälp med att förbättra KoaLens! Din feedback är ovärderlig för oss.
