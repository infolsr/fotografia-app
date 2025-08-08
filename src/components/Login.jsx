import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient";

// NOTA: La función registrarClienteSiNoExiste ya no es necesaria aquí,
// porque la lógica principal en App.jsx ya gestiona la sesión del usuario.
// Este componente ahora solo se enfoca en las acciones de inicio de sesión.

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleMagicLinkLogin = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          // Opcional: Redirige al usuario a una página específica después de hacer clic en el enlace.
          // Si no se especifica, lo redirigirá a la página principal.
          // emailRedirectTo: `${window.location.origin}/mis-pedidos`,
        }
      });
      if (error) throw error;
      setMessage("¡Éxito! Revisa tu bandeja de entrada para encontrar el enlace mágico de acceso.");
    } catch (err) {
      setError(err.message || "No se pudo enviar el enlace. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({ provider: "google" });
  };

  return (
    <div className="p-4 text-center max-w-sm mx-auto">
      {/* Formulario para Magic Link */}
      <form onSubmit={handleMagicLinkLogin}>
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-luitania-textbrown">Inicia sesión o regístrate</h3>
          <p className="text-sm text-luitania-textbrown/70">
            Ingresa tu correo para recibir un enlace de acceso instantáneo, sin contraseñas.
          </p>
          <input
            type="email"
            placeholder="tu@correo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-luitania-sage focus:border-luitania-sage"
          />
          <button 
            type="submit" 
            disabled={loading}
            className="w-full btn-primary"
          >
            {loading ? "Enviando..." : "Enviar Enlace Mágico"}
          </button>
        </div>
      </form>

      {message && <p className="text-green-600 mt-4 text-sm">{message}</p>}
      {error && <p className="text-red-600 mt-4 text-sm">{error}</p>}

      {/* Separador */}
      <div className="my-6 flex items-center">
        <div className="flex-grow border-t border-gray-300"></div>
        <span className="flex-shrink mx-4 text-xs text-gray-500">O</span>
        <div className="flex-grow border-t border-gray-300"></div>
      </div>

      {/* Botón de Google */}
      <button
        onClick={handleGoogleLogin}
        className="w-full flex items-center justify-center gap-3 px-4 py-2 border border-gray-300 rounded-lg shadow-sm bg-white hover:bg-gray-50 transition-colors"
      >
        <svg className="w-5 h-5" viewBox="0 0 48 48">
          <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C39.986,36.921,44,31.023,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
        </svg>
        <span className="text-sm font-medium text-gray-700">Continuar con Google</span>
      </button>
    </div>
  );
};

export default Login;