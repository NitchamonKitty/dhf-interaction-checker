// src/services/interactionService.js
import { runSparql } from './graphdbClient.js';

function localIdFromIri(iri) {
  if (!iri) return '';
  const s = String(iri);
  const hash = s.lastIndexOf('#');
  const slash = s.lastIndexOf('/');
  const idx = Math.max(hash, slash);
  return idx >= 0 ? s.slice(idx + 1) : s;
}

function iriFromEntId(entId) {
  if (!entId) return '';
  const s = String(entId).trim();
  if (!s) return '';
  // already IRI?
  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  // already prefixed?
  if (s.startsWith('dhfi:')) return `https://w3id.org/dhfi#${s.replace('dhfi:', '')}`;
  // ENT_...
  return `https://w3id.org/dhfi#${s}`;
}

function normalizeEvidenceCode(raw) {
  if (!raw) return '';
  const s = String(raw).trim();
  if (!s) return '';

  const local = s.includes('#') || s.includes('/') ? localIdFromIri(s) : s;

  if (/^e\d$/i.test(local)) return `EvidenceLevel_${local.toLowerCase()}`;
  if (/^EvidenceLevel_/i.test(local)) return local;

  return local;
}

function pairKey(iri1, iri2) {
  const a = localIdFromIri(iri1);
  const b = localIdFromIri(iri2);
  return a <= b ? `${a}|${b}` : `${b}|${a}`;
}

function edgeKey(eIri, tIri) {
  return `${String(eIri)}||${String(tIri)}`;
}

async function fetchEdgeReferencesMap(pairs = []) {
  const cleaned = (pairs || [])
    .filter((x) => x && x.eIri && x.tIri)
    .map((x) => ({ eIri: String(x.eIri), tIri: String(x.tIri) }));

  const uniqPairs = [];
  const seen = new Set();
  for (const p of cleaned) {
    const k = edgeKey(p.eIri, p.tIri);
    if (!seen.has(k)) {
      seen.add(k);
      uniqPairs.push(p);
    }
  }

  const out = new Map();
  if (!uniqPairs.length) return out;

  const values = uniqPairs.map((p) => `(<${p.eIri}> <${p.tIri}>)`).join(' ');

  const q = `
PREFIX dhfi: <https://w3id.org/dhfi#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?e ?t ?ref ?refLabel ?refUrl ?ev
WHERE {
  VALUES (?e ?t) { ${values} }

  {
    # (A) Assertion-based evidence
    ?asrt dhfi:assertedEntity ?e ;
          dhfi:hasReference ?ref .

    {
      ?asrt dhfi:assertedEffect ?t .
    }
    UNION
    {
      ?asrt dhfi:assertedTarget ?t .
    }
    UNION
    {
      ?asrt dhfi:assertedTargetEntity ?t .
    }

    OPTIONAL { ?asrt dhfi:hasEvidenceLevel ?ev . }
  }
  UNION
  {
    # (B) Fallback: edge exists, ref is on entity (less ideal but prevents empty)
    ?e ?p ?t .
    ?e dhfi:hasReference ?ref .
    OPTIONAL { ?e dhfi:hasEvidenceLevel ?ev . }
  }

  OPTIONAL { ?ref rdfs:label ?refLabel . }
  OPTIONAL { ?ref (dhfi:referenceUrl|dhfi:doiUrl|dhfi:doi_url|dhfi:url) ?refUrl . }
}
`;

  const rows = await runSparql(q);

  for (const r of rows) {
    const e = r.e?.value;
    const t = r.t?.value;
    const refIri = r.ref?.value;
    if (!e || !t || !refIri) continue;

    const title = r.refLabel?.value || '';
    const url = r.refUrl?.value || '';

    const evLocal = r.ev?.value ? localIdFromIri(r.ev.value) : '';
    const evidenceId = evLocal ? normalizeEvidenceCode(evLocal) : null;

    const k = edgeKey(e, t);
    if (!out.has(k)) out.set(k, []);

    const arr = out.get(k);
    const already = arr.some((x) => x.iri === refIri && x.url === url);
    if (!already) arr.push({ iri: refIri, title, url, evidenceId });
  }

  return out;
}

function pickFirstRef(refList = []) {
  if (!Array.isArray(refList) || !refList.length) return null;
  const withUrl = refList.find((r) => r && r.url);
  return withUrl || refList[0] || null;
}

function wrapRefForUI(ref, meta = {}) {
  if (!ref) return null;
  return {
    iri: ref.iri,
    title: ref.title,
    url: ref.url,
    evidenceId: ref.evidenceId ?? null,

    // optional metadata for UI
    forSide: meta.forSide || null, // 'a'|'b'
    forEntityIri: meta.forEntityIri || null,
    forEntityLabel: meta.forEntityLabel || null,
    supportTargetIri: meta.supportTargetIri || null,
    supportTargetLabel: meta.supportTargetLabel || null,
  };
}

function profileToConditionIds(profile = {}) {
  const p = profile || {};
  const out = [];

  const conds = Array.isArray(p.conditions) ? p.conditions : [];
  for (const raw of conds) {
    const s = String(raw || '').trim();
    if (!s) continue;

    if (s.startsWith('ENT_COND_')) out.push(s);
    else if (s.startsWith('COND_')) out.push(`ENT_${s}`);
    else if (s.includes('ENT_COND_')) out.push(s.slice(s.indexOf('ENT_COND_')));
  }

  if (p.pregnancy === true) out.push('ENT_COND_PREGNANCY');

  const ageNum = Number(p.age);
  if (Number.isFinite(ageNum) && ageNum >= 65) out.push('ENT_COND_ELDERLY');

  if (p.smoking) out.push('ENT_COND_SMOKING');

  if (p.renalImpairment)
    out.push('ENT_COND_RENAL_IMPAIRMENT');

  if (p.liverImpairment)
    out.push('ENT_COND_HEPATIC_IMPAIRMENT');

  return Array.from(new Set(out));
}

