import { ChevronDown } from 'lucide-react';
import { useCredits, CreditsMode } from '@/contexts/CreditsContext';
import { getModeInfo } from '@/lib/creditsEstimator';
import { useState } from 'react';

/**
 * Mode Selector Component
 * Allows users to switch between Normal, Pro, and Premium modes
 * Affects credits cost multiplier across the platform
 */

export default function ModeSelector() {
  const { selectedMode, setSelectedMode } = useCredits();
  const [isOpen, setIsOpen] = useState(false);

  const modes: CreditsMode[] = ['Normal', 'Pro', 'Premium'];
  const currentModeInfo = getModeInfo(selectedMode);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#11161D] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)] text-sm font-medium text-[rgba(255,255,255,0.92)] transition-colors"
        title={currentModeInfo.description}
      >
        <span>{currentModeInfo.name}</span>
        <span className="text-xs text-[rgba(255,255,255,0.68)]">
          {currentModeInfo.multiplier}x
        </span>
        <ChevronDown size={16} className="text-[rgba(255,255,255,0.68)]" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-[#0b0e12] border border-[rgba(255,255,255,0.06)] rounded-lg shadow-lg z-50">
          {modes.map((mode) => {
            const modeInfo = getModeInfo(mode);
            const isActive = selectedMode === mode;

            return (
              <button
                key={mode}
                onClick={() => {
                  setSelectedMode(mode);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-3 border-b border-[rgba(255,255,255,0.06)] last:border-b-0 transition-colors ${
                  isActive
                    ? 'bg-[#11161D] border-l-2 border-l-[#c0c0c0]'
                    : 'hover:bg-[#11161D]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-[rgba(255,255,255,0.92)]">
                      {modeInfo.name}
                    </div>
                    <div className="text-xs text-[rgba(255,255,255,0.68)]">
                      {modeInfo.description}
                    </div>
                  </div>
                  {isActive && (
                    <div className="w-2 h-2 rounded-full bg-[#c0c0c0]" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
