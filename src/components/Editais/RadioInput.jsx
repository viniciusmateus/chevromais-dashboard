import React from "react";

export default function RadioGroup({ label, name, value, checked, onChange }) {
  return (
    <label className="flex items-center space-x-2 cursor-pointer select-none group">
      <input
        type="radio"
        name={name}
        value={value}
        className="peer hidden"
        checked={checked}
        onChange={onChange}
      />
      <div className="w-4 h-4 border-2 border-zinc-600 rounded-full flex items-center justify-center transition-all duration-200 peer-checked:border-lime-400 peer-checked:bg-lime-400 group-hover:border-zinc-500">
        <div className="w-1.5 h-1.5 rounded-full bg-zinc-950 opacity-0 peer-checked:opacity-100 transition-opacity" />
      </div>
      <span className="text-zinc-400 peer-checked:text-zinc-100 text-sm font-medium peer-checked:font-bold transition-colors">
        {label}
      </span>
    </label>
  );
}