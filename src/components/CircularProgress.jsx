import React from 'react';

const CircularProgress = ({ progress = 0, message = "Procesando", isProcessing = false }) => {
  // La lógica para calcular el círculo se mantiene igual
  const radius = 80;
  const stroke = 12;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    // 1. Se añade un contenedor 'flex' para apilar los elementos verticalmente
    <div className="flex flex-col items-center justify-center">
      
      {/* 2. Este es tu contenedor original, ahora sin el mensaje */}
      <div className="relative inline-flex items-center justify-center">
        <svg
          height={radius * 2}
          width={radius * 2}
          className="transform -rotate-90"
        >
          <circle
            className="text-gray-300"
            stroke="currentColor"
            strokeWidth={stroke}
            fill="transparent"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          <circle
            className="text-green-500"
            stroke="currentColor"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="transparent"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
            style={{ transition: 'stroke-dashoffset 0.35s ease' }}
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center">
          {/* Se mantiene solo el porcentaje DENTRO del círculo */}
          <span className="text-4xl font-bold text-gray-700">{`${Math.round(progress)}%`}</span>
        </div>
      </div>

      {/* 3. El mensaje ahora vive AFUERA y DEBAJO del círculo */}
      <span 
        className={`text-base text-gray-500 mt-2 ${isProcessing ? 'blink-me' : ''}`}
      >
        {message}
      </span>

    </div>
  );
};

export default CircularProgress;