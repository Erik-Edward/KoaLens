declare module 'react-native-image-crop-picker' {
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

  interface ToolbarTitleOffset {
    x: number;
    y: number;
  }

  export interface CropperOptions {
    path: string;
    width?: number;
    height?: number;
    // Toolbar och text inställningar
    cropperToolbarTitle?: string;
    cropperTitleTextColor?: string;
    cropperToolbarTitleOffset?: ToolbarTitleOffset;
    // Färginställningar
    cropperToolbarColor?: string;
    cropperStatusBarColor?: string;
    cropperToolbarWidgetColor?: string;
    cropperActiveWidgetColor?: string;
    cropperChooseColor?: string;
    cropperCancelColor?: string;
    // Beskärningsinställningar
    freeStyleCropEnabled?: boolean;
    showCropGuidelines?: boolean;
    showCropFrame?: boolean;
    hideBottomControls?: boolean;
    enableRotationGesture?: boolean;
    cropperRotateButtonsHidden?: boolean;
    disableCropperColorSetters?: boolean;
    aspectRatio?: number | null;
    // Textinställningar
    cropperChooseText?: string;
    cropperCancelText?: string;
    // Övriga inställningar
    includeBase64?: boolean;
    includeExif?: boolean;
    compressImageQuality?: number;
    compressImageMaxWidth?: number;
    compressImageMaxHeight?: number;
    cropperCircleOverlay?: boolean;
    avoidEmptySpaceAroundImage?: boolean;
    mediaType?: 'photo' | 'video' | 'any';
  }

  export default class ImagePicker {
    static openPicker(options: CropperOptions): Promise<Image>;
    static openCamera(options: CropperOptions): Promise<Image>;
    static openCropper(options: CropperOptions): Promise<Image>;
    static clean(): Promise<void>;
    static cleanSingle(path: string): Promise<void>;
  }
}