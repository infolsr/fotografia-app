const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;

// Se añade una verificación para dar un error claro si la variable no se carga.
if (!CLOUD_NAME) {
  throw new Error("Error de Configuración: VITE_CLOUDINARY_CLOUD_NAME no está definida en tu archivo .env. Asegúrate de que el archivo existe y que reiniciaste el servidor de Vite.");
}

const BASE_URL = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload`;

export function buildCloudinaryUrl(publicId, transformaciones, width) {
  if (!publicId) return '';

  const allTransformations = [];

  if (transformaciones?.crop) {
    const { x, y, width: cropWidth, height: cropHeight } = transformaciones.crop;
    allTransformations.push(`x_${x},y_${y},w_${cropWidth},h_${cropHeight},c_crop`);
  }

  if (width) {
    allTransformations.push(`w_${width},c_limit`);
  }

  if (transformaciones?.filter && transformaciones.filter !== 'ninguno') {
    const filterEffect = { bn: 'e_grayscale', sepia: 'e_sepia' }[transformaciones.filter];
    if (filterEffect) allTransformations.push(filterEffect);
  }

  if (transformaciones?.flip) {
    allTransformations.push('a_hflip');
  }

  if (transformaciones?.border) {
    allTransformations.push('bo_2p_solid_white');
  }
  
  allTransformations.push('q_auto', 'f_auto');

  if (allTransformations.length === 0) {
    return `${BASE_URL}/${publicId}`;
  }

  const transformationString = allTransformations.join(',');
  return `${BASE_URL}/${transformationString}/${publicId}`;
}