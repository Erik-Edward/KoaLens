import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { Alert as RNAlert, AlertButton as RNAlertButton, Platform } from 'react-native';
import CustomAlert from '../components/CustomAlert';
import { create } from 'zustand';

// Define our AlertButton type to match the one in CustomAlert
interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

// Definiera alert-typer
type AlertType = 'success' | 'error' | 'warning' | 'info';

// Store for alert preferences
interface AlertPreferences {
  useCustomAlerts: boolean;
}

const useAlertStore = create<AlertPreferences>(() => ({
  useCustomAlerts: true
}));

// Expose functions to manage the store
export const setUseCustomAlerts = (useCustom: boolean) => {
  useAlertStore.setState({ useCustomAlerts: useCustom });
};

export const getUseCustomAlerts = (): boolean => {
  return useAlertStore.getState().useCustomAlerts;
};

// Alert dialog state interface
interface AlertDialogState {
  visible: boolean;
  title: string;
  message?: string;
  buttons: AlertButton[];
  type: AlertType;
}

// Provider context-interface
interface AlertContextType {
  showAlert: (title: string, message?: string, buttons?: AlertButton[], type?: AlertType) => void;
  hideAlert: () => void;
  alertState: AlertDialogState;
}

// Skapa en default-context
const AlertContext = createContext<AlertContextType>({
  showAlert: () => {},
  hideAlert: () => {},
  alertState: {
    visible: false,
    title: '',
    message: '',
    buttons: [],
    type: 'info'
  }
});

// Använd context
export const useAlert = () => useContext(AlertContext);

// Alert Provider
export const AlertProvider = ({ children }: { children: ReactNode }) => {
  const [alertState, setAlertState] = useState<AlertDialogState>({
    visible: false,
    title: '',
    message: '',
    buttons: [{ text: 'OK' }],
    type: 'info'
  });

  const showAlert = (
    title: string,
    message?: string,
    buttons?: AlertButton[],
    type?: AlertType
  ) => {
    // Logga för debugging
    console.log(`[AlertProvider] Showing alert: ${title}${message ? ': ' + message : ''}`);

    const alertType = type || determineAlertType(title, message);
    const alertButtons = buttons ? buttons : [{ text: 'OK' }];

    setAlertState({
      visible: true,
      title,
      message,
      buttons: alertButtons.map(btn => ({
        ...btn,
        onPress: () => {
          // Stäng alert och kör onPress
          setAlertState(prev => ({ ...prev, visible: false }));
          if (btn.onPress) {
            setTimeout(() => btn.onPress?.(), 300); // Liten fördröjning för att animationen ska hinna köras
          }
        }
      })),
      type: alertType
    });
  };

  const hideAlert = () => {
    setAlertState(prev => ({ ...prev, visible: false }));
  };

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert, alertState }}>
      {children}
      <CustomAlert
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        buttons={alertState.buttons}
        type={alertState.type}
        onClose={hideAlert}
      />
    </AlertContext.Provider>
  );
};

/**
 * Convert React Native AlertButton to our custom AlertButton format
 */
function convertAlertButtons(buttons?: RNAlertButton[]): AlertButton[] {
  if (!buttons || buttons.length === 0) {
    return [{ text: 'OK' }];
  }

  return buttons.map(button => ({
    text: button.text || 'OK',
    onPress: button.onPress,
    style: button.style as 'default' | 'cancel' | 'destructive',
  }));
}

/**
 * Determine alert type based on title/message content
 */
function determineAlertType(title: string, message?: string): AlertType {
  // Convert to lowercase for easier comparison
  const lowerTitle = title.toLowerCase();
  const lowerMessage = message?.toLowerCase() || '';
  
  // Check for error indicators
  if (
    lowerTitle.includes('fel') || 
    lowerTitle.includes('error') || 
    lowerTitle.includes('misslycka')
  ) {
    return 'error';
  }
  
  // Check for success indicators
  if (
    lowerTitle.includes('klart') || 
    lowerTitle.includes('success') || 
    lowerTitle.includes('lyckad') ||
    lowerTitle.includes('sparat') ||
    lowerTitle.includes('tack')
  ) {
    return 'success';
  }
  
  // Check for warning indicators
  if (
    lowerTitle.includes('varning') || 
    lowerTitle.includes('warning') || 
    lowerTitle.includes('akta') ||
    lowerTitle.includes('obs')
  ) {
    return 'warning';
  }
  
  // Default to info
  return 'info';
}

/**
 * Enkel funktion för att logga alert-anrop för debugging
 */
function logAlert(title: string, message?: string) {
  console.log(`[ALERT] ${title}${message ? ': ' + message : ''}`);
}

// Definierar en global referens till showAlert-funktionen som vi kommer sätta i App.tsx
let globalShowAlert: ((title: string, message?: string, buttons?: AlertButton[], type?: AlertType) => void) | null = null;

export const setGlobalShowAlert = (showAlertFunc: (title: string, message?: string, buttons?: AlertButton[], type?: AlertType) => void) => {
  globalShowAlert = showAlertFunc;
};

/**
 * The Alert component/object that can be used as a drop-in replacement for React Native's Alert
 */
export const Alert = {
  /**
   * Show an alert dialog with the specified title and message
   * 
   * @param title - The title of the alert
   * @param message - The alert message
   * @param buttons - Array of buttons to display
   * @param options - Additional options (used by RN Alert)
   */
  alert: (
    title: string,
    message?: string,
    buttons?: RNAlertButton[],
    options?: any
  ) => {
    // Logga alltid för debugging
    logAlert(title, message);
    
    // Försök använda globalShowAlert om den är satt och custom alerts är aktiverade
    if (globalShowAlert && useAlertStore.getState().useCustomAlerts) {
      console.log('[Alert.alert] Using custom alert via globalShowAlert');
      return globalShowAlert(title, message, convertAlertButtons(buttons));
    }
    
    // Fallback till RNAlert
    console.log('[Alert.alert] Falling back to RNAlert');
    return RNAlert.alert(title, message, buttons, options);
  }
};

// Expose the alert to global usage
export const showGlobalAlert = (
  title: string,
  message?: string,
  buttons?: AlertButton[],
  type?: AlertType
) => {
  if (globalShowAlert) {
    globalShowAlert(title, message, buttons, type);
  } else {
    console.log('[showGlobalAlert] globalShowAlert not set, using RNAlert instead');
    RNAlert.alert(title, message, buttons as RNAlertButton[]);
  }
};

export default Alert;