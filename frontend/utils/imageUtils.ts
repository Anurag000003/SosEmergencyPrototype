import * as ImageManipulator from 'expo-image-manipulator';

export type ScanType = 'oral_cancer' | 'plant_disease';

/**
 * Preprocesses an image on the device before uploading it to the backend.
 * This heavily reduces upload time and saves user bandwidth by shrinking 
 * massive camera photos down to the exact size the AI model needs.
 * Adjusts preprocessing depending on whether scanning for oral cancer or plant disease.
 *
 * @param uri The local URI of the picked image
 * @param scanType The type of scan being performed (determines formatting rules)
 * @returns A promise that resolves to the new manipulated image URI
 */
export const preprocessImageForAI = async (uri: string, scanType: ScanType = 'oral_cancer'): Promise<string> => {
  try {
    // Both models use 224x224, but they have different normalization needs.
    // The plant_disease model expects NO pixel normalization (dividing by 255),
    // which we ensure by just passing a standard JPEG and letting the backend handle it.
    let targetWidth = 224;
    let targetHeight = 224;
    let compressQuality = 0.8;

    if (scanType === 'plant_disease') {
      targetWidth = 224;
      targetHeight = 224;
      compressQuality = 0.9; // Higher quality for leaf details
    } else if (scanType === 'oral_cancer') {
      targetWidth = 224;
      targetHeight = 224;
      compressQuality = 0.8;
    }

    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: targetWidth, height: targetHeight } }], 
      { compress: compressQuality, format: ImageManipulator.SaveFormat.JPEG }
    );
    
    return manipResult.uri;
  } catch (error) {
    console.error("Failed to preprocess image on device:", error);
    // If manipulation fails for some reason, return the original URI as fallback
    return uri; 
  }
};