function buildConditionDrugResult({
  condIri,
  condLabel,
  drugIri,
  drugLabel,
  mechEn,
  actionEn,
  inferencePattern,
  mode,
  references = [],
}) {
  return {
    _id: `COND_${localIdFromIri(condIri)}_${localIdFromIri(drugIri)}_${inferencePattern || 'RULE'}`,

    a: {
      _id: condIri,
      name: condLabel || localIdFromIri(condIri),
      label_en: condLabel || localIdFromIri(condIri),
      name_th: '',
      name_en: condLabel || localIdFromIri(condIri),
    },

    b: {
      _id: drugIri,
      name: drugLabel || localIdFromIri(drugIri),
      label_en: drugLabel || localIdFromIri(drugIri),
      name_th: '',
      name_en: drugLabel || localIdFromIri(drugIri),
    },

    mechanism: { th: '', en: mechEn || '' },
    action: { th: '', en: actionEn || '' },
    notes: { th: '', en: '' },

    evidence: '',
    evidenceId: null,
    references: Array.isArray(references) ? references : [],

    source: 'condition',
    inferencePattern: inferencePattern || 'CONDITION_DRUG',

    mode: mode || 'consumer',
  };
}

function buildDuplicationResult({
  aIri,
  aLabel,
  bIri,
  bLabel,
  mechEn,
  actionEn,
  inferencePattern,
  mode,
  meta = {},
}) {
  return {
    _id: `DUPL_${localIdFromIri(aIri)}_${localIdFromIri(bIri)}_${inferencePattern || 'DUPLICATION'}`,

    a: { _id: aIri, name: aLabel, label_en: aLabel, name_th: '', name_en: aLabel },
    b: { _id: bIri, name: bLabel, label_en: bLabel, name_th: '', name_en: bLabel },

    mechanism: { th: '', en: mechEn || '' },
    action: { th: '', en: actionEn || '' },
    notes: { th: '', en: '' },

    evidence: '',
    evidenceId: null,
    references: [],

    source: 'duplication',
    inferencePattern: inferencePattern || 'DUPLICATION',

    mode: mode || 'consumer',

    ...meta,
  };
}

async function evaluateDuplicationEffects(entIds = [], mode = 'consumer') {
  const ids = (entIds || []).filter(Boolean);
  if (!ids.length) return [];

  const vals = ids.map((id) => `dhfi:${id}`).join(' ');

  const q = `
PREFIX dhfi: <https://w3id.org/dhfi#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT DISTINCT ?a ?aLabel ?b ?bLabel ?eff ?effLabel ?direction
WHERE {
  VALUES ?a { ${vals} }
  VALUES ?b { ${vals} }
  FILTER(?a != ?b)

  ?a dhfi:hasOutcome ?eff .
  ?b dhfi:hasOutcome ?eff .

  OPTIONAL { ?a rdfs:label ?aLabel. }
  OPTIONAL { ?b rdfs:label ?bLabel. }
  OPTIONAL { ?eff rdfs:label ?effLabel. }
  OPTIONAL { ?eff dhfi:effectDirection ?direction. }

  FILTER(STR(?a) < STR(?b))
}
`;

  const rows = await runSparql(q);

  return rows.map((r) => {
    const aIri = r.a.value;
    const bIri = r.b.value;

    const aLabel = r.aLabel?.value || localIdFromIri(aIri);
    const bLabel = r.bLabel?.value || localIdFromIri(bIri);

    const effIri = r.eff?.value || '';
    const effLabel = r.effLabel?.value || (effIri ? localIdFromIri(effIri) : 'shared pharmacological effect');
    const direction = r.direction?.value || '';

    const mechEn = direction
      ? `Shared pharmacological effect (${direction}): ${effLabel}`
      : `Shared pharmacological effect: ${effLabel}`;

    const actionEn =
      'Potential therapeutic duplication / additive effects. Monitor clinical response and adverse effects; consider dose adjustment or alternative therapy if appropriate.';

    return buildDuplicationResult({
      aIri,
      aLabel,
      bIri,
      bLabel,
      mechEn,
      actionEn,
      inferencePattern: 'PHARMACOLOGICAL_EFFECT_DUPLICATION',
      mode,
      meta: {
        duplicationKind: 'effect',
        sharedEffectIri: effIri || null,
        sharedEffectLabel: effLabel || null,
      },
    });
  });
}

