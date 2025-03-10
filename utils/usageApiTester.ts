// utils/usageApiTester.ts
import { Alert } from 'react-native';
import { BACKEND_URL } from '@/constants/config';

/**
 * Utility för att direkt testa backend-API:t för användningsgränser
 * @param userId Användar-ID att testa med
 * @returns Testresultat med före/efter information
 */
export async function testUsageAPI(userId: string) {
  try {
    console.log('====== USAGE API TEST STARTED ======');
    console.log('Testing for user ID:', userId);
    
    // 1. Hämta initial användningsdata
    console.log('Step 1: Fetching initial usage data...');
    const initialResponse = await fetch(`${BACKEND_URL}/usage/${userId}`);
    
    if (!initialResponse.ok) {
      throw new Error(`Failed to fetch initial data: ${initialResponse.status} ${initialResponse.statusText}`);
    }
    
    const initialData = await initialResponse.json();
    console.log('Initial usage data:', initialData);
    
    // 2. Anropa direkt inkrementerings-endpoint som ökar räknaren
    console.log('Step 2: Testing increment via direct endpoint...');
    const incrementResponse = await fetch(`${BACKEND_URL}/increment-usage/${userId}`);
    
    if (!incrementResponse.ok) {
      throw new Error(`Increment failed: ${incrementResponse.status} ${incrementResponse.statusText}`);
    }
    
    const incrementResult = await incrementResponse.json();
    console.log('Increment response:', incrementResult);
    
    // 3. Hämta uppdaterad användningsdata
    console.log('Step 3: Fetching updated usage data...');
    const updatedResponse = await fetch(`${BACKEND_URL}/usage/${userId}`);
    
    if (!updatedResponse.ok) {
      throw new Error(`Failed to fetch updated data: ${updatedResponse.status} ${updatedResponse.statusText}`);
    }
    
    const updatedData = await updatedResponse.json();
    console.log('Updated usage data:', updatedData);
    
    // 4. Jämför resultat och returnera sammanfattning
    const changed = initialData.analysesUsed !== updatedData.analysesUsed;
    console.log('Usage count changed:', changed);
    console.log('Change amount:', updatedData.analysesUsed - initialData.analysesUsed);
    console.log('====== USAGE API TEST COMPLETED ======');
    
    return {
      initial: initialData,
      updated: updatedData,
      incrementResult,
      changed,
      status: changed ? 'SUCCESS' : 'FAILED',
      summary: changed 
        ? `Successfully changed usage from ${initialData.analysesUsed} to ${updatedData.analysesUsed}`
        : 'Failed to change usage count'
    };
  } catch (error) {
    console.error('API Test Error:', error);
    return {
      error: error instanceof Error ? error.message : String(error),
      status: 'ERROR',
      summary: 'Test failed with error'
    };
  }
}

/**
 * Visar testresultatet i en alert
 */
export function showTestResult(result: any) {
  if (result.error) {
    Alert.alert('Test Error', result.error);
    return;
  }
  
  const message = `
Initial: ${result.initial?.analysesUsed}/${result.initial?.analysesLimit}
Updated: ${result.updated?.analysesUsed}/${result.updated?.analysesLimit}
Status: ${result.status}

${result.summary}`;

  Alert.alert('API Test Result', message);
}