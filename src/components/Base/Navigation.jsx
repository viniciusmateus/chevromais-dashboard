import React from "react";
import Divider from "@mui/material/Divider";
import HomeIcon from "@mui/icons-material/Home";
import SettingsIcon from "@mui/icons-material/Settings";
import InfoIcon from "@mui/icons-material/Info";
import LogoutIcon from "@mui/icons-material/Logout";
import MailIcon from "@mui/icons-material/Mail";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import GavelRoundedIcon from "@mui/icons-material/GavelRounded";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import { supabase } from "@/lib/supabase";

const mainNavItems = [
  { type: "link", href: "/", title: "Início", icon: HomeIcon, borderBottom: false, disabled: false },
  {
    type: "dropdown",
    title: "Disputas",
    icon: GavelRoundedIcon,
    borderTop: true,
    disabled: false,
    links: [
      { label: "Precificar", href: "/disputa/precificar" },
      { label: "Marcas e Modelos", href: "/disputa/marcas-modelos" },
    ],
  },
  {
    type: "dropdown",
    title: "Editais",
    icon: DescriptionRoundedIcon,
    borderBottom: true,
    disabled: false,
    links: [{ label: "Impugnar", href: "/editais/impugnar" }],
  },
  { type: "link", href: "/webmail", title: "Webmail", icon: MailIcon, borderBottom: true, disabled: false },
  {
    type: "dropdown",
    title: "Loja Virtual",
    icon: ShoppingCartIcon,
    borderBottom: true,
    disabled: false,
    links: [
      { label: "Widget", href: "/loja-virtual/widget" },
      { label: "Conversor ZPL", href: "/loja-virtual/conversor-zpl" },
      { label: "Cotação frete", href: "/loja-virtual/cotacao-frete" },
    ],
  },
];

const iconStyle = { fontSize: 24 };
const dividerStyle = { opacity: 0.15, backgroundColor: "white" };
const buttomLink = "flex items-center justify-start text-sm p-4 text-zinc-400 hover:text-lime-400 transition-colors duration-200 hover:bg-zinc-800/60 group";
const buttomLinkDisabled = "flex items-center justify-start text-sm p-4 text-zinc-600 transition-colors duration-200 group cursor-not-allowed";

export default function Navigation() {
  
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  return (
    <div className="fixed h-screen bg-zinc-900 text-zinc-200 flex flex-col shadow-lg z-[100] border-r border-zinc-800">
      <div className="p-2 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center space-x-2">
          <span className="flex justify-center items-center text-base rounded-full bg-zinc-950 border border-zinc-800 text-lime-400 font-bold w-10 h-10 flex-shrink-0 shadow-sm">
            CH
          </span>
        </div>
      </div>

      <div className="flex items-center flex-col">
        {mainNavItems.map((item, index) => {
          const IconComponent = item.icon;
          const borderClasses = `${item.borderTop ? "border-t border-zinc-800" : ""} ${item.borderBottom ? "border-b border-zinc-800" : ""}`;

          if (item.type === "link") {
            return (
              <div key={index} className={`group relative ${borderClasses} w-full`}>
                <a href={item.disabled ? undefined : item.href} className={`${item.disabled ? buttomLinkDisabled : buttomLink} my-2 w-full`} title={item.title}>
                  <IconComponent sx={iconStyle} />
                </a>
              </div>
            );
          }

          return (
            <div key={index} className={`group relative ${borderClasses} w-full`}>
              <div className={`${item.disabled ? buttomLinkDisabled : buttomLink} my-2 group-hover:bg-zinc-800/60 group-hover:text-lime-400 cursor-pointer w-full`}>
                <IconComponent sx={iconStyle} />
              </div>

              {!item.disabled && (
                <div className="absolute bg-zinc-900 border border-zinc-800 p-2 left-[56px] top-0 opacity-0 rounded-r-lg shadow-xl group-hover:opacity-100 transition-all duration-200 text-zinc-300 w-48 pointer-events-none group-hover:pointer-events-auto">
                  <h2 className="border-b border-zinc-800 p-2 mb-2 font-bold uppercase text-lime-400 text-xs tracking-wider">{item.title}</h2>
                  <ul className="space-y-1">
                    {item.links.map((subLink, subIdx) => (
                      <li key={subIdx}>
                        <a href={subLink.href} className="p-2 block hover:bg-lime-400/10 hover:text-lime-400 hover:ring-1 hover:ring-lime-400/30 rounded-lg transition-all duration-200 hover:pl-3 text-xs">
                          {subLink.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-auto w-full flex flex-col">
        <Divider sx={dividerStyle} />
        <a className={`${buttomLinkDisabled} mt-2 w-full`}>
          <SettingsIcon sx={iconStyle} />
        </a>
        <a className={`${buttomLinkDisabled} w-full`}>
          <InfoIcon sx={iconStyle} />
        </a>

        <button
          type="button"
          onClick={handleLogout}
          title="Sair da conta"
          className={`${buttomLink} mb-2 hover:text-red-400 hover:bg-red-500/10 transition-colors duration-200 cursor-pointer w-full border-none outline-none`}
        >
          <LogoutIcon sx={iconStyle} />
        </button>

        <p className="text-xs text-center text-zinc-600 mb-4 font-mono">v0.5.0</p>
      </div>
    </div>
  );
}