async function evaluateDuplicationClasses(entIds = [], mode = 'consumer') {
  const ids = (entIds || []).filter(Boolean);
  if (!ids.length) return [];

  const vals = ids.map((id) => `dhfi:${id}`).join(' ');

  const q = `
PREFIX dhfi: <https://w3id.org/dhfi#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT DISTINCT ?a ?aLabel ?b ?bLabel ?cls ?clsLabel
WHERE {
  VALUES ?a { ${vals} }
  VALUES ?b { ${vals} }
  FILTER(?a != ?b)

  ?a dhfi:memberOfClass ?cls .
  ?b dhfi:memberOfClass ?cls .

  OPTIONAL { ?a rdfs:label ?aLabel. }
  OPTIONAL { ?b rdfs:label ?bLabel. }
  OPTIONAL { ?cls rdfs:label ?clsLabel. }

  FILTER(STR(?a) < STR(?b))
}
`;

  const rows = await runSparql(q);

  return rows.map((r) => {
    const aIri = r.a.value;
    const bIri = r.b.value;

    const aLabel = r.aLabel?.value || localIdFromIri(aIri);
    const bLabel = r.bLabel?.value || localIdFromIri(bIri);

    const clsIri = r.cls?.value || '';
    const clsLabel = r.clsLabel?.value || (clsIri ? localIdFromIri(clsIri) : 'shared drug class');

    const mechEn = `Shared drug class: ${clsLabel}`;
    const actionEn =
      'Possible drug-class duplication. Assess indication overlap, cumulative adverse effects, and consider choosing one agent or adjusting regimen as appropriate.';

    return buildDuplicationResult({
      aIri,
      aLabel,
      bIri,
      bLabel,
      mechEn,
      actionEn,
      inferencePattern: 'DRUGCLASS_DUPLICATION',
      mode,
      meta: {
        duplicationKind: 'drugclass',
        sharedClassIri: clsIri || null,
        sharedClassLabel: clsLabel || null,
      },
    });
  });
}

async function evaluateConditionDrugInteractions(conditionIds = [], drugEntIds = [], mode = 'consumer') {
  if (!conditionIds.length || !drugEntIds.length) return [];

  const condValues = conditionIds.map((id) => `dhfi:${id}`).join(' ');
  const drugValues = drugEntIds.map((id) => `dhfi:${id}`).join(' ');

  const out = [];

  const curatedCondDrugQuery = `
PREFIX dhfi: <https://w3id.org/dhfi#>
PREFIX rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?int ?c ?c_label ?d ?d_label ?mech_label ?actionDefault ?ref ?refLabel ?refUrl ?evLevel
WHERE {
  VALUES ?c { ${condValues} }
  VALUES ?d { ${drugValues} }
  FILTER(?c != ?d)

  ?int rdf:type dhfi:Interaction ;
       dhfi:hasParticipant ?c ;
       dhfi:hasParticipant ?d .

  OPTIONAL { ?c rdfs:label ?c_label. }
  OPTIONAL { ?d rdfs:label ?d_label. }

  OPTIONAL {
    ?int dhfi:hasInteractionType ?mech .
    OPTIONAL { ?mech rdfs:label ?mech_label. }
    OPTIONAL { ?mech dhfi:actionDefault ?actionDefault. }
  }

  OPTIONAL { ?int dhfi:hasEvidenceLevel ?evLevel . }

  OPTIONAL {
    ?int dhfi:hasReference ?ref .
    OPTIONAL { ?ref rdfs:label ?refLabel. }
    OPTIONAL { ?ref (dhfi:referenceUrl|dhfi:doiUrl|dhfi:doi_url|dhfi:url) ?refUrl . }
  }
}
`;

  const curatedRows = await runSparql(curatedCondDrugQuery);

  const curatedMap = new Map();
  for (const r of curatedRows) {
    const intIri = r.int.value;
    let obj = curatedMap.get(intIri);
    if (!obj) {
      const cIri = r.c.value;
      const dIri = r.d.value;
      const cLabel = r.c_label?.value || localIdFromIri(cIri);
      const dLabel = r.d_label?.value || localIdFromIri(dIri);
      const mechLabel = r.mech_label?.value || 'Condition–Drug interaction';
      const actionEn = r.actionDefault?.value || mechLabel;

      obj = buildConditionDrugResult({
        condIri: cIri,
        condLabel: cLabel,
        drugIri: dIri,
        drugLabel: dLabel,
        mechEn: mechLabel,
        actionEn,
        inferencePattern: 'CONDITION_DRUG_CURATED',
        mode,
      });

      const evidenceLocal = r.evLevel ? localIdFromIri(r.evLevel.value) : '';
      const evidenceNorm = normalizeEvidenceCode(evidenceLocal);

      obj.evidence = evidenceNorm;
      obj.evidenceId = evidenceNorm || null;

      curatedMap.set(intIri, obj);
    }

    if (r.ref && obj) {
      const refIri = r.ref.value;
      const refTitle = r.refLabel?.value || '';
      const refUrl = r.refUrl?.value || '';
      const already = obj.references.some((x) => x.iri === refIri && x.url === refUrl);
      if (!already) obj.references.push({ iri: refIri, title: refTitle, url: refUrl });
    }
  }

  out.push(...Array.from(curatedMap.values()));

  const inferredPkQuery = `
PREFIX dhfi: <https://w3id.org/dhfi#>
PREFIX rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT DISTINCT ?c ?c_label ?d ?d_label ?t ?t_label ?role ?pkDim ?condEffect
WHERE {
  VALUES ?c { ${condValues} }
  VALUES ?d { ${drugValues} }

  {
    ?c dhfi:induces ?t .
    BIND("induces" AS ?condEffect)
  }
  UNION
  {
    ?c dhfi:inhibits ?t .
    BIND("inhibits" AS ?condEffect)
  }
  UNION
  {
    ?c dhfi:hasPKEffect ?t .
    BIND("affects" AS ?condEffect)
  }

  OPTIONAL { ?c rdfs:label ?c_label. }
  OPTIONAL { ?d rdfs:label ?d_label. }
  OPTIONAL { ?t rdfs:label ?t_label. }
  OPTIONAL { ?t dhfi:pkDimension ?pkDim. }

  FILTER(?d != dhfi:nan)
  FILTER(!REGEX(STR(?d), "nan$", "i"))

  {
    ?d dhfi:isSubstrateOf ?t .
    BIND("substrate" AS ?role)
  }
  UNION
  {
    ?d dhfi:isInhibitorOf ?t .
    BIND("inhibitor" AS ?role)
  }
  UNION
  {
    ?d dhfi:isInducerOf ?t .
    BIND("inducer" AS ?role)
  }
}
`;

  const inferredRows = await runSparql(inferredPkQuery);

  const edgePairs = inferredRows
    .flatMap((r) => {
      const cIri = r.c?.value;
      const dIri = r.d?.value;
      const tIri = r.t?.value;
      if (!cIri || !dIri || !tIri) return [];
      return [
        { eIri: cIri, tIri },
        { eIri: dIri, tIri },
      ];
    })
    .filter(Boolean);

  const edgeRefMap = await fetchEdgeReferencesMap(edgePairs);

  for (const r of inferredRows) {
    const cIri = r.c.value;
    const dIri = r.d.value;

    const cLabel = r.c_label?.value || localIdFromIri(cIri);
    const dLabel = r.d_label?.value || localIdFromIri(dIri);

    const pkDimVal = r.pkDim?.value || '';
    const tIri = r.t?.value || '';
    const tLabel =
      r.t_label?.value ||
      (pkDimVal ? String(pkDimVal) : localIdFromIri(tIri || '') || 'PK target');

    const condEffect = (r.condEffect?.value || '').toLowerCase(); // induces/inhibits/affects
    const role = (r.role?.value || '').toLowerCase(); // substrate/inhibitor/inducer

    const effectText =
      condEffect === 'induces' ? 'induces' :
      condEffect === 'inhibits' ? 'inhibits' :
      'affects';

    const mechEn = `${cLabel} ${effectText} PK pathway (${tLabel}); drug is ${role || 'related'} to this target.`;

    let actionEn = 'Potential PK change; monitor clinical response and consider dose adjustment if needed.';

    if (role === 'substrate') {
      if (condEffect === 'induces') {
        actionEn =
          'Possible decreased exposure/efficacy due to increased clearance (enzyme/transporter induction). Monitor response and consider dose adjustment if needed.';
      } else if (condEffect === 'inhibits') {
        actionEn =
          'Possible increased exposure/toxicity due to reduced clearance (enzyme/transporter inhibition). Monitor for adverse effects and consider dose adjustment if needed.';
      } else {
        actionEn =
          'Potential PK change affecting drug exposure; monitor response and consider dose adjustment if needed.';
      }
    } else if (role === 'inhibitor') {
      actionEn =
        'Drug is an inhibitor of this pathway; consider interaction potential with other substrates and monitor if clinically relevant.';
    } else if (role === 'inducer') {
      actionEn =
        'Drug is an inducer of this pathway; consider reduced exposure of co-administered substrates and monitor if clinically relevant.';
    }

    const refA = pickFirstRef(edgeRefMap.get(edgeKey(cIri, tIri)) || []);
    const refB = pickFirstRef(edgeRefMap.get(edgeKey(dIri, tIri)) || []);

    const refs = [];
    const wrappedA = wrapRefForUI(refA, {
      forSide: 'a',
      forEntityIri: cIri,
      forEntityLabel: cLabel,
      supportTargetIri: tIri,
      supportTargetLabel: tLabel,
    });
    const wrappedB = wrapRefForUI(refB, {
      forSide: 'b',
      forEntityIri: dIri,
      forEntityLabel: dLabel,
      supportTargetIri: tIri,
      supportTargetLabel: tLabel,
    });

    if (wrappedA) refs.push(wrappedA);
    if (wrappedB && (!wrappedA || wrappedB.iri !== wrappedA.iri || wrappedB.url !== wrappedA.url)) refs.push(wrappedB);

    out.push(
      buildConditionDrugResult({
        condIri: cIri,
        condLabel: cLabel,
        drugIri: dIri,
        drugLabel: dLabel,
        mechEn,
        actionEn,
        inferencePattern: `CONDITION_PK_${(condEffect || 'MODIFIES').toUpperCase()}_${(role || 'ROLE').toUpperCase()}`,
        mode,
        references: refs,
      })
    );
  }

  const uniq = [];
  const seen2 = new Set();
  for (const it of out) {
    const k = `${pairKey(it.a._id, it.b._id)}|${it.inferencePattern}`;
    if (!seen2.has(k)) {
      seen2.add(k);
      uniq.push(it);
    }
  }

  return uniq;
}

