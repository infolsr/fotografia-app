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
app.use(express.json());
app.use(cors());


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

    const uploadedImagesData = [];

    for (const file of req.files) {
      // 1. Optimizar la imagen con Sharp
      const optimizedBuffer = await sharp(file.buffer)
        .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 90 })
        .toBuffer();

      // 2. Subir el buffer optimizado a Cloudinary
      const uploadResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: "Pedidos", resource_type: "image" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(optimizedBuffer);
      });

      // 3. Guardar en Supabase
      const { data: newImageRecord, error: supabaseError } = await supabase
        .from("imagenes_pedido").insert([{
            pedido_id: pedidoId,
            url: uploadResult.secure_url,
            url_original: uploadResult.secure_url,
            public_id: uploadResult.public_id,
        }]).select().single();
      
      if (supabaseError) throw supabaseError;
      
      uploadedImagesData.push(newImageRecord);
    }

    res.json({ success: true, uploadedImages: uploadedImagesData });

  } catch (error) {
    console.error("❌ ERROR en /subir-imagenes:", error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend seguro y completo en http://localhost:${PORT}`);
});