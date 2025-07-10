
import { supabase } from "./supabaseClient";

// Llamar esto luego de login exitoso
export async function registrarClienteSiNoExiste(user) {
  if (!user) return;

  const { id, email, user_metadata } = user;

  // Verificar si ya existe en la tabla clientes
  const { data: clienteExistente, error: errorFetch } = await supabase
    .from("clientes")
    .select("id")
    .eq("id", id)
    .single();

  if (clienteExistente) return; // Ya existe

  // Insertar nuevo cliente
  const { error } = await supabase.from("clientes").insert([
    {
      id,
      nombre: user_metadata?.name,
      correo: email,
      avatar_url: user_metadata?.avatar_url,
    },
  ]);

  if (error) console.error("❌ Error insertando cliente:", error.message);
}