async function getCombinationDrugMeta(entIds = []) {
  const ids = (entIds || []).filter(Boolean);
  if (!ids.length) return [];

  const values = ids.map((id) => `dhfi:${id}`).join(' ');

  const q = `
PREFIX dhfi: <https://w3id.org/dhfi#>
PREFIX rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT DISTINCT ?e ?label
WHERE {
  VALUES ?e { ${values} }
  ?e rdf:type dhfi:CombinationDrug .
  OPTIONAL { ?e rdfs:label ?label. }
}
`;
  const rows = await runSparql(q);
  return rows.map((r) => ({
    entId: localIdFromIri(r.e.value),
    iri: r.e.value,
    label: r.label?.value || localIdFromIri(r.e.value),
  }));
}

async function getCombinationComponentsMap(combinationEntIds = []) {
  const ids = (combinationEntIds || []).filter(Boolean);
  if (!ids.length) return new Map();

  const values = ids.map((id) => `dhfi:${id}`).join(' ');

  const q = `
PREFIX dhfi: <https://w3id.org/dhfi#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?comb ?comp ?compLabel
WHERE {
  VALUES ?comb { ${values} }
  ?comb dhfi:hasComponent ?comp .
  OPTIONAL { ?comp rdfs:label ?compLabel. }
}
`;
  const rows = await runSparql(q);

  const m = new Map();
  for (const r of rows) {
    const combIri = r.comb.value;
    const combEntId = localIdFromIri(combIri);

    const compIri = r.comp.value;
    const compEntId = localIdFromIri(compIri);
    const compLabel = r.compLabel?.value || compEntId;

    if (!m.has(combEntId)) m.set(combEntId, []);
    m.get(combEntId).push({ entId: compEntId, iri: compIri, label: compLabel });
  }

  for (const [k, arr] of m.entries()) {
    const seen = new Set();
    const uniq = [];
    for (const it of arr) {
      if (!seen.has(it.entId)) {
        seen.add(it.entId);
        uniq.push(it);
      }
    }
    m.set(k, uniq);
  }

  return m;
}

