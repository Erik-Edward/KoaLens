// lib/imageCropPickerWrapper.ts
import { Platform } from 'react-native';

// Dummy-typer för att matcha ImageCropPicker API
export interface Image {
  path: string;
  size: number;
  width: number;
  height: number;
  mime: string;
  modificationDate?: string;
  creationDate?: string;
  sourceURL?: string;
  filename?: string;
}

export interface CropperOptions {
  path: string;
  width?: number;
  height?: number;
  // Övriga optioner...
  [key: string]: any;
}

// Dummy-implementering för web/Expo Go
const dummyImageCropPicker = {
  openPicker: async (options: any): Promise<Image> => {
    console.warn('ImageCropPicker: openPicker called in unsupported environment');
    throw new Error('ImageCropPicker is not supported in this environment');
  },
  
  openCamera: async (options: any): Promise<Image> => {
    console.warn('ImageCropPicker: openCamera called in unsupported environment');
    throw new Error('ImageCropPicker is not supported in this environment');
  },
  
  openCropper: async (options: CropperOptions): Promise<Image> => {
    console.warn('ImageCropPicker: openCropper called in unsupported environment');
    throw new Error('ImageCropPicker is not supported in this environment');
  },
  
  clean: async (): Promise<void> => {
    console.warn('ImageCropPicker: clean called in unsupported environment');
    return;
  },
  
  cleanSingle: async (path: string): Promise<void> => {
    console.warn('ImageCropPicker: cleanSingle called in unsupported environment');
    return;
  }
};

// Faktisk export - använd riktigt ImageCropPicker på native, annars dummy
let imageCropPicker: typeof dummyImageCropPicker = dummyImageCropPicker;

// Försök att importera riktigt ImageCropPicker på native-plattformar
// och hantera eventuella errors på web
if (Platform.OS !== 'web') {
  try {
    // Dynamic import för att undvika att web-bundler försöker ladda denna modul
    const RealImageCropPicker = require('react-native-image-crop-picker');
    imageCropPicker = RealImageCropPicker;
    console.log('ImageCropPicker: Successfully loaded native module');
  } catch (error) {
    console.warn('ImageCropPicker: Could not load native module, using dummy implementation', error);
  }
}

export default imageCropPicker;