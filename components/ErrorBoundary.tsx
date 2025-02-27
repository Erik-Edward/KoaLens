// components/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as Sentry from 'sentry-expo';
import { router } from 'expo-router';
import theme from '@/constants/theme';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // Uppdatera state så att UI:t visar fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Rapportera felet till Sentry
    Sentry.Native.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack
        }
      }
    });
    
    console.error('Uncaught error in component:', error, errorInfo);
  }

  handleReset = () => {
    // Försök återställa appen genom att navigera till startsidan
    this.setState({ hasError: false, error: null });
    
    try {
      router.replace('/(tabs)');
    } catch (e) {
      // Om vi inte kan navigera, försök åtminstone att återställa tillståndet
      this.setState({ hasError: false, error: null });
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Något gick fel</Text>
          <Text style={styles.description}>
            Vi ber om ursäkt, ett oväntat fel har inträffat. Vårt team har informerats om problemet.
          </Text>
          {__DEV__ && this.state.error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorTitle}>Felinformation (utvecklingsläge):</Text>
              <Text style={styles.errorText}>{this.state.error.toString()}</Text>
            </View>
          )}
          <Pressable 
            style={styles.button}
            onPress={this.handleReset}
          >
            <Text style={styles.buttonText}>Återgå till huvudsidan</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.main,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 24,
    color: theme.colors.text.primary,
    marginBottom: 16,
  },
  description: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 16,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  errorContainer: {
    backgroundColor: theme.colors.background.light,
    padding: 16,
    borderRadius: 8,
    width: '100%',
    marginBottom: 24,
  },
  errorTitle: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 14,
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  errorText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12,
    color: theme.colors.status.error,
  },
  button: {
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 16,
    color: theme.colors.text.inverse,
  },
});