async function fetchCuratedInteractionsForEntSet(entIds = [], mode = 'consumer') {
  const iriValues = (entIds || [])
    .filter(Boolean)
    .map((id) => `dhfi:${id}`)
    .join(' ');
  if (!iriValues) return { list: [], pairKeys: new Set() };

  const queryCurated = `
PREFIX dhfi: <https://w3id.org/dhfi#>
PREFIX rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT
  ?int
  ?a ?a_label
  ?b ?b_label
  ?mech ?mech_label
  ?outcome ?outcome_label
  ?evLevel ?evLabel ?evRank
  ?actionDefault
  ?ref ?refLabel ?refUrl
WHERE {
  VALUES ?a { ${iriValues} }
  VALUES ?b { ${iriValues} }
  FILTER(?a != ?b)

  ?int rdf:type dhfi:Interaction ;
       dhfi:hasParticipant ?a ;
       dhfi:hasParticipant ?b .

  OPTIONAL { ?a rdfs:label ?a_label. }
  OPTIONAL { ?b rdfs:label ?b_label. }

  OPTIONAL {
    ?int dhfi:hasInteractionType ?mech .
    OPTIONAL { ?mech rdfs:label ?mech_label. }
    OPTIONAL { ?mech dhfi:actionDefault ?actionDefault. }
  }

  OPTIONAL {
    ?int dhfi:hasPharmacologicalEffect ?outcome .
    OPTIONAL { ?outcome rdfs:label ?outcome_label. }
  }

  OPTIONAL {
    ?int dhfi:hasEvidenceLevel ?evLevel .
    OPTIONAL { ?evLevel rdfs:label ?evLabel. }
    OPTIONAL { ?evLevel dhfi:evidenceRank ?evRank. }
  }

  OPTIONAL {
    ?int dhfi:hasReference ?ref .
    OPTIONAL { ?ref rdfs:label ?refLabel. }
    OPTIONAL { ?ref (dhfi:referenceUrl|dhfi:doiUrl|dhfi:doi_url|dhfi:url) ?refUrl . }
  }
}
`;

  const rows = await runSparql(queryCurated);

  const map = new Map();
  const pairKeys = new Set();

  for (const b of rows) {
    const intIri = b.int.value;
    const aIri = b.a.value;
    const bIri = b.b.value;

    const aLabel = b.a_label?.value || localIdFromIri(aIri);
    const bLabel = b.b_label?.value || localIdFromIri(bIri);

    const [firstIri, firstLabel, secondIri, secondLabel] =
      aLabel.toLowerCase() <= bLabel.toLowerCase()
        ? [aIri, aLabel, bIri, bLabel]
        : [bIri, bLabel, aIri, aLabel];

    pairKeys.add(pairKey(firstIri, secondIri));

    let obj = map.get(intIri);
    if (!obj) {
      const actionDefault = b.actionDefault?.value || '';
      const mechLabel = b.mech_label?.value || '';
      const outcomeLabel = b.outcome_label?.value || '';
      const actionEn = actionDefault || buildFallbackAction(mechLabel, outcomeLabel);

      const evLocal = b.evLevel ? localIdFromIri(b.evLevel.value) : '';
      const evidenceNorm = normalizeEvidenceCode(evLocal);

      obj = {
        _id: intIri,
        a: { _id: firstIri, name: firstLabel, label_en: firstLabel, name_th: '', name_en: firstLabel },
        b: { _id: secondIri, name: secondLabel, label_en: secondLabel, name_th: '', name_en: secondLabel },
        mechanism: { th: '', en: mechLabel || '' },
        action: { th: '', en: actionEn },
        notes: { th: '', en: '' },
        evidence: evidenceNorm,
        evidenceId: evidenceNorm || null,
        references: [],

        source: 'curated',  

        inferencePattern: null,
        mode: mode,
      };

      map.set(intIri, obj);
    }

    if (b.ref && obj) {
      const refIri = b.ref.value;
      const refTitle = b.refLabel?.value || '';
      const refUrl = b.refUrl?.value || '';
      const already = obj.references.some((r) => r.iri === refIri && r.url === refUrl);
      if (!already) obj.references.push({ iri: refIri, title: refTitle, url: refUrl });
    }
  }

  return { list: Array.from(map.values()), pairKeys };
}

