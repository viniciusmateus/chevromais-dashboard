import React from "react";
import Divider from "@mui/material/Divider";
import HomeIcon from "@mui/icons-material/Home";
import SettingsIcon from "@mui/icons-material/Settings";
import InfoIcon from "@mui/icons-material/Info";
import LogoutIcon from "@mui/icons-material/Logout";

import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import GavelRoundedIcon from "@mui/icons-material/GavelRounded";
import ChangeCircleOutlinedIcon from "@mui/icons-material/ChangeCircleOutlined";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";

// Mapeamento dos botões centrais para fácil gerenciamento
const mainNavItems = [
  {
    type: "link",
    href: "/",
    title: "Início",
    icon: HomeIcon,
    borderBottom: false,
    disabled: false,
  },
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
    disabled: false, // troque para true se quiser desabilitar novamente
    links: [
      { label: "Impugnar", href: "/editais/impugnar" },
    ],
  },
  {
    type: "link",
    href: "#",
    title: "Alterações",
    icon: ChangeCircleOutlinedIcon,
    borderBottom: true,
    disabled: true,
  },
  {
    type: "link",
    href: "/loja-virtual",
    title: "Loja Virtual",
    icon: ShoppingCartIcon,
    disabled: false,
  },
];

// Estilos de ícone e divisor (mesmo padrão do seu código)
const iconStyle = { fontSize: 24 };
const dividerStyle = {
  opacity: 0.15,
  backgroundColor: "white",
};

// Classes de botão estilizadas para o tema dark + verde limão
const buttomLink =
  "flex items-center justify-start text-sm p-4 text-zinc-400 hover:text-lime-400 transition-colors duration-200 hover:bg-zinc-800/60 group";
const buttomLinkDisabled =
  "flex items-center justify-start text-sm p-4 text-zinc-600 transition-colors duration-200 group cursor-not-allowed";

export default function Navigation({ handleLogout }) {
  return (
    <div className="fixed h-screen bg-zinc-900 text-zinc-200 flex flex-col shadow-lg z-1 border-r border-zinc-800">
      {/* Cabeçalho */}
      <div className="p-2 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center space-x-2">
          <span className="flex justify-center items-center text-base rounded-full bg-zinc-950 border border-zinc-800 text-lime-400 font-bold w-10 h-10 flex-shrink-0 shadow-sm">
            CH
          </span>
        </div>
      </div>

      {/* Menu Principal (Mapeado) */}
      <div className="flex items-center flex-col">
        {mainNavItems.map((item, index) => {
          const IconComponent = item.icon;
          const borderClasses = `${item.borderTop ? "border-t border-zinc-800" : ""} ${
            item.borderBottom ? "border-b border-zinc-800" : ""
          }`;

          // Se for botão simples de Link
          if (item.type === "link") {
            return (
              <div key={index} className={`group relative ${borderClasses}`}>
                <a
                  href={item.disabled ? undefined : item.href}
                  className={`${item.disabled ? buttomLinkDisabled : buttomLink} my-2`}
                  title={item.title}
                >
                  <IconComponent sx={iconStyle} />
                </a>
              </div>
            );
          }

          // Se for botão com Dropdown (Mesma estrutura absoluta e animação hover do seu código)
          return (
            <div key={index} className={`group relative ${borderClasses}`}>
              <div
                className={`${
                  item.disabled ? buttomLinkDisabled : buttomLink
                } my-2 group-hover:bg-zinc-800/60 group-hover:text-lime-400 cursor-pointer`}
              >
                <IconComponent sx={iconStyle} />
              </div>

              {!item.disabled && (
                <div className="absolute bg-zinc-900 border border-zinc-800 p-2 left-[-200px] group-hover:left-[56px] top-0 opacity-0 rounded-r-lg shadow-xl group-hover:opacity-100 transition-all duration-200 text-zinc-300 w-48 z-50 pointer-events-none group-hover:pointer-events-auto">
                  <h2 className="border-b border-zinc-800 p-2 mb-2 font-bold uppercase text-lime-400 text-xs tracking-wider">
                    {item.title}
                  </h2>
                  <ul className="space-y-1">
                    {item.links.map((subLink, subIdx) => (
                      <li key={subIdx}>
                        <a
                          href={subLink.href}
                          className="p-2 block hover:bg-lime-400/10 hover:text-lime-400 hover:ring-1 hover:ring-lime-400/30 rounded-lg transition-all duration-200 hover:pl-3 text-xs"
                        >
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

      {/* Outros links ou informações */}
      <div className="mt-auto">
        <Divider sx={dividerStyle} />
        <a className={`${buttomLinkDisabled} mt-2`}>
          <SettingsIcon sx={iconStyle} />
        </a>
        <a className={`${buttomLinkDisabled} mt-2`}>
          <InfoIcon sx={iconStyle} />
        </a>
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            if (handleLogout) handleLogout();
          }}
          className={`${buttomLink} mt-2 hover:text-red-400`}
        >
          <LogoutIcon sx={iconStyle} />
        </a>
        <p className="text-xs text-center text-zinc-600 my-2 font-mono">v0.1a</p>
      </div>
    </div>
  );
}