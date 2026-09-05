import React from "react";

export function SkewButton({
  children,
  onClick,
  disabled = false,
  icon,
  className = "",
  ...props
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`group relative z-10 w-full flex items-center my-6 cursor-pointer justify-center gap-3 py-4 px-6 font-black text-base transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-[#afd136] focus:ring-offset-2 focus:ring-offset-zinc-950 transform skew-x-[-4deg] overflow-hidden ${
        disabled
          ? "bg-zinc-800/50 text-zinc-500 cursor-not-allowed border border-zinc-700"
          : "bg-transparent border border-[#afd136] text-[#afd136] hover:text-zinc-950"
      } ${className}`}
      {...props}
    >
      {!disabled && (
        <div className="absolute inset-0 bg-[#afd136] -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out z-0" />
      )}

      {icon && (
        <div className="relative z-10 shrink-0 transform skew-x-[4deg]">
          {icon}
        </div>
      )}

      <span className="relative z-10 tracking-widest transform skew-x-[4deg]">
        {children}
      </span>
    </button>
  );
}
