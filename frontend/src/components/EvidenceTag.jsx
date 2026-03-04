// frontend/src/components/EvidenceTag.jsx
import React from 'react';
import { useTranslation } from 'react-i18next';

// mapping evidence id -> meta
const EVIDENCE_META = {
  EL_000001: {
    code: 'e1',
    label_en: 'clinical evidence',
    label_th: 'หลักฐาน clinical',
    className: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  },
  EL_000002: {
    code: 'e2',
    label_en: 'in vivo evidence',
    label_th: 'หลักฐาน in vivo',
    className: 'bg-blue-50 text-blue-700 border border-blue-200',
  },
  EL_000003: {
    code: 'e3',
    label_en: 'in vitro evidence',
    label_th: 'หลักฐาน in vitro',
    className: 'bg-purple-50 text-purple-700 border border-purple-200',
  },
  EL_000004: {
    code: 'e4',
    label_en: 'case report',
    label_th: 'รายงานเคส (case report)',
    className: 'bg-amber-50 text-amber-700 border border-amber-200',
  },
  EL_000005: {
    code: 'e5',
    label_en: 'review article',
    label_th: 'บทความรีวิว (review article)',
    className: 'bg-gray-100 text-gray-700 border border-gray-200',
  },
};

// รับได้ทั้ง "EL_000005" และ "EvidenceLevel_e5"
function normalizeEvidenceCode(raw) {
  if (!raw) return null;
  const trimmed = String(raw).trim();

  if (EVIDENCE_META[trimmed]) return trimmed;

  if (trimmed.startsWith('EvidenceLevel_')) {
    const code = trimmed.split('_').pop().toLowerCase(); // e1..e5
    const entry = Object.entries(EVIDENCE_META).find(
      ([, v]) => v.code === code
    );
    return entry ? entry[0] : null;
  }

  return null;
}

// รองรับ id ด้วย
export default function EvidenceTag({ evidenceCode, id, className = '' }) {
  const { i18n } = useTranslation();
  const lang = (i18n.language || 'th').toLowerCase();

  // ใช้ evidenceCode ถ้ามี, ถ้าไม่มีก็ใช้ id
  const raw = evidenceCode || id;
  const normId = normalizeEvidenceCode(raw);
  if (!normId) return null;

  const meta = EVIDENCE_META[normId];
  const label = lang === 'th' ? meta.label_th : meta.label_en;

  return (
    <span
      className={
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ' +
        meta.className +
        (className ? ` ${className}` : '')
      }
      title={normId}
    >
      {label}
    </span>
  );
}
