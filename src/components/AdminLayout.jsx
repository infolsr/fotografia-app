// En: src/components/AdminLayout.jsx
import React from "react";
import { Link, Outlet, useLocation } from "react-router-dom";

const AdminLayout = () => {
  const location = useLocation();

  const getLinkClass = (path) => {
    return location.pathname === path
      ? "bg-blue-600 text-white"
      : "bg-white text-gray-700 hover:bg-gray-100";
  };

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-gray-800 text-white p-4">
        <h1 className="text-2xl font-bold mb-8">Admin</h1>
        <nav className="flex flex-col space-y-2">
          <Link to="/admin" className={`px-4 py-2 rounded-md text-sm ${getLinkClass("/admin")}`}>
            Dashboard
          </Link>
          <Link to="/admin/pedidos" className={`px-4 py-2 rounded-md text-sm ${getLinkClass("/admin/pedidos")}`}>
            Gestión de Pedidos
          </Link>
          <Link to="/admin/productos" className={`px-4 py-2 rounded-md text-sm ${getLinkClass("/admin/productos")}`}>
            Gestión de Productos
          </Link>
          <Link to="/admin/descuentos" className={`px-4 py-2 rounded-md text-sm ${getLinkClass("/admin/descuentos")}`}>
            Gestión de Descuentos
          </Link>
          {/* Aquí puedes añadir más enlaces en el futuro, como "Descuentos" */}
        </nav>
      </aside>
      <main className="flex-grow p-6 bg-gray-100">
        {/* El contenido de cada ruta anidada se renderizará aquí */}
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;