// lib/visionCameraWrapper.ts
import { Platform } from 'react-native';

// Dummy-typer för att matcha VisionCamera API
export interface CameraDevice {
  id: string;
  name: string;
  position: 'front' | 'back' | 'external';
  isAvailable: boolean;
}

export interface CameraPermissionStatus {
  granted: boolean;
  status: 'authorized' | 'not-determined' | 'denied' | 'restricted';
}

export interface CameraPermissionRequestResult {
  granted: boolean;
}

// Dummy-implementering för web/Expo Go
const dummyCamera = {
  useCameraDevice: (position?: 'front' | 'back'): CameraDevice | null => {
    console.warn('VisionCamera: useCameraDevice called in unsupported environment');
    return null;
  },
  
  useCameraPermission: (): { 
    hasPermission: boolean; 
    requestPermission: () => Promise<CameraPermissionRequestResult>;
    status: CameraPermissionStatus['status'];
  } => {
    console.warn('VisionCamera: useCameraPermission called in unsupported environment');
    return {
      hasPermission: false,
      status: 'not-determined',
      requestPermission: async () => ({ granted: false })
    };
  },
  
  Camera: ({ style, device, isActive }: any) => {
    console.warn('VisionCamera: Camera component rendered in unsupported environment');
    return null;
  }
};

// Faktisk export - använd riktig VisionCamera på native, annars dummy
let exports = dummyCamera;

// Försök att importera riktig VisionCamera på native-plattformar
// och swallow eventuella errors på web
if (Platform.OS !== 'web') {
  try {
    // Dynamic import för att undvika att web-bundler försöker ladda denna modul
    const visionCamera = require('react-native-vision-camera');
    exports = {
      useCameraDevice: visionCamera.useCameraDevice,
      useCameraPermission: visionCamera.useCameraPermission,
      Camera: visionCamera.Camera
    };
    console.log('VisionCamera: Successfully loaded native module');
  } catch (error) {
    console.warn('VisionCamera: Could not load native module, using dummy implementation', error);
  }
}

export const { useCameraDevice, useCameraPermission, Camera } = exports;