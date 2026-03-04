import React from 'react';

export default function AudienceToggle({ value = 'consumer', onChange }) {
  return (
    <div className="inline-flex rounded-xl border overflow-hidden">
      <button
        className={`px-3 py-1 text-sm ${value === 'consumer' ? 'bg-black text-white' : 'bg-white'}`}
        onClick={() => onChange?.('consumer')}
      >
        Public mode
      </button>
      <button
        className={`px-3 py-1 text-sm ${value === 'pro' ? 'bg-black text-white' : 'bg-white'}`}
        onClick={() => onChange?.('pro')}
      >
        Expert mode
      </button>
    </div>
  );
}
