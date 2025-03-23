# Counter Implementation för KoaLens

Detta dokument beskriver den nya implementationen av ett system för räknare (counters) i KoaLens-projektet, som ersätter det problematiska analys-räknarsystemet.

## Översikt

Det nya systemet använder en mer robust datamodell där varje användare kan ha flera olika typier av räknare. Varje räknare har information om värde, gräns, återställningsfrekvens etc. Detta ger större flexibilitet och gör det lättare att implementera olika typer av begränsningar i framtiden.

## Datamodell

Huvudtabellen i Supabase är `user_counters` med följande struktur:

```
user_counters
│
├── id: UUID (primary key)
├── user_id: UUID (foreign key -> auth.users)
├── counter_name: TEXT (t.ex. 'analysis_count')
├── counter_value: INTEGER (aktuellt värde)
├── counter_limit: INTEGER (gräns för räknaren)
├── is_limited: BOOLEAN (om räknaren har en gräns)
├── reset_frequency: TEXT ('daily', 'weekly', 'monthly', 'never')
├── last_reset: TIMESTAMP WITH TIME ZONE
├── next_reset: TIMESTAMP WITH TIME ZONE
├── created_at: TIMESTAMP WITH TIME ZONE
└── updated_at: TIMESTAMP WITH TIME ZONE
```

En användare kan ha flera räknare, t.ex. `analysis_count`, `product_submissions` etc., vilket ger stor flexibilitet.

## Stored Procedures

### Skapa eller uppdatera räknare:

När en räknare efterfrågas som inte finns, skapas den automatiskt med defaultvärden:
- `counter_value: 0`
- `counter_limit: 5`
- `is_limited: true`
- `reset_frequency: 'monthly'`

### Inkrementera räknare:

Funktionen `increment_counter(user_id, counter_name, increment)` ökar en räknare och hanterar:
- Skapande av räknaren om den inte finns
- Kontroll om räknaren behöver återställas baserat på nästa återställningsdatum
- Beräkning av återstående värden före gränsen

### Hämta räknare:

Funktionen `get_counter(user_id, counter_name)` hämtar information om en räknare utan att öka den, och hanterar:
- Skapande av räknaren om den inte finns
- Kontroll om räknaren behöver återställas baserat på nästa återställningsdatum

## Row-Level Security

Tabellen har strikt RLS-policy:
- Användare kan bara läsa sina egna räknare
- Användare kan inte direkt uppdatera, infoga eller ta bort räknare
- Alla ändringar måste ske via de lagrade procedurerna

## Backend API

API-endpoints i backend:

- `GET /api/counters/:userId/:counterName` - Hämta information om en räknare
- `POST /api/counters/:userId/:counterName/increment` - Öka en räknare
- `GET /api/counters/:userId/:counterName/limit` - Kontrollera om en användare har nått sin gräns

## Frontend Hook

En ny React hook, `useCounter`, ger ett enkelt gränssnitt för att arbeta med räknare:

```typescript
// Exempel på användning
const {
  value,            // Aktuellt värde
  limit,            // Max-gräns
  remaining,        // Återstående värde före gränsen
  hasReachedLimit,  // Om gränsen är nådd
  loading,          // Om data laddas
  
  fetchCounter,      // Funktion för att hämta räknardata
  incrementCounter,  // Funktion för att öka räknaren
  canPerformOperation, // Kontrollera om en operation kan utföras
  
  // För bakåtkompatibilitet med useAnalytics
  recordAnalysis,    // Alias för incrementCounter(1)
  checkLimit         // Alias för canPerformOperation
} = useCounter('analysis_count');
```

Hooken använder caching för att minska antalet API-anrop och optimistic updates för bättre användargränssnitt.

## Migrationsplan

1. Skapa den nya tabellen och stored procedures i Supabase
2. Implementera den nya counterService i backend
3. Uppdatera server.ts för att använda de nya API-endpoints
4. Implementera useCounter hook i frontend
5. Uppdatera komponenter för att använda den nya hooken
6. Testa att allt fungerar
7. Ta bort det gamla systemet (user_analytics-tabell, gamla endpoints, etc.)

## Fördelar med det nya systemet

1. **Flexibilitet**: Kan hantera olika typer av räknare för olika begränsningar
2. **Robusthet**: Bättre felhantering och automatisk återställning
3. **Prestanda**: Effektivare datamodell med indexerade fält
4. **Säkerhet**: Strikt RLS och användning av stored procedures
5. **Utökningsbarhet**: Enkelt att lägga till nya typer av räknare och begränsningar 