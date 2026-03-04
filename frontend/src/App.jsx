// frontend/src/App.jsx
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import LanguageToggle from './components/LanguageToggle.jsx';

import ProfileForm from './components/ProfileForm.jsx';
import ConditionSuggest from './components/ConditionSuggest.jsx';
import MultiSearchInput from './components/MultiSearchInput.jsx';
import InteractionResults from './components/InteractionResults.jsx';
import logo from './assets/logo.png';

import { checkInteractions} from './utils/api.js';
import { tBi } from './utils/tbi';

export default function App() {
  const { t, i18n } = useTranslation();

  // audience: 'consumer' | 'pro'
  const [audience, setAudience] = useState('consumer');

  const [profile, setProfile] = useState({
    dob: '',
    age: '',
    sex: 'F',
    conditions: [],
    allergies: [],
    pregnancy: false,
    liverImpairment: '',
    renalImpairment: '',
  });

  const [selected, setSelected] = useState([]);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const onCheck = async () => {
    if (!selected || selected.length < 2) return;

    setLoading(true);
    try {
      const entities = selected
        .map((s) => s._id || s.id || s.name)
        .filter(Boolean);

      const payload = {
        entities,
        profile: {
          ...profile,
          age: profile.age ? Number(profile.age) : undefined,
        },
        mode: audience,
      };

      const data = await checkInteractions(payload);
      setResults(data || null);

    } catch (err) {
      console.error('checkInteractions error:', err);
      setResults({
        count: 0,
        interactions: [],
        error: 'failed',
      });
    } finally {
      setLoading(false);
    }
  };

  const hasResults =
    Array.isArray(results?.interactions) && results.interactions.length > 0;

  const buttonLabel =
    selected.length < 2
      ? tBi(
          'app.checkButton.disabled',
          'เลือกอย่างน้อย 2 รายการ',
          'Select at least 2 items'
        )
      : loading
      ? tBi(
          'app.checkButton.loading',
          'กำลังตรวจสอบ...',
          'Checking interactions...'
        )
      : tBi(
          'app.checkButton.label',
          'ตรวจสอบปฏิกิริยาระหว่างกัน',
          'Check interactions'
        );

  return (
    <div className="min-h-screen bg-[#fee7e7] text-slate-900">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 py-0.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src={logo}
              alt="DHFI-IC logo"
              className="h-[90px] w-[140px]"
          />
          <div>
            <h1 className="font-semibold text-sm sm:text-base">
              {t(
                'app.title',
                'Drug-Herb–Food Interaction Checker'
              )}
            </h1>
            <p className="text-xs text-gray-500">
              {tBi(
                'app.subtitle',
                'ระบบตรวจสอบอันตรกิริยาระหว่างยา–สมุนไพร–อาหาร-ข้อมูลสุขภาพ',
                'Interaction checking across drugs, herbs, foods, and Health Profiles'
              )}
            </p>
          </div>
          </div>

          <div className="flex items-center gap-3">
            <LanguageToggle />
          </div>
        </div>
      </header>
      

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <ProfileForm value={profile} onChange={setProfile} />

            <ConditionSuggest
              onPick={(ent) => {
                setSelected((prev) =>
                  prev.find((p) => p._id === ent._id)
                    ? prev
                    : [...prev, ent]
                );
              }}
            />
          </div>

          <div className="space-y-4">
            <MultiSearchInput selected={selected} setSelected={setSelected} />
            <button
              onClick={onCheck}
              disabled={selected.length < 2 || loading}
              className="w-full py-3 rounded-xl bg-black text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {buttonLabel}
            </button>
          </div>
        </div>

        {results && (
          <InteractionResults
            data={results}
            mode={audience}
            onModeChange={setAudience}
          />
        )}

        <footer className="text-[11px] text-gray-500 space-y-1">
          {audience === 'consumer' && (
            <div>
              {tBi(
                'app.disclaimer.consumer',
                '*ผลลัพธ์เพื่อการให้ข้อมูล ไม่แทนคำแนะนำแพทย์/เภสัชกร',
                '*For information only. Not a substitute for professional medical advice.'
              )}
            </div>
          )}

          {audience === 'pro' && (
            <div>
              {tBi(
                'app.disclaimer.pro',
                '*ข้อมูลนี้ช่วยสนับสนุนการตัดสินใจเชิงวิชาชีพ ไม่สามารถแทนดุลยพินิจทางคลินิกของผู้สั่งใช้ยาได้',
                '*Intended to support, not replace, the clinical judgement of healthcare professionals.'
              )}
            </div>
          )}
        </footer>

      </main>
    </div>
  );
}
