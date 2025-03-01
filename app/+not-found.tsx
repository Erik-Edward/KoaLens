import React, { FC } from 'react';
import { View, StyleSheet } from 'react-native';
import { Link, Stack } from 'expo-router';
import { ViewStyle, TextStyle } from 'react-native';
import theme from '@/constants/theme';

// Interface för styles
interface Styles {
  container: ViewStyle;
  button: TextStyle;
}

const NotFoundScreen: FC = () => {
  return (
    <>
      <Stack.Screen options={{ 
        title: 'Oops! Not Found',
        headerStyle: {
          backgroundColor: theme.colors.background.main,
        },
        headerTintColor: theme.colors.text.primary,
      }} />
      <View style={styles.container}>
        <Link 
          href="/" 
          style={styles.button}
          accessibilityRole="link"
          accessibilityLabel="Go back to home screen"
        >
          Go back to Home screen!
        </Link>
      </View>
    </>
  );
};

const styles = StyleSheet.create<Styles>({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.main,
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    fontSize: theme.typography.sizes.lg,
    textDecorationLine: 'underline',
    color: theme.colors.text.primary,
  },
});

export default NotFoundScreen;