import React from 'react';

interface NoeticLogoProps {
  className?: string;
  size?: number;
}

/**
 * Custom vector brand glyph for Noetic.ai
 * Designed as a precision geometric neural 'N' with an illuminated synaptic node.
 * Strictly NOT a compass.
 */
export const NoeticLogo: React.FC<NoeticLogoProps> = ({ 
  className = "w-5 h-5", 
  size 
}) => {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={size ? { width: size, height: size } : undefined}
      aria-label="Noetic.ai Logo"
    >
      {/* Left ascending pillar */}
      <path
        d="M6 25V7C6 5.89543 6.89543 5 8 5H10.5C11.6046 5 12.5 5.89543 12.5 7V16.5L8.5 25H6Z"
        fill="currentColor"
        fillOpacity="0.75"
      />
      {/* Right descending pillar */}
      <path
        d="M19.5 15.5L23.5 7H26C27.1046 7 28 7.89543 28 9V25C28 26.1046 27.1046 27 26 27H23.5C22.3954 27 21.5 26.1046 21.5 25V15.5H19.5Z"
        fill="currentColor"
      />
      {/* Dynamic central diagonal synaptic bridge */}
      <path
        d="M9 7L23 25"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      {/* Central neural intelligence spark node */}
      <circle
        cx="16"
        cy="16"
        r="3"
        fill="#ffffff"
        className="drop-shadow-sm"
      />
      <circle
        cx="16"
        cy="16"
        r="1.5"
        fill="currentColor"
      />
    </svg>
  );
};