async function fetchInferredForEntSet(entIds = [], curatedPairKeys = new Set(), mode = 'consumer') {
  const list = [];
  if (mode !== 'pro') return list;

  const iriValues = (entIds || [])
    .filter(Boolean)
    .map((id) => `dhfi:${id}`)
    .join(' ');
  if (!iriValues) return list;

  const pkQuery = `
PREFIX dhfi: <https://w3id.org/dhfi#>
PREFIX rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT DISTINCT ?inhibitor ?inhib_label ?substrate ?substrate_label ?t ?t_label ?pkDim
WHERE {
  VALUES ?inhibitor { ${iriValues} }
  VALUES ?substrate { ${iriValues} }
  FILTER(?inhibitor != ?substrate)

  ?inhibitor dhfi:isInhibitorOf ?t .
  ?substrate dhfi:isSubstrateOf ?t .

  OPTIONAL { ?inhibitor rdfs:label ?inhib_label. }
  OPTIONAL { ?substrate rdfs:label ?substrate_label. }
  OPTIONAL { ?t rdfs:label ?t_label. }
  OPTIONAL { ?t dhfi:pkDimension ?pkDim. }
}
`;
  const pkRows = await runSparql(pkQuery);

  const pkPairs = pkRows
    .flatMap((r) => {
      const tIri = r.t?.value;
      const inhIri = r.inhibitor?.value;
      const subIri = r.substrate?.value;
      if (!tIri || !inhIri || !subIri) return [];
      return [
        { eIri: inhIri, tIri },
        { eIri: subIri, tIri },
      ];
    })
    .filter(Boolean);
  const pkEdgeRefMap = await fetchEdgeReferencesMap(pkPairs);

  for (const r of pkRows) {
    const inhIri = r.inhibitor.value;
    const subIri = r.substrate.value;

    const pKey = pairKey(inhIri, subIri);
    if (curatedPairKeys.has(pKey)) continue;

    const inhLabel = r.inhib_label?.value || localIdFromIri(inhIri);
    const subLabel = r.substrate_label?.value || localIdFromIri(subIri);

    const targetLabel = r.t_label?.value || '';
    const pkDim = r.pkDim?.value || '';
    const targetText = targetLabel || (pkDim ? String(pkDim) : 'PK target');

    const tIri = r.t?.value || '';

    const ref1 = pickFirstRef(pkEdgeRefMap.get(edgeKey(inhIri, tIri)) || []);
    const ref2 = pickFirstRef(pkEdgeRefMap.get(edgeKey(subIri, tIri)) || []);

    const wrapped1 = wrapRefForUI(ref1, {
      forSide: 'a',
      forEntityIri: inhIri,
      forEntityLabel: inhLabel,
      supportTargetIri: tIri,
      supportTargetLabel: targetText,
    });
    const wrapped2 = wrapRefForUI(ref2, {
      forSide: 'b',
      forEntityIri: subIri,
      forEntityLabel: subLabel,
      supportTargetIri: tIri,
      supportTargetLabel: targetText,
    });

    const refs = [];
    if (wrapped1) refs.push(wrapped1);
    if (wrapped2 && (!wrapped1 || wrapped2.iri !== wrapped1.iri || wrapped2.url !== wrapped1.url)) refs.push(wrapped2);

    list.push({
      _id: `C2_PK_${localIdFromIri(inhIri)}_${localIdFromIri(subIri)}_${localIdFromIri(r.t?.value || targetText)}`,
      a: { _id: inhIri, name: inhLabel, label_en: inhLabel, name_th: '', name_en: inhLabel },
      b: { _id: subIri, name: subLabel, label_en: subLabel, name_th: '', name_en: subLabel },
      mechanism: { th: '', en: `Mechanism-based PK inhibition via ${targetText}` },
      action: { th: '', en: 'Potential pharmacokinetic interaction inferred from shared enzyme/transporter; monitor response and consider dose adjustment if needed.' },
      notes: { th: '', en: '' },
      evidence: '',
      evidenceId: null,
      references: refs,

      source: 'inferred',
      inferencePattern: 'C2_PK_INHIBITION',
      mode: mode,
    });
  }

  const pkInductionQuery = `
PREFIX dhfi: <https://w3id.org/dhfi#>
PREFIX rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT DISTINCT ?inducer ?inducer_label ?substrate ?substrate_label ?t ?t_label ?pkDim
WHERE {
  VALUES ?inducer { ${iriValues} }
  VALUES ?substrate { ${iriValues} }
  FILTER(?inducer != ?substrate)

  ?inducer dhfi:isInducerOf ?t .
  ?substrate dhfi:isSubstrateOf ?t .

  OPTIONAL { ?inducer rdfs:label ?inducer_label. }
  OPTIONAL { ?substrate rdfs:label ?substrate_label. }
  OPTIONAL { ?t rdfs:label ?t_label. }
  OPTIONAL { ?t dhfi:pkDimension ?pkDim. }
}
`;
  const pkIndRows = await runSparql(pkInductionQuery);

  const pkIndPairs = pkIndRows
    .flatMap((r) => {
      const tIri = r.t?.value;
      const indIri = r.inducer?.value;
      const subIri = r.substrate?.value;
      if (!tIri || !indIri || !subIri) return [];
      return [
        { eIri: indIri, tIri },
        { eIri: subIri, tIri },
      ];
    })
    .filter(Boolean);
  const pkIndEdgeRefMap = await fetchEdgeReferencesMap(pkIndPairs);

  for (const r of pkIndRows) {
    const indIri = r.inducer.value;
    const subIri = r.substrate.value;

    const pKey = pairKey(indIri, subIri);
    if (curatedPairKeys.has(pKey)) continue;

    const indLabel = r.inducer_label?.value || localIdFromIri(indIri);
    const subLabel = r.substrate_label?.value || localIdFromIri(subIri);

    const targetLabel = r.t_label?.value || '';
    const pkDim = r.pkDim?.value || '';
    const targetText = targetLabel || (pkDim ? String(pkDim) : 'PK target');

    const tIri = r.t?.value || '';

    const ref1 = pickFirstRef(pkIndEdgeRefMap.get(edgeKey(indIri, tIri)) || []);
    const ref2 = pickFirstRef(pkIndEdgeRefMap.get(edgeKey(subIri, tIri)) || []);

    const wrapped1 = wrapRefForUI(ref1, {
      forSide: 'a',
      forEntityIri: indIri,
      forEntityLabel: indLabel,
      supportTargetIri: tIri,
      supportTargetLabel: targetText,
    });
    const wrapped2 = wrapRefForUI(ref2, {
      forSide: 'b',
      forEntityIri: subIri,
      forEntityLabel: subLabel,
      supportTargetIri: tIri,
      supportTargetLabel: targetText,
    });

    const refs = [];
    if (wrapped1) refs.push(wrapped1);
    if (wrapped2 && (!wrapped1 || wrapped2.iri !== wrapped1.iri || wrapped2.url !== wrapped1.url)) refs.push(wrapped2);

    list.push({
      _id: `C2_PKIND_${localIdFromIri(indIri)}_${localIdFromIri(subIri)}_${localIdFromIri(r.t?.value || targetText)}`,
      a: { _id: indIri, name: indLabel, label_en: indLabel, name_th: '', name_en: indLabel },
      b: { _id: subIri, name: subLabel, label_en: subLabel, name_th: '', name_en: subLabel },
      mechanism: { th: '', en: `Mechanism-based PK induction via ${targetText}` },
      action: { th: '', en: 'Potential pharmacokinetic interaction inferred from enzyme/transporter induction; possible decreased exposure/efficacy. Monitor response and consider dose adjustment if needed.' },
      notes: { th: '', en: '' },
      evidence: '',
      evidenceId: null,
      references: refs,

      source: 'inferred',
      inferencePattern: 'C2_PK_INDUCTION',
      mode: mode,
    });
  }

  const pdQuery = `
PREFIX dhfi: <https://w3id.org/dhfi#>
PREFIX rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT DISTINCT ?a ?a_label ?b ?b_label ?eff ?eff_label ?direction
WHERE {
  VALUES ?a { ${iriValues} }
  VALUES ?b { ${iriValues} }
  FILTER(?a != ?b)

  ?a dhfi:hasOutcome ?eff .
  ?b dhfi:hasOutcome ?eff .

  OPTIONAL { ?a rdfs:label ?a_label. }
  OPTIONAL { ?b rdfs:label ?b_label. }
  OPTIONAL { ?eff rdfs:label ?eff_label. }
  OPTIONAL { ?eff dhfi:effectDirection ?direction. }
}
`;
  const pdRows = await runSparql(pdQuery);

  const pdPairs = pdRows
    .flatMap((r) => {
      const effIri = r.eff?.value;
      const aIri = r.a?.value;
      const bIri = r.b?.value;
      if (!effIri || !aIri || !bIri) return [];
      return [
        { eIri: aIri, tIri: effIri },
        { eIri: bIri, tIri: effIri },
      ];
    })
    .filter(Boolean);
  const pdEdgeRefMap = await fetchEdgeReferencesMap(pdPairs);

  for (const r of pdRows) {
    const entAIri = r.a.value;
    const entBIri = r.b.value;

    const pKey = pairKey(entAIri, entBIri);
    if (curatedPairKeys.has(pKey)) continue;

    const aLabel = r.a_label?.value || localIdFromIri(entAIri);
    const bLabel = r.b_label?.value || localIdFromIri(entBIri);

    const effIri = r.eff?.value || '';
    const effLabel = r.eff_label?.value || 'shared pharmacological effect';
    const direction = r.direction?.value || '';

    const ref1 = pickFirstRef(pdEdgeRefMap.get(edgeKey(entAIri, effIri)) || []);
    const ref2 = pickFirstRef(pdEdgeRefMap.get(edgeKey(entBIri, effIri)) || []);

    const wrapped1 = wrapRefForUI(ref1, {
      forSide: 'a',
      forEntityIri: entAIri,
      forEntityLabel: aLabel,
      supportTargetIri: effIri,
      supportTargetLabel: effLabel,
    });
    const wrapped2 = wrapRefForUI(ref2, {
      forSide: 'b',
      forEntityIri: entBIri,
      forEntityLabel: bLabel,
      supportTargetIri: effIri,
      supportTargetLabel: effLabel,
    });

    const refs = [];
    if (wrapped1) refs.push(wrapped1);
    if (wrapped2 && (!wrapped1 || wrapped2.iri !== wrapped1.iri || wrapped2.url !== wrapped1.url)) refs.push(wrapped2);

    list.push({
      _id: `C2_PD_${localIdFromIri(entAIri)}_${localIdFromIri(entBIri)}_${localIdFromIri(r.eff?.value || effLabel)}`,
      a: { _id: entAIri, name: aLabel, label_en: aLabel, name_th: '', name_en: aLabel },
      b: { _id: entBIri, name: bLabel, label_en: bLabel, name_th: '', name_en: bLabel },
      mechanism: { th: '', en: direction ? `Mechanism-based PD potentiation (${direction}) via ${effLabel}` : `Mechanism-based PD potentiation via ${effLabel}` },
      action: { th: '', en: 'Potential pharmacodynamic potentiation inferred from shared clinical effect; monitor for enhanced effect or adverse reactions.' },
      notes: { th: '', en: '' },
      evidence: '',
      evidenceId: null,
      references: refs,

      source: 'inferred',
      inferencePattern: 'C2_PD_POTENTIATION',
      mode: mode,
    });
  }

  return list;
}

