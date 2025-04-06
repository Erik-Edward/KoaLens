# MVP Testning och Deployment Plan

Detta dokument beskriver stegen för att testa och deploya KoaLens-appen inför MVP-lansering, med fokus på att säkerställa stabilitet, UI-konsistens och korrekt backend-funktionalitet.

## Mål

Verifiera att appen fungerar stabilt och konsekvent över olika enheter och med en live backend-miljö, redo för en MVP-release.

## Test- och Deploymentssteg

1.  **Testa på Virtuella Enheter (Android Studio)**
    *   **Syfte:** Säkerställa UI/UX, layout och design-konsistens över olika skärmstorlekar, upplösningar och densiteter.
    *   **Fokus:** Layout, textbrytning, elementpositionering, grundläggande navigation (exklusive kamera/analys).
    *   **Verktyg:** Android Studio Emulator med olika virtuella enheter.
    *   **Resultat:** Identifiera och åtgärda UI/layout-buggar.

2.  **Förbered och Deploya Backend (Fly.io)**
    *   **Syfte:** Gå från lokal utvecklingsmiljö till en live, deployad backend för realistisk testning och verifiering av konfiguration.
    *   **Åtgärder:**
        *   Verifiera `fly.toml` och säkerställ att alla nödvändiga miljövariabler/secrets för den nuvarande backend-versionen (inkl. Gemini API-nyckel, Supabase-anslutning etc.) är korrekt inställda i Fly.io.
        *   Utför deploy till Fly.io (`fly deploy`).
        *   Verifiera att deployen lyckades och att backend-tjänsten körs.
    *   **Resultat:** En fungerande backend deployad på Fly.io.

3.  **Testa med Deployad Backend (Fysisk Enhet)**
    *   **Syfte:** Validera appens fulla funktionalitet och prestanda mot den live backend-miljön. Detta är det mest kritiska testet.
    *   **Fokus:**
        *   Hela videoanalysflödet (inspelning -> anrop -> resultat).
        *   Analysräknarens funktion (gränskontroll, modal vid gräns, uppdatering efter analys, initialt värde 15/15).
        *   Felhantering (nätverksfel, API-timeouts, felaktiga resultat).
        *   Prestanda och latens jämfört med lokal miljö.
        *   Allmän stabilitet.
    *   **Verktyg:** Fysisk(a) Android-enhet(er) konfigurerad(e) att ansluta till den deployade backend-URL:en.
    *   **Resultat:** En grundligt testad applikation som fungerar korrekt mot live-backend.

## Slutsats

Efter att dessa steg har genomförts och eventuella problem åtgärdats, bör applikationen vara i ett tillstånd som är lämpligt för en MVP-release.