import React from "react";
import { RiHome2Line as HomeIcon } from "react-icons/ri";
import { PiGavelLight as GavelRoundedIcon } from "react-icons/pi";
import { IoDocumentTextOutline as DescriptionRoundedIcon } from "react-icons/io5";
import { VscMail as MailIcon } from "react-icons/vsc";
import { IoCartOutline as ShoppingCartIcon } from "react-icons/io5";
import { PiGearSixLight as SettingsIcon } from "react-icons/pi";
import { LiaInfoCircleSolid as InfoIcon } from "react-icons/lia";
import { CiLogout as LogoutIcon } from "react-icons/ci";
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

const iconStyle = "w-6 h-6";
const buttomLink = "flex items-center justify-start text-sm p-4 text-zinc-400 group-hover:text-zinc-950 group-hover:bg-[#afd136] transition-colors duration-200 group";
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
    <div className="fixed h-screen bg-zinc-950/95 text-zinc-200 flex flex-col justify-between shadow-lg z-100 border-r-2 border-[#afd136]/10">
      <div className="p-2">
        <div className="flex items-center justify-center h-10 w-10 rounded-full border-2 border-[#afd136]">
          <img src="/assets/logo-fill.svg" alt="Logo da Chevromais" className="w-5 h-auto" />

        </div>
      </div>

      <div className="flex items-center flex-col">
        {mainNavItems.map((item, index) => {
          const IconComponent = item.icon;

          if (item.type === "link") {
            return (
              <div key={index} className={`group relative w-full`}>
                <a href={item.disabled ? undefined : item.href} className={`${item.disabled ? buttomLinkDisabled : buttomLink} w-full`} title={item.title}>
                  <IconComponent className={iconStyle} />
                </a>
              </div>
            );
          }

          return (
            <div key={index} className={`group relative w-full`}>
              <div className={`${item.disabled ? buttomLinkDisabled : buttomLink} cursor-pointer w-full`}>
                <IconComponent className={iconStyle} />
              </div>

              {!item.disabled && (
                <div className="absolute bg-zinc-900 border-2 border-[#afd136] left-[56px] top-0 opacity-0 shadow-lg shadow-black group-hover:opacity-100 transition-all duration-200 text-zinc-300 w-48 pointer-events-none group-hover:pointer-events-auto">
                  <h2 className="p-2 font-bold uppercase bg-[#afd136] text-black p-2 text-xs tracking-wider">{item.title}</h2>
                  <ul className="space-y-1">
                    {item.links.map((subLink, subIdx) => (
                      <li key={subIdx}>
                        <a href={subLink.href} className="p-4 block hover:text-[#afd136] hover:bg-black/50 transition-all duration-200 hover:pl-6 text-xs">
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

      <div className="w-full flex flex-col pb-2">
        <a className={`${buttomLinkDisabled} mt-2 w-full`}>
          <SettingsIcon className={iconStyle} />
        </a>
        <a className={`${buttomLinkDisabled} w-full`}>
          <InfoIcon className={iconStyle} />
        </a>

        <button
          type="button"
          onClick={handleLogout}
          title="Sair da conta"
          className={`${buttomLink} mb-2 hover:text-red-400 hover:bg-red-500/10 transition-colors duration-200 cursor-pointer w-full border-none outline-none`}
        >
          <LogoutIcon className={iconStyle} />
        </button>
      </div>
    </div>
  );
}