async function buildCombinationFallbackResults({
  entIds = [],
  modeNorm = 'consumer',
  curatedPairKeysMain = new Set(),
}) {
  const combos = await getCombinationDrugMeta(entIds);
  if (!combos.length) return [];

  const comboEntIds = combos.map((x) => x.entId);
  const compMap = await getCombinationComponentsMap(comboEntIds);

  const results = [];
  const seen = new Set();

  for (const combo of combos) {
    const comboEntId = combo.entId;
    const comboIri = combo.iri;
    const comboLabel = combo.label || comboEntId;

    const components = compMap.get(comboEntId) || [];
    if (!components.length) continue;

    const others = (entIds || []).filter((id) => id && id !== comboEntId);

    const missingOthers = [];
    for (const otherId of others) {
      const otherIri = iriFromEntId(otherId);
      const pKey = pairKey(comboIri, otherIri);
      if (!curatedPairKeysMain.has(pKey)) {
        missingOthers.push(otherId);
      }
    }
    if (!missingOthers.length) continue;

    const probeEntIds = Array.from(new Set([
      ...components.map((c) => c.entId),
      ...missingOthers,
    ]));

    const { list: probeCurated, pairKeys: probeCuratedPairKeys } =
      await fetchCuratedInteractionsForEntSet(probeEntIds, modeNorm);

    const probeInferred = await fetchInferredForEntSet(probeEntIds, probeCuratedPairKeys, modeNorm);

    const compSet = new Set(components.map((c) => iriFromEntId(c.entId)));
    const otherSet = new Set(missingOthers.map((id) => iriFromEntId(id)));

    function isComponentOtherPair(ix) {
      const aIri = ix?.a?._id || ix?.a?.id || ix?.a?.iri || '';
      const bIri = ix?.b?._id || ix?.b?.id || ix?.b?.iri || '';
      if (!aIri || !bIri) return false;

      const aIsComp = compSet.has(aIri);
      const bIsComp = compSet.has(bIri);
      const aIsOther = otherSet.has(aIri);
      const bIsOther = otherSet.has(bIri);

      return (aIsComp && bIsOther) || (bIsComp && aIsOther);
    }

    const merged = [...probeCurated, ...probeInferred].filter(isComponentOtherPair);

    for (const ix of merged) {
      const aIri = ix.a?._id || '';
      const bIri = ix.b?._id || '';
      const k = [
        pairKey(aIri, bIri),
        ix.source || '',
        ix.inferencePattern || '',
        ix.evidenceId || '',
        Array.isArray(ix.references) ? ix.references.length : 0,
        `PARENT=${comboEntId}`,
      ].join('|');

      if (seen.has(k)) continue;
      seen.add(k);

      results.push({
        ...ix,
        derivedFromCombination: true,
        combinationParent: comboEntId,
        combinationParentIri: comboIri,
        combinationLabel: comboLabel,
      });
    }
  }

  return results;
}

