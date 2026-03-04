// frontend/src/components/InteractionResults.jsx
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import EvidenceTag from './EvidenceTag';
import AudienceToggle from './AudienceToggle';

function extractLocalId(iri) {
  if (!iri) return '';
  const s = String(iri);
  const hash = s.lastIndexOf('#');
  const slash = s.lastIndexOf('/');
  const idx = Math.max(hash, slash);
  return idx >= 0 ? s.slice(idx + 1) : s;
}

function isConditionDrugInteraction(ix) {
  if (!ix || typeof ix !== 'object') return false;

  const source = String(ix.source || '').toLowerCase();
  if (source === 'condition') return true;

  const inf = String(ix.inferencePattern || '').toUpperCase();
  if (inf.startsWith('CONDITION_')) return true;

  const aIri = ix.a?._id || ix.a?.id || ix.a?.iri || '';
  const aLocal = extractLocalId(aIri);
  if (/^ENT_COND_/i.test(String(aLocal))) return true;

  return false;
}

function isDerivedFromCombination(ix) {
  if (!ix || typeof ix !== 'object') return false;
  return ix.derivedFromCombination === true;
}

function getDuplicationKind(ix) {
  if (!ix || typeof ix !== 'object') return null;

  const src = String(ix.source || '').toLowerCase();
  const inf = String(ix.inferencePattern || '').toUpperCase();

  if (src === 'duplication') {
    if (inf === 'PHARMACOLOGICAL_EFFECT_DUPLICATION') return 'effect';
    if (inf === 'DRUGCLASS_DUPLICATION') return 'drugclass';
    return 'duplication';
  }

  if (inf === 'PHARMACOLOGICAL_EFFECT_DUPLICATION') return 'effect';
  if (inf === 'DRUGCLASS_DUPLICATION') return 'drugclass';

  return null;
}

function getDerivation(ix) {
  const src = String(ix?.source || '').toLowerCase();
  const inf = String(ix?.inferencePattern || '').toUpperCase();

  if (src === 'curated') return 'curated';
  if (src === 'inferred') return 'inferred';

  if (src === 'condition') {
    return inf === 'CONDITION_DRUG_CURATED' ? 'curated' : 'inferred';
  }

  if (src === 'duplication') return 'inferred';

  return 'curated';
}

function normalizeInteraction(ix) {
  const aIri = ix.a?._id || '';
  const bIri = ix.b?._id || '';

  const aName = ix?.a?.name || ix?.a?.label_en || ix?.a?.label || '';
  const bName = ix?.b?.name || ix?.b?.label_en || ix?.b?.label || '';

  const evidenceId = ix.evidenceId || '';

  const refs = Array.isArray(ix?.references) ? ix.references : [];

  const derivedCombo = isDerivedFromCombination(ix);
  const comboLabel = ix?.combinationLabel || '';
  const comboParent = ix?.combinationParent || '';

  return {
    aIri,
    bIri,
    aName,
    bName,
    evidenceId,
    refs,
    derivedCombo,
    comboLabel,
    comboParent,
  };
}

