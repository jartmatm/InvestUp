import React from "react";

type NavItemProps = {
  label: string;
  active?: boolean;
};

function NavItem({ label, active }: NavItemProps) {
  return (
    <div className={`flex flex-col items-center ${active ? "text-primary" : "text-gray-500"}`}>
      <span className="text-xs mt-1">{label}</span>
    </div>
  );
}

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 flex justify-around py-3">
      <NavItem label="Inicio" active />
      <NavItem label="Cartera" />
      <NavItem label="Perfil" />
    </nav>
  );
}
