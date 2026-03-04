// src/services/diseaseService.js
import { runSparql } from './graphdbClient.js';

export async function searchUnderlyingDisease(q) {
  const safeQ = (q || '').replace(/"/g, '\\"').trim();
  if (!safeQ) return [];

  const query = `
PREFIX dhfi: <https://w3id.org/dhfi#>
PREFIX rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT DISTINCT ?dis ?label
WHERE {
  ?dis rdf:type dhfi:UnderlyingDisease ;
       rdfs:label ?label .
  FILTER(CONTAINS(LCASE(STR(?label)), LCASE("${safeQ}")))
}
ORDER BY ?label
LIMIT 50
`;

  const rows = await runSparql(query);

  return rows.map((b) => ({
    id: b.dis.value.split('#').pop(), 
    iri: b.dis.value,
    label: b.label.value,
  }));
}

export async function getDiseaseSuggestions(diseaseTailId) {
  const iri = `dhfi:${diseaseTailId}`;

  const query = `
PREFIX dhfi: <https://w3id.org/dhfi#>
PREFIX rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT DISTINCT ?dis ?dis_label ?drug ?drug_label
WHERE {
  BIND(${iri} AS ?dis)

  ?dis rdf:type dhfi:UnderlyingDisease ;
       dhfi:recommendsDrugClass ?drug .

  OPTIONAL { ?dis  rdfs:label ?dis_label. }
  OPTIONAL { ?drug rdfs:label ?drug_label. }
}
ORDER BY ?drug_label
`;

  const rows = await runSparql(query);

  const result = {
    id: diseaseTailId,
    iri: '',
    label: '',
    drugs: [],
  };

  for (const b of rows) {
    if (!result.iri) result.iri = b.dis.value;
    if (!result.label) result.label = b.dis_label?.value || '';

    result.drugs.push({
      iri: b.drug.value,
      id: b.drug.value.split('#').pop(), 
      label: b.drug_label?.value || '',
    });
  }

  return result;
}
