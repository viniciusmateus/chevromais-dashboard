// Button.jsx
import React from "react";

export default function Button({ label, name, onClick }) {
  return (
    <button
      name={name}
      id={name}
      onClick={onClick}
      className="w-full border border-lime-400/20 bg-lime-400 text-zinc-950 p-3 text-xs font-bold rounded-xl cursor-pointer uppercase col-span-2 hover:bg-lime-300 transition-all duration-200 shadow-lg hover:shadow-lime-400/10 active:scale-[0.98] select-none"
    >
      {label}
    </button>
  );
}