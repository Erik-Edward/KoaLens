import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Alert button interface
export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

// Alert types
export type AlertType = 'success' | 'error' | 'warning' | 'info';

// CustomAlert props interface
interface CustomAlertProps {
  visible: boolean;
  title: string;
  message?: string;
  buttons?: AlertButton[];
  type?: AlertType;
  onClose?: () => void;
}

const CustomAlert = ({
  visible,
  title,
  message,
  buttons = [{ text: 'OK' }],
  type = 'info',
  onClose,
}: CustomAlertProps) => {
  const { colors, isDarkMode } = useTheme();
  
  const getIconName = () => {
    switch (type) {
      case 'success':
        return 'checkmark-circle';
      case 'error':
        return 'alert-circle';
      case 'warning':
        return 'warning';
      case 'info':
        return 'information-circle';
      default:
        return 'information-circle';
    }
  };
  
  const getIconColor = () => {
    switch (type) {
      case 'success':
        return '#4CAF50';
      case 'error':
        return '#F44336';
      case 'warning':
        return '#FF9800';
      case 'info':
      default:
        return '#2196F3';
    }
  };

  // Gradient colors based on alert type
  const getGradientColors = () => {
    switch (type) {
      case 'success':
        return isDarkMode ? ['#1a2e1c', '#1f3520'] as const : ['#f0f9f1', '#e7f6e8'] as const;
      case 'error':
        return isDarkMode ? ['#3a1a1a', '#401e1e'] as const : ['#fdf3f3', '#fae8e8'] as const;
      case 'warning':
        return isDarkMode ? ['#3a2a0b', '#3e2e10'] as const : ['#fffbf0', '#fff5e0'] as const;
      case 'info':
      default:
        return isDarkMode ? ['#192730', '#1d2c36'] as const : ['#f0f7ff', '#e6f2ff'] as const;
    }
  };

  // Get button gradient colors
  const getPrimaryButtonGradient = () => {
    switch (type) {
      case 'success':
        return ['#4CAF50', '#3da641'] as const;
      case 'error':
        return ['#F44336', '#e53935'] as const;
      case 'warning':
        return ['#FF9800', '#fb8c00'] as const;
      case 'info':
      default:
        return ['#2196F3', '#1e88e5'] as const;
    }
  };

  // Get text colors based on theme
  const getTextColor = () => {
    return isDarkMode ? '#FFFFFF' : '#222222'; // Ljus i mörkt läge, nästan svart i ljust läge
  };
  
  // Get secondary text color with slightly less contrast
  const getSecondaryTextColor = () => {
    return isDarkMode ? '#E0E0E0' : '#333333'; // Lite ljusare i mörkt läge, mörkgrå i ljust läge
  };

  const handleButtonPress = (button: AlertButton) => {
    if (button.onPress) {
      button.onPress();
    }
    if (onClose) {
      onClose();
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <LinearGradient
          colors={getGradientColors()}
          style={[styles.container, { shadowColor: getIconColor() }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.iconContainer}>
            <Ionicons name={getIconName()} size={60} color={getIconColor()} />
          </View>
          
          <Text style={[styles.title, { color: getTextColor() }]}>{title}</Text>
          
          {message && <Text style={[styles.message, { color: getSecondaryTextColor() }]}>{message}</Text>}
          
          <View style={styles.buttonContainer}>
            {buttons.map((button, index) => {
              const isMainButton = button.style !== 'cancel' && button.style !== 'destructive';
              const isDestructive = button.style === 'destructive';
              
              return (
                <TouchableOpacity 
                  key={index}
                  style={[
                    styles.button,
                    index === 0 && buttons.length > 1 ? { marginRight: 8 } : {},
                    isMainButton ? styles.mainButton : styles.secondaryButton,
                    isDestructive ? styles.destructiveButton : {}
                  ]}
                  onPress={() => handleButtonPress(button)}
                >
                  {isMainButton ? (
                    <LinearGradient
                      colors={getPrimaryButtonGradient()}
                      style={styles.buttonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>{button.text}</Text>
                    </LinearGradient>
                  ) : (
                    <Text style={[
                      styles.buttonText, 
                      { 
                        color: isDestructive ? '#F44336' : colors.secondary
                      }
                    ]}>
                      {button.text}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: width * 0.85,
    padding: 28,
    borderRadius: 20,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  iconContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    marginBottom: 28,
    textAlign: 'center',
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    marginTop: 8,
  },
  button: {
    flexGrow: 1,
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainButton: {
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 12,
  },
  destructiveButton: {
    borderWidth: 1,
    borderColor: '#ffdddd',
    backgroundColor: 'rgba(244, 67, 54, 0.08)',
  },
  buttonGradient: {
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CustomAlert; 