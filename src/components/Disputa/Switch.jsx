// Switch.jsx
export default function ToggleSwitch({ checked, onChange, ...props }) {
  return (
    <label className="relative inline-block w-9 h-5 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        {...props}
        className="peer sr-only"
      />
      <div className="peer-checked:bg-lime-400 bg-zinc-700 w-full h-full rounded-full transition-colors duration-300"></div>
      <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-zinc-950 transition-transform duration-300 peer-checked:translate-x-4"></div>
    </label>
  );
}