import React from "react";

const Input = React.forwardRef(({ label, type = "text", className = "", ...props }, ref) => {
	return (
		<div className="w-full">
			{label && <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1 select-none">{label}</label>}
			<input ref={ref} type={type} className={`w-full border border-zinc-700 p-2 px-3 bg-zinc-950 text-zinc-100 rounded-xl font-bold font-mono text-xl focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400/50 disabled:bg-zinc-900/50 disabled:text-zinc-600 disabled:border-zinc-800 disabled:cursor-not-allowed transition-colors ${className}`} {...props} />
		</div>
	);
});

export default Input;
