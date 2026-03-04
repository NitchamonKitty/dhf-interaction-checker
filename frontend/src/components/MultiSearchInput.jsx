import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { searchEntities } from '../utils/api.js';

export default function MultiSearchInput({ selected, setSelected }) {
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const [opts, setOpts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const value = q.trim();
    if (!value || value.length < 3) {
      setOpts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    let cancelled = false;

    const tmr = setTimeout(() => {
      (async () => {
        try {
          const res = await searchEntities(value);
          if (!cancelled) {
            setOpts(Array.isArray(res) ? res.slice(0, 5) : []);
          }
        } catch (e) {
          if (!cancelled) setOpts([]);
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(tmr);
    };
  }, [q]);

  const add = (opt) => {
    if (selected.find(s => s._id === opt._id)) return;
    setSelected([...selected, opt]);
    setQ('');
    setOpts([]);
  };

  const remove = (id) =>
    setSelected(selected.filter(s => s._id !== id));

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && q.trim()) {
      e.preventDefault();
      add({
        _id: Date.now().toString(),
        name: q.trim(),
        type: 'custom'
      });
    }
  };

  return (
    <div className="p-4 bg-white rounded-2xl shadow">
      <h2 className="font-semibold mb-3">
        {t('search.title')}
      </h2>

      <input
        className="w-full border rounded p-2"
        placeholder={t('search.placeholder')}
        value={q}
        onChange={e => setQ(e.target.value)}
        onKeyDown={handleKeyDown}
      />

      {loading && (
        <div className="text-xs text-gray-400 mt-1">
          {t('ui.processing')}
        </div>
      )}

      {opts.length > 0 &&
        <div className="border rounded mt-2 divide-y">
          {opts.map(o => (
            <button
              key={o._id}
              className="px-3 py-2 hover:bg-gray-50 w-full text-left"
              onClick={() => add(o)}
            >
              {o.name}
            </button>
          ))}
        </div>
      }

      {selected.length > 0 &&
        <div className="mt-3 flex flex-wrap gap-2">
          {selected.map(s => (
            <span key={s._id} className="px-2 py-1 rounded-full bg-gray-100">
              {s.name}
              <button
                className="ml-2 text-xs"
                onClick={() => remove(s._id)}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      }
    </div>
  );
}
