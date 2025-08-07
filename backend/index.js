// backend/index.js
require('dotenv').config();
const express = require('express');
const mercadopago = require('mercadopago');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto'); // <-- SE AÑADE LA IMPORTACIÓN QUE FALTABA
const multer = require('multer'); // Importa multer
const upload = multer({ storage: multer.memoryStorage() }); // Configura multer para manejar archivos en memoria
const sharp = require('sharp'); // ✅ Se importa sharp

const app = express();

//app.use(cors());

// 1. Lee la lista de URLs permitidas desde las variables de entorno y la convierte en un array.
const whitelist = process.env.CLIENT_URLS ? process.env.CLIENT_URLS.split(',') : [];
console.log('Orígenes permitidos por CORS:', whitelist);

// 2. Configura las opciones de CORS para que revise la whitelist.
const corsOptions = {
  origin: function (origin, callback) {
    // Permite peticiones si el origen está en la whitelist (o si no hay origen, como en las pruebas de servidor)
    if (whitelist.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true
};
// 3. Usa el middleware de CORS con las opciones seguras ANTES de tus rutas.
app.use(cors(corsOptions));

app.use(express.json());

// --- CONFIGURACIONES DE SERVICIOS ---
mercadopago.configure({
  access_token: process.env.MERCADOPAGO_ACCESS_TOKEN
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);


// --- RUTAS DE LA API ---

// Ruta para crear un borrador de pedido al inicio del flujo
app.post('/crear-borrador-pedido', async (req, res) => {
  try {
    const { packId, imageCount, clienteId, clienteNombre, clienteCorreo } = req.body;

    const { data: pack, error: packError } = await supabase
      .from('packs').select('nombre_pack, precio').eq('id', packId).single();

    if (packError || !pack) throw new Error("Paquete no encontrado.");

    let totalCongelado = pack.precio;
    if (pack.nombre_pack.includes('Individual')) {
      totalCongelado = pack.precio * imageCount;
    }

    const { data: inserted, error: errorPedido } = await supabase
      .from("pedidos")
      .insert([{
        cliente_id: clienteId,
        nombre_cliente: clienteNombre,
        correo_cliente: clienteCorreo,
        formato: pack.nombre_pack,
        status: 'creando',
        total: totalCongelado,
        total_congelado: totalCongelado,
        fecha: new Date().toISOString(),
      }])
      .select()
      .single();

    if (errorPedido) throw errorPedido;

    res.json({ success: true, pedidoId: inserted.id });
  } catch (error) {
    console.error("Error creando borrador:", error);
    res.status(500).json({ error: error.message });
  }
});


// Ruta para crear la preferencia de pago final
app.post('/crear-pago', async (req, res) => {
  try {
    const { pedidoId, packId, expectedSubtotal, imageCount } = req.body;
    let finalTotal;
    let preferenceTitle;

    if (pedidoId) {
      const { data: pedido, error } = await supabase.from('pedidos').select('total_congelado, formato').eq('id', pedidoId).single();
      if (error || !pedido) throw new Error(`Pedido con ID ${pedidoId} no encontrado.`);
      finalTotal = pedido.total_congelado;
      preferenceTitle = `Finalizar Pedido: ${pedido.formato}`;
    } else if (packId && typeof expectedSubtotal !== 'undefined') {
      const { data: pack, error: packError } = await supabase.from('packs').select('nombre_pack, precio').eq('id', packId).single();
      if (packError || !pack) throw new Error("Paquete no encontrado.");
      let subtotalCalculado = pack.precio;
      if (pack.nombre_pack.includes('Individual')) {
        subtotalCalculado = pack.precio * (imageCount || 1);
      }
      if (Math.abs(subtotalCalculado - expectedSubtotal) > 0.01) {
        return res.status(409).json({ error: `El precio ha cambiado.`, precios: { esperado: expectedSubtotal, actual: subtotalCalculado }});
      }
      finalTotal = subtotalCalculado;
      preferenceTitle = `Pedido Luitania: ${pack.nombre_pack}`;
    } else {
      throw new Error("Solicitud inválida.");
    }
    
    const preference = {
      items: [{ title: preferenceTitle, unit_price: Number(finalTotal), quantity: 1 }],
      back_urls: {
        success: "http://localhost:5173/pedido-confirmado",
        failure: "http://localhost:5173/pago-fallido",
        pending: "http://localhost:5173/pago-fallido"
      },
      auto_return: "approved"
    };
    const respuesta = await mercadopago.preferences.create(preference);
    res.json({ init_point: respuesta.body.init_point });
  } catch (error) {
    console.error("❌ ERROR al crear preferencia:", error.message);
    res.status(500).json({ error: error.message });
  }
});


// Ruta para eliminar imágenes de Cloudinary
app.post('/eliminar-fotos', async (req, res) => {
  const { publicIds } = req.body;
  if (!publicIds || !Array.isArray(publicIds)) return res.status(400).json({ error: "Se requiere un array de publicIds." });
  try {
    const results = await Promise.all(publicIds.map(id => cloudinary.uploader.destroy(id)));
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ error: "No se pudieron eliminar las imágenes." });
  }
});


// Ruta para crear una sesión de subida remota (QR)
app.post('/crear-sesion-remota', async (req, res) => {
  const { pedidoId } = req.body;
  if (!pedidoId) return res.status(400).json({ error: "Falta el ID del pedido." });
  try {
    const token = crypto.randomBytes(8).toString('hex');
    const { data, error } = await supabase
      .from('sesiones_remotas')
      .insert({ pedido_id: pedidoId, token: token })
      .select('token')
      .single();
    if (error) throw error;
    res.json({ token: data.token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Ruta para validar el token de la sesión remota
app.get('/validar-sesion-remota/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { data: sesion, error } = await supabase
      .from('sesiones_remotas')
      .select('pedido_id, expires_at')
      .eq('token', token)
      .single();
    if (error || !sesion) throw new Error("El código QR no es válido.");
    if (new Date(sesion.expires_at) < new Date()) throw new Error("El código QR ha expirado.");
    res.json({ success: true, pedidoId: sesion.pedido_id });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// ✅ RUTA NUEVA Y SEGURA PARA SOBRESCRIBIR IMÁGENES
app.post('/sobrescribir-imagen', upload.single('file'), async (req, res) => {
  try {
    const { public_id } = req.body;
    if (!req.file || !public_id) {
      throw new Error("Faltan datos (archivo o public_id).");
    }

    // Convertir el buffer del archivo a un string base64 para Cloudinary
    const b64 = Buffer.from(req.file.buffer).toString("base64");
    let dataURI = "data:" + req.file.mimetype + ";base64," + b64;

    // Usar el SDK de Cloudinary para subir, que ya está configurado con tus claves seguras
    const result = await cloudinary.uploader.upload(dataURI, {
      public_id: public_id,
      overwrite: true,
    });

    res.json({ success: true, secure_url: result.secure_url });

  } catch (error) {
    console.error("❌ ERROR al sobrescribir imagen:", error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ NUEVA RUTA PARA SUBIDA DE IMÁGENES DESDE EL CLIENTE
app.post('/subir-imagenes', upload.array('images'), async (req, res) => {
  try {
    const { pedidoId } = req.body;
    if (!req.files || req.files.length === 0) {
      throw new Error("No se recibieron imágenes.");
    }
    
    const { data: pedidoData, error: pedidoError } = await supabase
      .from('pedidos')
      .select('nombre_cliente')
      .eq('id', pedidoId)
      .single();

    if (pedidoError) throw new Error("No se pudo encontrar el pedido para nombrar las imágenes.");

    const sanitizedClientName = (pedidoData.nombre_cliente || 'cliente')
      .replace(/ /g, '_')
      .replace(/[^a-zA-Z0-9_]/g, '');
    
    const shortOrderId = pedidoId.substring(0, 8);

    // --- INICIO: LÓGICA DE RESILIENCIA ---
    const uploadedImagesData = [];
    const failedImages = []; // Array para registrar las imágenes que fallen
    
    let index = 0;
    for (const file of req.files) {
      try { // El bloque try/catch ahora está DENTRO del bucle
        const optimizedBuffer = await sharp(file.buffer)
          .rotate()
          .resize({ 
            width: 1920, 
            height: 1920, 
            fit: 'inside',
            withoutEnlargement: true 
          })
          .jpeg({ quality: 90 })
          .toBuffer();

        const incrementalNumber = index + 1;
        // Se añade un sufijo aleatorio para evitar colisiones en subidas simultáneas
        const randomSuffix = crypto.randomBytes(4).toString('hex'); 
        const customPublicId = `${shortOrderId}_${sanitizedClientName}_${incrementalNumber}_${randomSuffix}`;

        const uploadResult = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { 
              folder: "Pedidos", 
              resource_type: "image",
              public_id: customPublicId
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          uploadStream.end(optimizedBuffer);
        });

        const { data: newImageRecord, error: supabaseError } = await supabase
          .from("imagenes_pedido").insert([{
              pedido_id: pedidoId,
              url: uploadResult.secure_url,
              url_original: uploadResult.secure_url,
              public_id: uploadResult.public_id,
          }]).select().single();
        
        if (supabaseError) throw supabaseError;
        
        // Si todo sale bien, se añade al array de éxitos
        uploadedImagesData.push(newImageRecord);

      } catch (error) {
        // Si esta imagen falla, se registra su nombre y el bucle continúa
        console.error(`Falló la subida de la imagen: ${file.originalname}`, error);
        failedImages.push(file.originalname);
      }
      index++;
    }

    // Se envía una respuesta detallada con los resultados
    res.status(207).json({ 
        success: true, 
        message: "Proceso de subida completado.",
        uploadedImages: uploadedImagesData,
        failures: failedImages
      });
    // --- FIN: LÓGICA DE RESILIENCIA ---

  } catch (error) {
    // Este catch externo ahora solo atrapa errores iniciales (ej. pedido no encontrado)
    console.error("❌ ERROR GENERAL en /subir-imagenes:", error);
    res.status(500).json({ error: error.message });
  }
});

// --- FUNCIÓN DE AYUDA PARA TRADUCIR LA "RECETA" A PARÁMETROS DE CLOUDINARY ---
const getCloudinaryCrop = (img) => {
  const { 
    imagePosition = { x: 0, y: 0 }, 
    zoom = 1, 
    naturalWidth, 
    naturalHeight, 
    formatoAsignado = "10x15",
  } = img;

  if (!naturalWidth || !naturalHeight) {
    return { x: 0, y: 0, width: 1, height: 1 };
  }

  const cropFormats = { "10x15": 10 / 15, "13x18": 13 / 18, "15x20": 15 / 20, "carta": 8.5 / 11, "A4": 210 / 297 };
  let targetAspect = cropFormats[formatoAsignado.toLowerCase()] || cropFormats["10x15"];
  
  const imageAspect = naturalWidth / naturalHeight;
  if ((imageAspect > 1 && targetAspect < 1) || (imageAspect < 1 && targetAspect > 1)) {
    targetAspect = 1 / targetAspect;
  }
  
  let viewportWidth = naturalWidth;
  let viewportHeight = Math.round(viewportWidth / targetAspect);
  if (viewportHeight > naturalHeight) {
    viewportHeight = naturalHeight;
    viewportWidth = Math.round(viewportHeight * targetAspect);
  }

  const finalWidth = viewportWidth / zoom;
  const finalHeight = viewportHeight / zoom;

  const zoomOffsetX = (viewportWidth - finalWidth) / 2;
  const zoomOffsetY = (viewportHeight - finalHeight) / 2;

  const panBoundX = (naturalWidth - viewportWidth) / 2;
  const panBoundY = (naturalHeight - viewportHeight) / 2;
  const pixelPanX = imagePosition.x * panBoundX;
  const pixelPanY = imagePosition.y * panBoundY;

  const initialX = (naturalWidth - viewportWidth) / 2;
  const initialY = (naturalHeight - viewportHeight) / 2;
  
  const finalX = initialX + zoomOffsetX - pixelPanX;
  const finalY = initialY + zoomOffsetY - pixelPanY;

  return {
    x: Math.round(finalX),
    y: Math.round(finalY),
    width: Math.round(finalWidth),
    height: Math.round(finalHeight),
  };
};

// --- NUEVO ENDPOINT PARA FINALIZAR IMÁGENES CON TRANSFORMACIONES DE CLOUDINARY ---
app.post('/finalizar-imagenes', async (req, res) => {
  try {
    const { transformations } = req.body;
    if (!transformations || !Array.isArray(transformations)) {
      throw new Error("No se recibió la data de transformaciones.");
    }

    const updatePromises = transformations.map(async (t) => {
      // 1. Calcula los parámetros de recorte usando la función de ayuda.
      const cropParams = getCloudinaryCrop(t);

      // 2. Construye el array de transformaciones para Cloudinary.
      const cloudinaryTransformations = [
        { ...cropParams, crop: 'crop' }, // Aplica el recorte principal
        { width: 1800, height: 2700, crop: 'limit' } // Limita el tamaño final para impresión
      ];

      if (t.isFlipped) {
        cloudinaryTransformations.push({ angle: 'hflip' });
      }
      if (t.filter === 'bn') {
        cloudinaryTransformations.push({ effect: 'grayscale' });
      }
      if (t.filter === 'sepia') {
        cloudinaryTransformations.push({ effect: 'sepia' });
      }
      if (t.hasBorder) {
        // Añade un borde blanco del 2.5% del ancho de la imagen.
        cloudinaryTransformations.push({
          border: '2.5vw_solid_white',
          crop: 'limit'
        });
      }

      // 3. Genera la nueva URL final.
      const finalUrl = cloudinary.url(t.public_id, {
        transformation: cloudinaryTransformations,
        secure: true
      });

      // 4. Actualiza la fila en Supabase con la nueva URL y los datos finales.
      const { data: updatedImage, error } = await supabase
        .from('imagenes_pedido')
        .update({ 
          url: finalUrl,
          filtro: t.filter,
          borde: t.hasBorder,
          espejado: t.isFlipped,
          acabado: t.acabado,
          pack_item_id: t.pack_item_id
        })
        .eq('id', t.id)
        .select()
        .single();
      
      if (error) throw new Error(`No se pudo actualizar la imagen con id ${t.id}: ${error.message}`);
      
      return updatedImage;
    });

    // Espera a que todas las actualizaciones se completen.
    const updatedImages = await Promise.all(updatePromises);
    
    res.json({ success: true, updatedImages });

  } catch (error) {
    console.error("❌ ERROR al finalizar imágenes:", error);
    res.status(500).json({ error: error.message });
  }
});

// --- INICIO DEL SERVIDOR ---
const PORT = process.env.PORT || 4000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor backend escuchando en el puerto ${PORT}`);
});