export async function checkInteractionsByEntities(entIds = [], profile = {}, mode = 'consumer') {
  const iriValues = (entIds || [])
    .filter(Boolean)
    .map((id) => `dhfi:${id}`)
    .join(' ');

  if (!iriValues) return [];

  const modeNorm = (mode === 'pro' || mode === 'professional') ? 'pro' : 'consumer';

  // ✅ Use helper (remove duplicated curated query+map)
  let curatedList = [];
  let curatedPairKeys = new Set();
  try {
    const curated = await fetchCuratedInteractionsForEntSet(entIds, modeNorm);
    curatedList = curated.list || [];
    curatedPairKeys = curated.pairKeys || new Set();
  } catch {
    curatedList = [];
    curatedPairKeys = new Set();
  }

  const conditionIds = profileToConditionIds(profile);
  const drugEntIds = (entIds || []).filter(Boolean);

  let conditionDrugList = [];
  try {
    conditionDrugList = await evaluateConditionDrugInteractions(conditionIds, drugEntIds, modeNorm);
  } catch {
    conditionDrugList = [];
  }

  let inferredList = [];
  try {
    inferredList = await fetchInferredForEntSet(entIds, curatedPairKeys, modeNorm);
  } catch {
    inferredList = [];
  }

  let combinationFallbackList = [];
  try {
    combinationFallbackList = await buildCombinationFallbackResults({
      entIds,
      modeNorm,
      curatedPairKeysMain: curatedPairKeys,
    });
  } catch {
    combinationFallbackList = [];
  }

  let duplicationList = [];
  try {
    const [dupEff, dupCls] = await Promise.all([
      evaluateDuplicationEffects(entIds, modeNorm),
      evaluateDuplicationClasses(entIds, modeNorm),
    ]);
    duplicationList = [...dupEff, ...dupCls];
  } catch {
    duplicationList = [];
  }

  const all = [
    ...curatedList,
    ...conditionDrugList,
    ...inferredList,
    ...combinationFallbackList,
    ...duplicationList,
  ];

  const uniq = [];
  const seen = new Set();
  for (const it of all) {
    const aIri = it?.a?._id || '';
    const bIri = it?.b?._id || '';
    const k = [
      it.source || '',
      it.inferencePattern || '',
      pairKey(aIri, bIri),
      it.evidenceId || '',
      it._id || '',
      it.derivedFromCombination ? `PARENT=${it.combinationParent || ''}` : '',
      it.source === 'duplication' ? `EFF=${it.sharedEffectIri || ''};CLS=${it.sharedClassIri || ''}` : '',
    ].join('|');

    if (seen.has(k)) continue;
    seen.add(k);
    uniq.push(it);
  }

  return uniq;
}

function buildFallbackAction(mechLabel, outcomeLabel) {
  const mech = mechLabel || 'Interaction mechanism not specified';
  const outcome = outcomeLabel || 'Clinical outcome not specified';
  return `${mech} – ${outcome}`;
}
