import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { searchConditions, getConditionSuggested } from '../utils/api.js';

export default function ConditionSuggest({ value = [], onChange, onPick }) {
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const [list, setList] = useState([]);
  const [suggest, setSuggest] = useState([]);

  const onSearch = async (val) => {
    setQ(val);
    if (!val) { setList([]); return; }
    const res = await searchConditions(val);
    setList(res);
  };

  const recomputeSuggest = async (conds) => {
    const allSuggests = [];
    for (const cond of conds) {
      const s = await getConditionSuggested(cond._id);
      allSuggests.push(...(s || []));
    }
    const uniq = [];
    const seen = new Set();
    for (const e of allSuggests) {
      const id = String(e._id);
      if (!seen.has(id)) { uniq.push(e); seen.add(id); }
    }
    setSuggest(uniq);
  };

  const addCondition = async (c) => {
    const exist = (value || []).find(x => x._id === c._id);
    const next = exist ? value : [...(value || []), c];
    onChange && onChange(next);
    try { await recomputeSuggest(next); } catch {}
  };

  const removeCondition = (id) => {
    const next = (value || []).filter(x => x._id !== id);
    onChange && onChange(next);
    (async () => {
      try { await recomputeSuggest(next); } catch {}
    })();
  };

  return (
    <div className="p-4 bg-white rounded-2xl shadow">
      <h2 className="font-semibold mb-3">
        {t('cond.title', { defaultValue: 'Disease-to-Drug Suggestion' })}
      </h2>

      {(value?.length > 0) &&
        <div className="mb-2 flex flex-wrap gap-2">
          {value.map(c => (
            <span key={c._id} className="px-2 py-1 rounded-full bg-gray-100">
              {c.name}
              <button className="ml-2 text-xs" onClick={() => removeCondition(c._id)}>✕</button>
            </span>
          ))}
        </div>
      }

      <input
        className="w-full border rounded p-2 mb-2"
        placeholder={t('cond.placeholder', { defaultValue: 'Type a condition, e.g., OA, afib' })}
        value={q}
        onChange={e => onSearch(e.target.value)}
      />

      {list.length > 0 &&
        <div className="text-sm mb-2">
          <div className="font-medium">
            {t('cond.found', { defaultValue: 'Found conditions:' })}
          </div>
          <div className="flex flex-wrap gap-2 mt-1">
            {list.map(c => (
              <button
                key={c._id}
                onClick={() => addCondition(c)}
                className="px-2 py-1 rounded-full bg-gray-100 hover:bg-gray-200"
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      }

      {suggest.length > 0 &&
        <div className="text-sm">
          <div className="font-medium">
            {t('cond.suggest', { defaultValue: 'Related suggestions:' })}
          </div>
          <div className="flex flex-wrap gap-2 mt-1">
            {suggest.map(e => (
              <button
                key={e._id}
                onClick={() => onPick && onPick(e)}
                className="px-2 py-1 rounded-full border"
              >
                {e.name}
              </button>
            ))}
          </div>
        </div>
      }
    </div>
  );
}
