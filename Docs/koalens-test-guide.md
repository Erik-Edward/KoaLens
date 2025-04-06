# KoaLens Test Guide (Version April 2025 - Videoanalys)

Tack för att du testar KoaLens - appen som hjälper dig identifiera veganska produkter genom att **filma** ingredienslistor!

## Installation (Android)

1. **Ladda ner APK-filen:**
   - Öppna [denna länk](https://drive.google.com/file/d/XXXX) på din Android-enhet (LÄNK BEHÖVER UPPDATERAS)
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
   - Följ den guidade introduktionen (onboarding) för att lära dig appens funktioner.
   - Notera hur tydliga instruktionerna är för **videoanalys** (rikta kameran, panorera vid behov).

**Viktigt:** Varje konto har en gräns på **15 analyser per månad** i denna testversion.

## Huvudfunktioner att testa

### 1. Videoanalys av Ingredienslista

1. Tryck på kameraikonen i nedre menyn.
2. Rikta kameran mot en ingredienslista på en produkt. Håll telefonen **stående eller liggande** beroende på vad som passar bäst.
3. Tryck på **inspelningsknappen** för att starta analysen (appen spelar in en kort video).
4. **Panorera långsamt** över hela ingredienslistan om den är lång, så att all text fångas.
5. Appen analyserar automatiskt videon efter några sekunder.
6. Vänta tills analysen är klar och resultatskärmen visas.

### 2. Tolka resultat

- Se om produkten identifieras som vegansk eller inte
- Kontrollera att säkerhetsprocenten (confidence) är rimlig
- Granska listan över identifierade ingredienser (särskilt de som är markerade som icke-veganska eller osäkra)
- Testa att spara resultatet till historiken

### 3. E-nummer sökning

- Gå till E-nr fliken i nedre menyn (med förstoringsglas symbol)
- Sök på ett E-nummer, t.ex. "E120", "E440", "E1517", "E1518"
- Kontrollera att resultatet visar korrekt information om:
  * Om tillsatsen är vegansk, icke-vegansk eller osäker
  * Namn och beskrivning av tillsatsen
- Testa flera olika E-nummer
- Notera hur snabbt sökresultaten visas

### 4. Användningsgräns (Analysräknare)

- Kontrollera din återstående analyskvot på profilsidan (ska börja på 15/15 för nya konton)
- Se till att räknaren minskar korrekt efter varje lyckad analys
- **(Valfritt/Svårt att testa):** Om du når 0/15, verifiera att en modal visas som informerar om gränsen och att du inte kan starta en ny analys

### 5. Profil & Inställningar

- Gå till profilsidan
- Testa att byta avatar
- Testa att ändra din veganska status
- Verifiera att ändringarna sparas och visas korrekt

### 6. Historik

- Gå till historikfliken och bläddra bland dina sparade produkter
- Testa att markera produkter som favoriter
- Testa att filtrera dina produkter
- Testa att ta bort produkter från historiken

## Specifik feedback vi söker

Vi uppskattar all feedback, men är särskilt intresserade av:

1. **Videoanalysprocessen:** Hur upplevde du flödet från inspelning till resultat? Var instruktionerna tydliga? Fungerade panorering bra?
2. **Analysresultat:** Hur korrekta var analyserna för de produkter du testade? Hur användbara var förklaringarna?
3. **Analysräknaren:** Var informationen om återstående analyser tydlig? Stötte du på några problem relaterade till gränsen?
4. **E-nummerssökning:** Var informationen tydlig och hjälpsam?
5. **Allmän användarupplevelse:** Finns det någon funktion du saknar? Vad var bra? Vad kan förbättras? Kändes appen stabil?

## Rapportera problem

Om du stöter på problem, vänligen notera följande information:

1. Vilken Android-enhet och version använder du?
2. Vilken funktion testade du när problemet uppstod?
3. Steg för att återskapa problemet
4. Bifoga skärmdumpar eller skärminspelning om möjligt

Skicka feedback till: koalens.app@gmail.com

## Vanliga frågor

### Används min riktiga e-postadress?
Ja, men endast för testningen. Vi använder den inte för marknadsföring och delar inte din information med tredje part.

### Hur uppdaterar jag appen när en ny version finns?
Du får en ny APK-fil och installationsanvisningar via e-post (eller via EAS om det implementeras) när en ny version är tillgänglig.

### Har jag verkligen bara 15 analyser per månad?
Ja, testversionen har samma begränsningar som standardversionen kommer att ha vid lansering. Detta hjälper oss utvärdera hur användare hanterar denna gräns.

### Vad händer med mitt konto när testperioden är över?
Ditt konto kommer att finnas kvar, och du kan fortsätta använda det i den officiella versionen när den lanseras.

### Fungerar appen offline?
Appen kräver en internetanslutning för att **analysera** ingredienser via video. E-nummersökningen fungerar helt offline. Du kan inte spara en video offline för senare analys i den nuvarande versionen.

---

Tack för din hjälp med att förbättra KoaLens! Din feedback är ovärderlig för oss.
