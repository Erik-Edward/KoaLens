import React, { createContext, useContext, ReactNode, useState } from 'react';
import CustomAlert, { AlertButton } from '../components/CustomAlert';

type AlertType = 'success' | 'error' | 'warning' | 'info';

interface AlertContextType {
  showAlert: (
    title: string,
    message: string,
    buttons?: AlertButton[],
    type?: AlertType
  ) => void;
  hideAlert: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

interface AlertProviderProps {
  children: ReactNode;
}

export function AlertProvider({ children }: AlertProviderProps) {
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [buttons, setButtons] = useState<AlertButton[]>([]);
  const [type, setType] = useState<AlertType>('info');

  const showAlert = (
    title: string,
    message: string,
    buttons: AlertButton[] = [{ text: 'OK' }],
    type: AlertType = 'info'
  ) => {
    setTitle(title);
    setMessage(message);
    setButtons(buttons);
    setType(type);
    setVisible(true);
  };

  const hideAlert = () => {
    setVisible(false);
  };

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert }}>
      {children}
      <CustomAlert
        visible={visible}
        title={title}
        message={message}
        buttons={buttons}
        type={type}
        onClose={hideAlert}
      />
    </AlertContext.Provider>
  );
}

export function useAlert(): AlertContextType {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
} 