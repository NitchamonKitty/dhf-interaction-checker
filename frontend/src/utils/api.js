// frontend/src/utils/api.js
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const getLang = () => localStorage.getItem('i18nLang') || 'th';

/* ------------------------------------------------------------------ */
/*    Search entities                                                 */
/* ------------------------------------------------------------------ */
// Backend: GET /api/search?q=...

let entityCache = null;
let entityCachePromise = null;

async function ensureEntityCache() {
  if (entityCache) return entityCache;

  if (!entityCachePromise) {
    entityCachePromise = (async () => {
      const { data } = await axios.get(`${API}/api/entities/all`);
      const items = Array.isArray(data?.items) ? data.items : [];

      return items.map((it) => ({
        id: it.id,
        label: it.label || it.id,
        type: it.type || 'Entity',
      }));
    })().then((list) => {
      entityCache = list;
      return list;
    }).catch((err) => {
      entityCachePromise = null;
      throw err;
    });
  }

  return entityCachePromise;
}

//MultiSearchInput
export const searchEntities = async (q) => {
  const term = (q || '').trim();
  if (!term) return [];

  const lower = term.toLowerCase();
  const cache = await ensureEntityCache();

  const results = [];

  for (const ent of cache) {
    const label = ent.label || '';
    if (!label) continue;

    if (label.toLowerCase().includes(lower)) {
      results.push({
        _id: ent.id,
        name: label,
        nameTh: label, 
        nameEn: label,
        type: ent.type || 'Entity',
        matched: 'label',
      });
    }

    if (results.length >= 20) break;
  }

  return results;
};


/* ------------------------------------------------------------------ */
/*    Interaction checker                                             */
/* ------------------------------------------------------------------ */
// Backend: POST /api/interactions/check
export const checkInteractions = async (payload) => {
  const entities = Array.isArray(payload?.entities)
    ? payload.entities.filter(Boolean)
    : [];

  const profile = payload?.profile || {};
  const mode = payload?.mode || 'consumer';

  const body = {
    entIds: entities,
    profile,
    mode,
  };

  const { data } = await axios.post(`${API}/api/interactions/check`, body);
  return data;
};

/* ------------------------------------------------------------------ */
/*    Underlying disease → drug suggestion (ConditionSuggest)         */
/* ------------------------------------------------------------------ */
// 3.1 ค้นหาโรค: ใช้ใน ConditionSuggest เวลา user พิมพ์ชื่อโรค
// Backend: GET /api/diseases/search?q=...

export const searchConditions = async (q) => {
  const term = (q || '').trim();
  if (!term) return [];

  const { data } = await axios.get(`${API}/api/diseases/search`, {
    params: { q: term }
  });

  const items = Array.isArray(data?.items) ? data.items : [];

  return items
    .map((d) => {
      const _id = d._id || d.id; 
      const name = d.name || d.label || _id; 
      return _id ? { _id, name } : null;
    })
    .filter(Boolean);
};

// 3.2 แนะนำยาเดี่ยว สำหรับโรคที่เลือก
// Backend: GET /api/diseases/:id/suggestions

export const getConditionSuggested = async (diseaseId) => {
  const id = (diseaseId || '').trim();
  if (!id) return [];

  const { data } = await axios.get(
    `${API}/api/diseases/${encodeURIComponent(id)}/suggestions`
  );

  if (Array.isArray(data)) {
    return data
      .map((e) => {
        const _id = e._id || e.id;
        const name = e.name || e.label || _id;
        const type = e.type || 'drug';
        return _id ? { _id, name, type } : null;
      })
      .filter(Boolean);
  }

  if (Array.isArray(data?.items)) {
    return data.items
      .map((e) => {
        const _id = e._id || e.id;
        const name = e.name || e.label || _id;
        const type = e.type || 'drug';
        return _id ? { _id, name, type } : null;
      })
      .filter(Boolean);
  }

  if (Array.isArray(data?.drugs)) {
    return data.drugs
      .map((drug) => {
        const _id = drug?.id || drug?._id;
        if (!_id) return null;
        return {
          _id,
          name: drug.label || drug.name || _id,
          type: 'drug',
        };
      })
      .filter(Boolean);
  }

  const out = [];
  const classes = Array.isArray(data?.classes) ? data.classes : [];
  for (const cls of classes) {
    const drugs = Array.isArray(cls?.drugs) ? cls.drugs : [];
    for (const drug of drugs) {
      const _id = drug?.id;
      if (!_id) continue;
      out.push({
        _id,
        name: drug.label || _id,
        type: cls.label || 'drug',
      });
    }
  }
  return out;
}
