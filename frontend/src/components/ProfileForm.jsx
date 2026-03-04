import React from 'react';
import { useTranslation } from 'react-i18next';

export default function ProfileForm({ value, onChange }) {
  const { t, i18n } = useTranslation();
  const v = value || {};
  const set = (patch) => onChange({ ...v, ...patch });

  const pkConditions = [
    { id: 'COND_SMOKING', i18nKey: 'profile.pkConditions.smoking' },
    { id: 'COND_RENAL_IMPAIRMENT', i18nKey: 'profile.pkConditions.renal' },
    { id: 'COND_HEPATIC_IMPAIRMENT', i18nKey: 'profile.pkConditions.hepatic' },
  ];

  const selectedConds = Array.isArray(v.conditions) ? v.conditions : [];

  const toggleCondition = (id) => {
    const setConds = new Set(selectedConds);
    if (setConds.has(id)) setConds.delete(id);
    else setConds.add(id);
    set({ conditions: Array.from(setConds) });
  };

  return (
    <div className="p-4 bg-white rounded-2xl shadow space-y-3" key={i18n.language}>
      <h2 className="font-semibold">{t('profile.title')}</h2>

      {/* --- อายุ + เพศ --- */}
      <div className="grid grid-cols-2 gap-3">
        {/* อายุ */}
        <div>
          <label className="block text-sm text-gray-600">
            {t('profile.age')}
          </label>
          <input
            type="number"
            min="0"
            className="mt-1 w-full border rounded px-2 py-1 text-sm"
            value={v.age ?? ''}
            onChange={(e) => set({ age: e.target.value })}
            placeholder={t('profile.agePh')}
          />
        </div>

        {/* เพศ */}
        <div>
          <label className="block text-sm text-gray-600">
            {t('profile.sex')}
          </label>
          <select
            className="mt-1 w-full border rounded px-2 py-1 text-sm"
            value={v.sex || ''}
            onChange={(e) => set({ sex: e.target.value })}
          >
            <option value="">{t('ui.select')}</option>
            <option value="F">{t('profile.sexF')}</option>
            <option value="M">{t('profile.sexM')}</option>
            <option value="O">{t('profile.sexO')}</option>
          </select>
        </div>
      </div>

      {/* --- ตั้งครรภ์ --- */}
      <div>
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!!v.pregnancy}
            onChange={(e) => set({ pregnancy: e.target.checked })}
          />
          <span>{t('profile.pregnancy')}</span>
        </label>
      </div>

      {/* --- PK-related conditions --- */}
      <div className="border-t pt-3 mt-2">
        <p className="text-sm font-medium mb-2">
          {t('profile.pkConditions.title')}
        </p>

        <div className="flex flex-col gap-1">
          {pkConditions.map((c) => {
            const checked = selectedConds.includes(c.id);
            return (
              <label
                key={c.id}
                className="inline-flex items-center gap-2 text-sm cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleCondition(c.id)}
                />
                <span>{t(c.i18nKey)}</span>
              </label>
            );
          })}
        </div>
      </div>

    </div>
  );
}
