/**
 * Analytics Service för att spåra användares analysanvändning
 * Denna klass hanterar lagringen och hämtningen av analysstatistik
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

// Analytics data model
export interface UserAnalytics {
  userId: string;
  currentPeriod: {
    startDate: string;
    endDate: string;
    totalAnalyses: number;
    limit: number;
  };
  historicalPeriods: {
    period: string;
    totalAnalyses: number;
  }[];
}

// Resultat av användningskontroll
export interface UsageCheckResult {
  allowed: boolean;
  reason?: string;
  remaining: number;
  total: number;
  limit: number;
  resetDate: string;
}

// Konstanter för AsyncStorage-nycklar
const STORAGE_KEYS = {
  USER_ANALYTICS_PREFIX: 'koalens_user_analytics_',
  PENDING_ANALYSES: 'koalens_pending_analyses'
};

// Default analysgräns per månad
const DEFAULT_MONTHLY_LIMIT = 15;

export class AnalyticsService {
  private static instance: AnalyticsService;
  
  // Använd singletonstmönster för att säkerställa en enda instans
  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }
  
  /**
   * Registrera en ny analys för användaren
   * @param userId Användar-ID
   * @returns Resultat med uppdaterad statistik
   */
  async recordAnalysis(userId: string): Promise<{
    success: boolean;
    currentCount: number;
    limit: number;
    remaining: number;
  }> {
    try {
      // Hämta nuvarande användaranalys
      const analytics = await this.getUserAnalytics(userId);
      
      // Uppdatera antal analyser för aktuell period
      analytics.currentPeriod.totalAnalyses += 1;
      
      // Spara uppdaterad analys
      await this.saveUserAnalytics(analytics);
      
      // Försök synkronisera med Supabase om tillgängligt
      this.syncWithSupabase(analytics).catch(error => {
        console.error('Fel vid synkronisering med Supabase:', error);
      });
      
      return {
        success: true,
        currentCount: analytics.currentPeriod.totalAnalyses,
        limit: analytics.currentPeriod.limit,
        remaining: Math.max(0, analytics.currentPeriod.limit - analytics.currentPeriod.totalAnalyses)
      };
    } catch (error) {
      console.error('Fel vid registrering av analys:', error);
      return {
        success: false,
        currentCount: 0,
        limit: DEFAULT_MONTHLY_LIMIT,
        remaining: DEFAULT_MONTHLY_LIMIT
      };
    }
  }
  
  /**
   * Hämta användarens nuvarande analysstatistik
   * @param userId Användar-ID
   * @returns Information om användarens nuvarande användning
   */
  async getCurrentStatus(userId: string): Promise<{
    currentCount: number;
    limit: number;
    remaining: number;
    resetDate: string;
  }> {
    try {
      const analytics = await this.getUserAnalytics(userId);
      
      return {
        currentCount: analytics.currentPeriod.totalAnalyses,
        limit: analytics.currentPeriod.limit,
        remaining: Math.max(0, analytics.currentPeriod.limit - analytics.currentPeriod.totalAnalyses),
        resetDate: analytics.currentPeriod.endDate
      };
    } catch (error) {
      console.error('Fel vid hämtning av nuvarande status:', error);
      return {
        currentCount: 0,
        limit: DEFAULT_MONTHLY_LIMIT,
        remaining: DEFAULT_MONTHLY_LIMIT,
        resetDate: this.getEndOfMonth().toISOString()
      };
    }
  }
  
  /**
   * Kontrollera om användaren kan utföra fler analyser
   * @param userId Användar-ID
   * @returns Resultat som indikerar om ytterligare analys är tillåten
   */
  async canPerformAnalysis(userId: string): Promise<UsageCheckResult> {
    try {
      const analytics = await this.getUserAnalytics(userId);
      const currentCount = analytics.currentPeriod.totalAnalyses;
      const limit = analytics.currentPeriod.limit;
      const remaining = Math.max(0, limit - currentCount);
      
      if (remaining > 0) {
        return {
          allowed: true,
          remaining,
          total: currentCount,
          limit,
          resetDate: analytics.currentPeriod.endDate
        };
      } else {
        return {
          allowed: false,
          reason: 'Månatlig gräns uppnådd',
          remaining: 0,
          total: currentCount,
          limit,
          resetDate: analytics.currentPeriod.endDate
        };
      }
    } catch (error) {
      console.error('Fel vid kontroll av analysmöjlighet:', error);
      // Default till tillåtet i felsituationer
      return {
        allowed: true,
        remaining: DEFAULT_MONTHLY_LIMIT,
        total: 0,
        limit: DEFAULT_MONTHLY_LIMIT,
        resetDate: this.getEndOfMonth().toISOString(),
        reason: 'Kunde inte kontrollera begränsningar, tillåter som standard'
      };
    }
  }
  
  /**
   * Registrera en analys när enheten är offline
   * @param userId Användar-ID
   * @param analysisData Extra data att spara om analysen
   * @returns Uppskattad status baserad på lokal data
   */
  async recordOfflineAnalysis(userId: string, analysisData: any = {}): Promise<{
    success: boolean;
    estimatedCount: number;
    estimatedRemaining: number;
  }> {
    try {
      // Hämta nuvarande användaranalys
      const analytics = await this.getUserAnalytics(userId);
      
      // Uppdatera antal analyser för aktuell period
      analytics.currentPeriod.totalAnalyses += 1;
      
      // Spara uppdaterad analys lokalt
      await this.saveUserAnalytics(analytics);
      
      // Spara till listan över väntande analyser för senare synkronisering
      await this.addToPendingAnalyses(userId, analysisData);
      
      return {
        success: true,
        estimatedCount: analytics.currentPeriod.totalAnalyses,
        estimatedRemaining: Math.max(0, analytics.currentPeriod.limit - analytics.currentPeriod.totalAnalyses)
      };
    } catch (error) {
      console.error('Fel vid registrering av offline-analys:', error);
      return {
        success: false,
        estimatedCount: 0,
        estimatedRemaining: DEFAULT_MONTHLY_LIMIT
      };
    }
  }
  
  /**
   * Synkronisera väntande offline-analyser med Supabase
   * @returns Antal synkroniserade analyser
   */
  async syncPendingAnalyses(): Promise<number> {
    try {
      const pendingAnalysesJson = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_ANALYSES);
      if (!pendingAnalysesJson) return 0;
      
      const pendingAnalyses = JSON.parse(pendingAnalysesJson);
      if (!Array.isArray(pendingAnalyses) || pendingAnalyses.length === 0) return 0;
      
      console.log(`Synkroniserar ${pendingAnalyses.length} väntande analyser`);
      
      // Gruppera analyser efter användare
      const userGroups = new Map<string, any[]>();
      
      for (const analysis of pendingAnalyses) {
        const userId = analysis.userId;
        if (!userId) continue;
        
        if (!userGroups.has(userId)) {
          userGroups.set(userId, []);
        }
        userGroups.get(userId)?.push(analysis);
      }
      
      // Synkronisera för varje användare
      let totalSynced = 0;
      for (const [userId, analyses] of userGroups.entries()) {
        try {
          await this.syncUserAnalyses(userId, analyses.length);
          totalSynced += analyses.length;
        } catch (error) {
          console.error(`Fel vid synkronisering för användare ${userId}:`, error);
        }
      }
      
      // Om alla synkroniserades, rensa listan
      if (totalSynced === pendingAnalyses.length) {
        await AsyncStorage.removeItem(STORAGE_KEYS.PENDING_ANALYSES);
      } else {
        // Annars, spara bara de som fortfarande väntar
        const remainingAnalyses = pendingAnalyses.slice(totalSynced);
        await AsyncStorage.setItem(STORAGE_KEYS.PENDING_ANALYSES, JSON.stringify(remainingAnalyses));
      }
      
      return totalSynced;
    } catch (error) {
      console.error('Fel vid synkronisering av väntande analyser:', error);
      return 0;
    }
  }
  
  /**
   * Sätt en ny månatlig gräns för användaren
   * @param userId Användar-ID
   * @param newLimit Ny gräns
   * @returns Success status
   */
  async setMonthlyLimit(userId: string, newLimit: number): Promise<boolean> {
    try {
      const analytics = await this.getUserAnalytics(userId);
      
      // Uppdatera gränsen
      analytics.currentPeriod.limit = newLimit;
      
      // Spara
      await this.saveUserAnalytics(analytics);
      
      // Synkronisera med Supabase om möjligt
      this.syncWithSupabase(analytics).catch(error => {
        console.error('Fel vid synkronisering med Supabase:', error);
      });
      
      return true;
    } catch (error) {
      console.error('Fel vid uppdatering av månatlig gräns:', error);
      return false;
    }
  }
  
  /**
   * Adapter för det gamla systemet att använda den nya AnalyticsService
   * Detta förenklar migrationen genom att låta gammal kod använda det nya API:et
   * @param userId Användar-ID
   * @param analysisData Valfri analysdata
   * @returns Ett resultat som är kompatibelt med både nya och gamla systemet
   */
  async legacyRecordAnalysis(userId: string, analysisData: any = {}): Promise<{
    success: boolean;
    remainingAnalyses: number;
    totalAnalyses: number;
    limit: number;
  }> {
    try {
      const result = await this.recordAnalysis(userId);
      
      return {
        success: result.success,
        remainingAnalyses: result.remaining,
        totalAnalyses: result.currentCount,
        limit: result.limit
      };
    } catch (error) {
      console.error('Fel vid legacy-registrering av analys:', error);
      return {
        success: false,
        remainingAnalyses: DEFAULT_MONTHLY_LIMIT,
        totalAnalyses: 0,
        limit: DEFAULT_MONTHLY_LIMIT
      };
    }
  }
  
  // Private helper methods
  
  /**
   * Hämta användarens analytiksdata, eller skapa ny om den inte finns
   */
  private async getUserAnalytics(userId: string): Promise<UserAnalytics> {
    if (!userId) {
      throw new Error('Användar-ID saknas');
    }
    
    const storageKey = `${STORAGE_KEYS.USER_ANALYTICS_PREFIX}${userId}`;
    
    try {
      // Kontrollera om analytics finns i AsyncStorage
      const analyticsJson = await AsyncStorage.getItem(storageKey);
      
      if (analyticsJson) {
        const analytics = JSON.parse(analyticsJson);
        
        // Kontrollera om vi behöver rotera till ny period
        if (this.shouldRotatePeriod(analytics.currentPeriod.endDate)) {
          return this.rotateTpNewPeriod(analytics);
        }
        
        return analytics;
      }
      
      // Om ingen analytics finns, försök med Supabase
      const analytics = await this.getAnalyticsFromSupabase(userId);
      if (analytics) {
        await AsyncStorage.setItem(storageKey, JSON.stringify(analytics));
        return analytics;
      }
      
      // Om fortfarande ingen data, skapa en ny
      return this.createNewAnalytics(userId);
    } catch (error) {
      console.error('Fel vid hämtning av användaranalytik:', error);
      return this.createNewAnalytics(userId);
    }
  }
  
  /**
   * Kontrollera om vi behöver rotera till en ny period
   */
  private shouldRotatePeriod(endDateStr: string): boolean {
    try {
      const endDate = new Date(endDateStr);
      const now = new Date();
      return now > endDate;
    } catch (error) {
      console.error('Fel vid kontroll av periodrotation:', error);
      return false;
    }
  }
  
  /**
   * Rotera till en ny period
   */
  private rotateTpNewPeriod(analytics: UserAnalytics): UserAnalytics {
    try {
      // Skapa period-identifierare (YYYY-MM)
      const oldPeriodDate = new Date(analytics.currentPeriod.startDate);
      const oldPeriodId = `${oldPeriodDate.getFullYear()}-${String(oldPeriodDate.getMonth() + 1).padStart(2, '0')}`;
      
      // Lägg till nuvarande period till historiska perioder
      const historicalPeriods = [...analytics.historicalPeriods];
      historicalPeriods.push({
        period: oldPeriodId,
        totalAnalyses: analytics.currentPeriod.totalAnalyses
      });
      
      // Begränsa till de senaste 12 månaderna
      while (historicalPeriods.length > 12) {
        historicalPeriods.shift();
      }
      
      // Skapa en ny period
      const startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = this.getEndOfMonth();
      
      // Skapa ny analytics
      const newAnalytics: UserAnalytics = {
        userId: analytics.userId,
        currentPeriod: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          totalAnalyses: 0,
          limit: analytics.currentPeriod.limit // Behåll samma gräns
        },
        historicalPeriods
      };
      
      return newAnalytics;
    } catch (error) {
      console.error('Fel vid rotation till ny period:', error);
      return analytics;
    }
  }
  
  /**
   * Skapa en ny analytics för användaren
   */
  private createNewAnalytics(userId: string): UserAnalytics {
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = this.getEndOfMonth();
    
    return {
      userId,
      currentPeriod: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        totalAnalyses: 0,
        limit: DEFAULT_MONTHLY_LIMIT
      },
      historicalPeriods: []
    };
  }
  
  /**
   * Få slutet av nuvarande månad
   */
  private getEndOfMonth(): Date {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    lastDay.setHours(23, 59, 59, 999);
    return lastDay;
  }
  
  /**
   * Spara användarens analytik
   */
  private async saveUserAnalytics(analytics: UserAnalytics): Promise<void> {
    const storageKey = `${STORAGE_KEYS.USER_ANALYTICS_PREFIX}${analytics.userId}`;
    await AsyncStorage.setItem(storageKey, JSON.stringify(analytics));
  }
  
  /**
   * Lägg till en analys i listan över väntande analyser
   */
  private async addToPendingAnalyses(userId: string, analysisData: any = {}): Promise<void> {
    try {
      const pendingAnalysesJson = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_ANALYSES);
      let pendingAnalyses: any[] = [];
      
      if (pendingAnalysesJson) {
        pendingAnalyses = JSON.parse(pendingAnalysesJson);
        if (!Array.isArray(pendingAnalyses)) {
          pendingAnalyses = [];
        }
      }
      
      pendingAnalyses.push({
        userId,
        timestamp: new Date().toISOString(),
        ...analysisData
      });
      
      await AsyncStorage.setItem(STORAGE_KEYS.PENDING_ANALYSES, JSON.stringify(pendingAnalyses));
    } catch (error) {
      console.error('Fel vid tillägg till väntande analyser:', error);
    }
  }
  
  /**
   * Hämta analytics från Supabase om möjligt
   */
  private async getAnalyticsFromSupabase(userId: string): Promise<UserAnalytics | null> {
    try {
      // Kontrollera om Supabase är tillgänglig
      if (!supabase) {
        return null;
      }
      
      try {
        // Testa om tabellen finns genom att köra en tydlig select med specifika kolumner
        const { data: testData, error: testError } = await supabase
          .from('user_analytics')
          .select('id, user_id')
          .limit(1);
          
        // Om vi får error om att tabellen inte finns, returnera null direkt
        if (testError && (
            testError.code === '42P01' ||              // PostgreSQL table does not exist
            testError.message.includes('does not exist') || 
            testError.message.includes('relation')
          )) {
          console.error('Tabellen user_analytics finns inte i databasen:', testError);
          return null;
        }
      } catch (testError) {
        console.error('Fel vid kontroll av befintlig tabell:', testError);
        return null;
      }
      
      // Hämta data för användaren
      try {
        const { data: userData, error: userError } = await supabase
          .from('user_analytics')
          .select('id, user_id, analyses_used, analyses_limit, is_premium, last_updated')
          .eq('user_id', userId)
          .single();
        
        if (userError) {
          // Kontrollera om felet är allvarligt eller bara "record not found"
          if (userError.code !== 'PGRST116') { // Not record not found error
            console.error('Fel vid hämtning från Supabase (användardata):', userError);
            return null;
          }
        }
        
        // Skapa UserAnalytics-objekt
        const startDate = new Date();
        startDate.setDate(1); // Första dagen i månaden
        startDate.setHours(0, 0, 0, 0);
        
        const endDate = this.getEndOfMonth();
        
        const analytics: UserAnalytics = {
          userId,
          currentPeriod: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            totalAnalyses: userData?.analyses_used || 0,
            limit: userData?.analyses_limit || DEFAULT_MONTHLY_LIMIT
          },
          historicalPeriods: [] // Vi har ingen historisk period-data i den nya tabellstrukturen
        };
        
        return analytics;
      } catch (queryError) {
        console.error('Fel vid databasoperation:', queryError);
        return null;
      }
    } catch (error) {
      console.error('Fel vid hämtning från Supabase:', error);
      return null;
    }
  }
  
  /**
   * Synkronisera analytiksdata med Supabase
   */
  private async syncWithSupabase(analytics: UserAnalytics): Promise<boolean> {
    try {
      // Kontrollera om Supabase är tillgänglig
      if (!supabase) {
        return false;
      }
      
      const userId = analytics.userId;
      
      // Kontrollera först om tabellen existerar på ett säkrare sätt
      try {
        const { data: tableCheck, error: tableError } = await supabase
          .from('user_analytics')
          .select('id')
          .limit(1);
          
        if (tableError) {
          // Om tabellen inte finns, logga felet och returnera
          if (tableError.code === '42P01' || 
              tableError.message.includes('does not exist') ||
              tableError.message.includes('relation')) {
            console.error('Kunde inte synkronisera med Supabase: Tabellen existerar inte', tableError);
            return false;
          }
        }
      } catch (tableCheckError) {
        console.error('Fel vid kontroll av tabellfunktionalitet:', tableCheckError);
        return false;
      }
      
      // Kontrollera om det finns en befintlig post för användaren
      let existingData: any = null;
      
      try {
        const { data, error } = await supabase
          .from('user_analytics')
          .select('id, analyses_used, analyses_limit, is_premium')
          .eq('user_id', userId)
          .single();
        
        if (error) {
          // Ignorera "no rows returned" fel
          if (error.code !== 'PGRST116') {
            console.error('Fel vid kontroll av befintlig post:', error);
            return false;
          }
        } else {
          existingData = data;
        }
      } catch (checkError) {
        console.error('Fel vid kontroll av befintlig post:', checkError);
        return false;
      }
      
      try {
        if (existingData) {
          // Uppdatera befintlig post med KORREKTA kolumnnamn
          console.log('Uppdaterar befintlig användaranalytik för användare', userId, 'Antal analyser:', analytics.currentPeriod.totalAnalyses);
          const { error: updateError } = await supabase
            .from('user_analytics')
            .update({
              analyses_used: analytics.currentPeriod.totalAnalyses,
              analyses_limit: analytics.currentPeriod.limit,
              last_updated: new Date().toISOString()
            })
            .eq('id', existingData.id);
          
          if (updateError) {
            console.error('Fel vid uppdatering av Supabase:', updateError);
            return false;
          }
          
          console.log('Användaranalytik uppdaterad i Supabase för användare', userId);
        } else {
          // Skapa ny post med KORREKTA kolumnnamn
          console.log('Skapar ny användaranalytik för användare', userId, 'Antal analyser:', analytics.currentPeriod.totalAnalyses);
          const { error: insertError } = await supabase
            .from('user_analytics')
            .insert({
              user_id: userId,
              analyses_used: analytics.currentPeriod.totalAnalyses,
              analyses_limit: analytics.currentPeriod.limit,
              is_premium: false,
              last_updated: new Date().toISOString()
            });
          
          if (insertError) {
            console.error('Fel vid insättning i Supabase:', insertError);
            return false;
          }
          
          console.log('Ny användaranalytik skapad i Supabase för användare', userId);
        }
        
        return true;
      } catch (operationError) {
        console.error('Fel vid dataåtgärd i Supabase:', operationError);
        return false;
      }
    } catch (error) {
      console.error('Fel vid synkronisering med Supabase:', error);
      return false;
    }
  }
  
  /**
   * Synkronisera användaranalyser med Supabase
   */
  private async syncUserAnalyses(userId: string, count: number): Promise<boolean> {
    try {
      // Kontrollera om Supabase är tillgänglig
      if (!supabase) {
        return false;
      }
      
      // Kontrollera om posten finns
      const { data: existingData, error: checkError } = await supabase
        .from('user_analytics')
        .select('id, analyses_used')
        .eq('user_id', userId)
        .single();
      
      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = not found
        console.error('Fel vid kontroll av befintlig post:', checkError);
        return false;
      }
      
      if (existingData) {
        // Uppdatera befintlig post
        const newTotal = existingData.analyses_used + count;
        
        const { error: updateError } = await supabase
          .from('user_analytics')
          .update({
            analyses_used: newTotal,
            last_updated: new Date().toISOString()
          })
          .eq('id', existingData.id);
        
        if (updateError) {
          console.error('Fel vid uppdatering av Supabase:', updateError);
          return false;
        }
      } else {
        // Skapa ny post
        const { error: insertError } = await supabase
          .from('user_analytics')
          .insert({
            user_id: userId,
            analyses_used: count,
            analyses_limit: DEFAULT_MONTHLY_LIMIT,
            is_premium: false,
            last_updated: new Date().toISOString()
          });
        
        if (insertError) {
          console.error('Fel vid insättning i Supabase:', insertError);
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Fel vid synkronisering med Supabase:', error);
      return false;
    }
  }
} 