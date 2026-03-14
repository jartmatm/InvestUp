import React from "react";
import { Home, Wallet, User } from "lucide-react";

type NavItemProps = {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
};

function NavItem({ icon, label, active }: NavItemProps) {
  return (
    <div className={`flex flex-col items-center ${active ? "text-primary" : "text-gray-500"}`}>
      {icon}
      <span className="text-xs mt-1">{label}</span>
    </div>
  );
}

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 flex justify-around py-3">
      <NavItem icon={<Home size={22} />} label="Inicio" active />
      <NavItem icon={<Wallet size={22} />} label="Cartera" />
      <NavItem icon={<User size={22} />} label="Perfil" />
    </nav>
  );
}