function ReferenceList({ refs, ixId }) {
  const { t } = useTranslation();

  if (!Array.isArray(refs) || refs.length === 0) return null;

  return (
    <div>
      <div className="text-[11px] text-gray-500 mb-0.5">
        {t('results.referencesLabel')}
      </div>

      <ul className="space-y-0.5">
        {refs.map((r, i) => {
          
          const url = r?.url || '';
          const label = r?.title || `${t('results.refPrefix')} ${i + 1}`;

          const sideRaw = (r?.forSide || '').toString().toLowerCase(); // 'a' | 'b'
          const side = sideRaw === 'a' ? 'A' : sideRaw === 'b' ? 'B' : '';

          const entLabel = r?.forEntityLabel || '';
          const entIri = r?.forEntityIri || '';
          const entLocal = entIri ? extractLocalId(entIri) : '';

          const targetLabel = r?.supportTargetLabel || '';
          const targetIri = r?.supportTargetIri || '';
          const targetLocal = targetIri ? extractLocalId(targetIri) : '';

          const metaParts = [];
          if (side) metaParts.push(`${side}`);
          if (entLabel || entLocal) metaParts.push(`${entLabel || entLocal}`);
          if (targetLabel || targetLocal) metaParts.push(`→ ${targetLabel || targetLocal}`);

          const metaText = metaParts.length ? metaParts.join(' · ') : '';

          return (
            <li key={`${ixId}-ref-${i}`} className="text-[11px]">
              {url ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="underline text-blue-600"
                >
                  {label}
                </a>
              ) : (
                <span>{label}</span>
              )}

              {metaText && (
                <div className="text-[10px] text-gray-500 mt-0.5">
                  {t('results.refSupports', 'Supports')}: {metaText}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function InteractionCard({ ix, mode, isInferred }) {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language || 'th').toLowerCase();

  const {
    aIri,
    bIri,
    aName,
    bName,
    evidenceId,
    refs,
    derivedCombo,
    comboLabel,
    comboParent,
  } = normalizeInteraction(ix);

  const aLocalId = extractLocalId(aIri);
  const bLocalId = extractLocalId(bIri);

  const mechText =
    lang === 'th'
      ? ix?.mechanism?.th || ix?.mechanism?.en || ''
      : ix?.mechanism?.en || ix?.mechanism?.th || '';

  const actionText =
    lang === 'th'
      ? ix?.action?.th || ix?.action?.en || ''
      : ix?.action?.en || ix?.action?.th || '';

  const isCondDrug = isConditionDrugInteraction(ix);
  const duplicationKind = getDuplicationKind(ix);

  const showRefs = mode === 'pro' && (refs.length > 0 || ix?.hasKgGraph);

  return (
    <div className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="font-semibold flex items-center gap-2">
            <span>
              {(aName || aLocalId) || t('results.entityA')}{' '}
              <span className="text-xs text-gray-400">×</span>{' '}
              {(bName || bLocalId) || t('results.entityB')}
            </span>

            {isCondDrug && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-emerald-300 bg-emerald-50 text-emerald-700">
                {t('results.conditionDrugBadge', 'Condition–Drug')}
              </span>
            )}

            {derivedCombo && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full border border-sky-300 bg-sky-50 text-sky-700"
                title={
                  comboLabel
                    ? `${t('results.derivedFromCombination', 'Derived from combination')}: ${comboLabel}`
                    : comboParent
                      ? `${t('results.derivedFromCombination', 'Derived from combination')}: ${comboParent}`
                      : t('results.derivedFromCombination', 'Derived from combination')
                }
              >
                {t('results.derivedFromCombination', 'Derived from combination')}
                {(comboLabel || comboParent) && (
                  <span className="ml-1 text-[10px] text-sky-700/80 font-normal">
                    ({comboLabel || comboParent})
                  </span>
                )}
              </span>
            )}

            {duplicationKind === 'effect' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-amber-300 bg-amber-50 text-amber-800">
                {t('results.effectDuplicationBadge', 'Effect Duplication')}
              </span>
            )}
            {duplicationKind === 'drugclass' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-orange-300 bg-orange-50 text-orange-800">
                {t('results.drugclassDuplicationBadge', 'Drug class duplication')}
              </span>
            )}
            {duplicationKind === 'duplication' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-orange-300 bg-orange-50 text-orange-800">
                {t('results.duplicationBadge', 'Duplication')}
              </span>
            )}

            {isInferred && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-purple-300 bg-purple-50 text-purple-700">
                {t('results.inferredBadge')}
              </span>
            )}
          </div>

          {mode === 'pro' && (
            <div className="text-[11px] text-gray-500">
              {aLocalId && (
                <span className="mr-3">
                  {t('results.dhfiA')} {aLocalId}
                </span>
              )}
              {bLocalId && (
                <span>
                  {t('results.dhfiB')} {bLocalId}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {evidenceId && !isInferred && (
            <EvidenceTag id={evidenceId} className="text-[11px]" />
          )}
        </div>
      </div>

      <div className="mt-1.5 space-y-1">
        {mode === 'consumer' && !isInferred && (
          <>
            {actionText && <p className="text-sm">{actionText}</p>}
            <p className="text-xs text-gray-600">{t('results.consumerAdviceLine')}</p>
          </>
        )}

        {mode === 'pro' && (
          <>
            {mechText && (
              <p className="text-xs text-gray-600">
                {t('results.mechanismLabel')}{' '}
                {mechText}
              </p>
            )}
            {actionText && (
              <p className="text-sm">
                {t('results.actionLabel')}{' '}
                {actionText}
              </p>
            )}
          </>
        )}
      </div>

      {showRefs && (
        <div className="mt-2 border-t border-dashed border-slate-200 pt-1.5 space-y-1.5">
          {refs.length > 0 && <ReferenceList refs={refs} ixId={ix?._id || 'ix'} />}
        </div>
      )}
    </div>
  );
}

export default function InteractionResults({ data, mode = 'consumer', onModeChange }) {
  const { t } = useTranslation();

  const allItems = Array.isArray(data?.interactions) ? data.interactions : [];

  const { curated, inferred } = useMemo(() => {
    const curated = [];
    const inferred = [];
    for (const ix of allItems) {
      const d = getDerivation(ix);
      if (d === 'inferred') inferred.push(ix);
      else curated.push(ix);
    }
    return { curated, inferred };
  }, [allItems]);

  const hasCurated = curated.length > 0;
  const hasInferred = inferred.length > 0 && mode === 'pro';

  if (!hasCurated && !hasInferred) {
    return (
      <div className="p-4 bg-white rounded-2xl shadow mt-4">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-semibold mb-0">{t('results.title')}</h2>
          <AudienceToggle value={mode} onChange={onModeChange} />
        </div>
        <p className="text-sm text-gray-500">{t('results.empty')}</p>
        <p className="text-xs text-gray-500 mt-1">{t('results.emptyNote')}</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded-2xl shadow mt-4 space-y-4">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-semibold">
          {t('results.title')}{' '}
          <span className="text-sm font-normal text-gray-500">
            ({allItems.length})
          </span>
        </h2>
        <AudienceToggle value={mode} onChange={onModeChange} />
      </div>

      <p className="text-[11px] text-gray-500 text-right">
        {mode === 'consumer'
          ? t('results.modeLabel.consumer')
          : t('results.modeLabel.pro')}
      </p>

      {hasCurated && (
        <div className="space-y-3">
          {mode === 'pro' && (
            <div className="text-xs font-semibold text-gray-700">
              {t('results.curatedSection')}
            </div>
          )}

          {curated.map((ix) => (
            <InteractionCard key={ix._id} ix={ix} mode={mode} isInferred={false} />
          ))}
        </div>
      )}

      {hasInferred && (
        <div className="space-y-3 pt-2 border-t border-dashed border-slate-200">
          <div className="text-xs font-semibold text-purple-800">
            {t('results.inferredSection')}
          </div>

          <p className="text-[11px] text-purple-800/80">
            {t('results.inferredDisclaimer')}
          </p>

          {inferred.map((ix) => (
            <InteractionCard key={ix._id} ix={ix} mode={mode} isInferred={true} />
          ))}
        </div>
      )}
    </div>
  );
}