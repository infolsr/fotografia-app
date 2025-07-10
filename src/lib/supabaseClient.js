import { createClient } from '@supabase/supabase-js'

// 1. Se leen las variables de entorno usando la sintaxis específica de Vite.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// 2. Verificación robusta para dar un error más claro si algo falla.
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(`Error de Configuración: La URL o la Anon Key de Supabase no están definidas. Por favor, revisa los siguientes puntos:
  1. ¿Existe un archivo .env en la CARPETA RAÍZ de tu proyecto de frontend (no dentro de /src)?
  2. ¿Las variables en ese archivo comienzan con el prefijo VITE_ (ej: VITE_SUPABASE_URL)?
  3. ¿REINICIASTE el servidor de desarrollo de Vite después de crear o modificar el archivo .env?`);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)