import React, { useRef } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

export default function ColorSwatch({ color, index, canRemove, onRemove, onChange, large }) {
  const inputRef = useRef(null);
  const size = large ? "w-11 h-11" : "w-8 h-8";

  return (
    <motion.div
      className="relative group"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <motion.button
        onClick={() => inputRef.current?.click()}
        className={`${size} rounded-full border-2 border-white/20 hover:border-white/60 transition-all shadow-lg`}
        style={{ backgroundColor: color }}
        title={color}
        whileHover={{ scale: 1.1 }}
      />
      <input
        ref={inputRef}
        type="color"
        value={color}
        onChange={(e) => onChange(e.target.value)}
        className="sr-only"
      />
      {canRemove && (
        <motion.button
          onClick={onRemove}
          initial={{ scale: 0 }}
          whileHover={{ scale: 1 }}
          className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full items-center justify-center hidden group-hover:flex transition-all z-10"
        >
          <X className="w-2.5 h-2.5 text-white" />
        </motion.button>
      )}
    </motion.div>
  );
}