// app/providers/NetworkProvider.tsx
import React, { FC, ReactNode, useEffect } from 'react'
import { onlineManager } from '@tanstack/react-query'
import NetInfo from '@react-native-community/netinfo'
import { AppState, Platform } from 'react-native'
import { focusManager } from '@tanstack/react-query'

interface Props {
  children: ReactNode
}

const NetworkProvider: FC<Props> = ({ children }) => {
  useEffect(() => {
    // Hantera online/offline status
    onlineManager.setEventListener((setOnline) => {
      return NetInfo.addEventListener((state) => {
        setOnline(!!state.isConnected)
      })
    })

    // Hantera app focus/blur
    const subscription = AppState.addEventListener('change', (status) => {
      if (Platform.OS !== 'web') {
        focusManager.setFocused(status === 'active')
      }
    })

    return () => {
      subscription.remove()
    }
  }, [])

  return <>{children}</>
}

export default NetworkProvider