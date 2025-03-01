// Simulerar ett API-anrop
export const fetchTestData = async () => {
    // Simulera nätverksfördröjning
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    return {
      message: 'API anrop fungerar!',
      timestamp: new Date().toISOString()
    }
  }