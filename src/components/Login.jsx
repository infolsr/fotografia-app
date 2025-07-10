
import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { registrarClienteSiNoExiste } from "../lib/registrarClienteSiNoExiste";

const Login = ({ onLogin }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        registrarClienteSiNoExiste(user);
        if (onLogin) onLogin(user);
      }
    };
    getUser();
  }, [onLogin]);

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({ provider: "google" });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <div className="p-4 text-center">
      {user ? (
        <div>
          <p className="mb-2">Bienvenido, {user.user_metadata.name}</p>
          <img
            src={user.user_metadata.avatar_url}
            alt="Avatar"
            className="w-12 h-12 rounded-full mx-auto mb-2"
          />
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded"
          >
            Cerrar sesión
          </button>
        </div>
      ) : (
        <button
          onClick={handleLogin}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Iniciar sesión con Google
        </button>
      )}
    </div>
  );
};

export default Login;
