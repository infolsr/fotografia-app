// src/utils/optimizeImage.js
import imageCompression from 'browser-image-compression';

/**
 * Comprime y redimensiona una imagen en el navegador antes de subirla.
 * @param {File} file - El archivo de imagen original.
 * @returns {Promise<File>} - El nuevo archivo de imagen optimizado.
 */
export async function optimizeImage(file) {
  //console.log(`Tamaño original: ${(file.size / 1024 / 1024).toFixed(2)} MB`);

  const options = {
    maxSizeMB: 1,          // Tamaño máximo del archivo en MB
    maxWidthOrHeight: 1920, // Redimensiona la imagen para que su lado más largo sea de 1920px
    useWebWorker: true,    // Usa un worker para no congelar la interfaz
  };

  try {
    const compressedFile = await imageCompression(file, options);
    //console.log(`Tamaño optimizado: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);
    return compressedFile;
  } catch (error) {
    console.error('Error al optimizar la imagen:', error);
    return file; // Si falla, devuelve el archivo original
  }
}