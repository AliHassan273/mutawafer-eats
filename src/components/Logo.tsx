import React from 'react';

export default function Logo({ size = 'md', lang = 'ar' }: { size?: 'sm' | 'md' | 'lg', lang?: 'ar' | 'en' }) {
  const dimensions = {
    sm: 'h-10 w-10',
    md: 'h-14 w-14 sm:h-16 sm:w-16',
    lg: 'h-28 w-28 sm:h-32 sm:w-32'
  }[size];

  return (
    <div className={`relative ${dimensions} select-none transition-all duration-300 flex items-center justify-center shrink-0`}>
      {/* 3D Smartphone bezel & Screen and Yellow/Golden Bag Styled exactly like image */}
      <svg
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_4px_16px_rgba(15,23,42,0.12)] hover:scale-105 transition-transform duration-300"
      >
        {/* Outer Phone Bezel / Screen (Tilted Left in 3D perspective) */}
        <g transform="rotate(-15 60 60)">
          {/* Main phone body bezel with smooth gradient */}
          <rect
            x="12"
            y="12"
            width="58"
            height="96"
            rx="14"
            fill="url(#phoneBezelGradient)"
            stroke="url(#phoneBorderGradient)"
            strokeWidth="3"
          />
          {/* Elegant screen inner glass display */}
          <rect
            x="17"
            y="17"
            width="48"
            height="86"
            rx="10"
            fill="url(#phoneScreenGradient)"
          />
          
          {/* Speaker ear slit */}
          <rect
            x="34"
            y="20"
            width="14"
            height="2.5"
            rx="1.25"
            fill="#cbd5e1"
            opacity="0.9"
          />
          {/* Glass glare overlay */}
          <path
            d="M 17 17 L 65 17 L 17 80 Z"
            fill="#ffffff"
            opacity="0.1"
            pointerEvents="none"
          />
        </g>

        {/* 3D Shopping Bag (Tilted Right on top of the phone) */}
        <g transform="rotate(6 74 66)" className="drop-shadow-[0_8px_20px_rgba(180,83,9,0.35)]">
          {/* Bag dual golden handles in 3D arches behind the bag lip */}
          <path
            d="M 42 38 C 42 16, 74 16, 74 38"
            stroke="url(#handleGradient)"
            strokeWidth="4.5"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 50 38 C 50 21, 66 21, 66 38"
            stroke="url(#handleHighlightGradient)"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />

          {/* Golden bag body envelope */}
          <path
            d="M 32 38 L 84 38 L 92 98 C 92 101, 89 103, 86 103 L 30 103 C 27 103, 24 101, 24 98 Z"
            fill="url(#bagBodyGradient)"
            stroke="url(#bagBorderGradient)"
            strokeWidth="2"
          />

          {/* Ambient overlay shade highlighting the fold contours of the bag */}
          <path
            d="M 32 38 L 42 38 L 36 103 L 30 103 Z"
            fill="white"
            opacity="0.15"
          />

          {/* Core Logo Label text - Arabic text "متوفر" formatted precisely to replicate block typography */}
          <text
            x="58"
            y="69"
            fill="white"
            fontFamily="system-ui, -apple-system, 'SF Pro Text', sans-serif"
            fontWeight="900"
            fontSize="18.5"
            textAnchor="middle"
            dominantBaseline="central"
            filter="url(#textPopShadow)"
            stroke="#b45309"
            strokeWidth="1.5"
            paintOrder="stroke"
            className="select-none tracking-tight font-extrabold"
          >
            {lang === 'ar' ? 'متوفر' : 'Mutafer'}
          </text>

          {/* Subtitle tag "الغالي للغوالي" */}
          <text
            x="58"
            y="88"
            fill="white"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontWeight="800"
            fontSize="8.5"
            textAnchor="middle"
            dominantBaseline="central"
            opacity="0.95"
            filter="url(#subPopShadow)"
          >
            {lang === 'ar' ? 'الغالي للغوالي' : 'Premium delivery'}
          </text>
        </g>

        {/* DEFINITIONS AND DEFINE GRADIENTS / SHADOWS */}
        <defs>
          {/* Phone housing high tech blue to sky blue gradients */}
          <linearGradient id="phoneBezelGradient" x1="12" y1="12" x2="70" y2="108" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="60%" stopColor="#0ea5e9" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>
          <linearGradient id="phoneBorderGradient" x1="12" y1="12" x2="12" y2="108" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#e0f2fe" />
            <stop offset="100%" stopColor="#0369a1" />
          </linearGradient>
          
          {/* Phone screen gradient reflecting clean interface */}
          <linearGradient id="phoneScreenGradient" x1="17" y1="17" x2="65" y2="103" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>

          {/* Bag arches gradients */}
          <linearGradient id="handleGradient" x1="42" y1="16" x2="74" y2="38" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#b45309" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#78350f" />
          </linearGradient>
          <linearGradient id="handleHighlightGradient" x1="50" y1="16" x2="66" y2="38" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>

          {/* Premium gourmet yellow/gold bag gradient */}
          <linearGradient id="bagBodyGradient" x1="32" y1="38" x2="88" y2="103" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#fcd34d" />
            <stop offset="35%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
          <linearGradient id="bagBorderGradient" x1="32" y1="38" x2="32" y2="103" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="100%" stopColor="#78350f" />
          </linearGradient>

          {/* 3D Stroke pop shadows for clean text read */}
          <filter id="textPopShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2.5" stdDeviation="0.4" floodColor="#78350f" floodOpacity="0.8" />
          </filter>
          <filter id="subPopShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1.2" stdDeviation="0.2" floodColor="#78350f" floodOpacity="0.75" />
          </filter>
        </defs>
      </svg>
    </div>
  );
}
