import React from "react";

export const Loading: React.FC = () => {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-white/80 backdrop-blur-sm">
      <div className="relative">
        {/* Pulsing circles */}
        <div className="absolute inset-0 animate-ping-slow rounded-full bg-blue-400 opacity-20" />
        <div
          className="absolute inset-0 animate-ping rounded-full bg-blue-400 opacity-20"
          style={{ animationDelay: "0.2s" }}
        />
        <div
          className="absolute inset-0 animate-ping-fast rounded-full bg-blue-500 opacity-20"
          style={{ animationDelay: "0.4s" }}
        />

        {/* Center content */}
        <div className="relative flex items-center justify-center w-16 h-16">
          <svg
            className="w-8 h-8 text-blue-600 animate-spin"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
      </div>
    </div>
  );
};
