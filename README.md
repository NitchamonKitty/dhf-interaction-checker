# DHFI-C: Drug--Herb--Food Interaction Checker

DHFI-C is an ontology-guided knowledge graph platform designed to assess
interactions among prescription medicines, herbal products, dietary
supplements, and foods. The system integrates curated evidence and
mechanism-based inference to support context-aware interpretation of
interactions influenced by health-related conditions.

------------------------------------------------------------------------

## Abstract

**Background**\
The concurrent use of prescription medicines with herbal products,
dietary supplements, and foods is increasingly common, particularly
among individuals with chronic diseases. Such real-world co-consumption
produces complex interaction patterns extending beyond conventional
drug--drug interactions. Most existing interaction-checking systems
remain drug-centric, rely on predefined interaction pairs, and provide
limited mechanistic transparency or condition-aware interpretation.
Consequently, they are poorly equipped to represent interactions
influenced by health-related conditions such as age, renal impairment,
pregnancy, and lifestyle.

**Methods**\
We developed the **Drug--Herb--Food Interaction Checker (DHFI-C)**, an
ontology-guided knowledge graph platform for mechanism-based and
condition-inclusive interaction assessment. Evidence was curated from
open-access literature following **PRISMA 2020 guidelines** and
transformed into a structured data model encompassing drugs, herbs,
foods, health-related conditions, and underlying diseases. Entities and
interaction components were aligned with external biomedical ontologies
where appropriate, while a **DHFI mini-ontology** was developed to
capture interaction concepts insufficiently represented in existing
ontologies. The system was implemented as a graph-native knowledge
representation paired with a deterministic inference engine capable of
deriving pharmacokinetic and pharmacodynamic interactions through shared
mechanistic pathways. The DHFI-C was evaluated using a comprehensive
predefined use case.

**Results**\
The resulting knowledge graph integrates more than **24,000 drug
entities**, **92 herb/food entities**, and **1,277 curated interaction
records**, together with mechanistic nodes representing enzymes,
transporters, and pharmacodynamic effects. The DHFI-C reports both
curated and mechanism-inferred interactions with explicit evidence
provenance. In the evaluation scenario, the system successfully handled
multi-domain interactions, generated condition-aware interpretations,
detected pharmacological effect duplication, decomposed combination
products into constituent entities, and supported disease-driven drug
suggestion workflows. Outputs are presented in both
**consumer-oriented** and **expert-oriented** modes, each accompanied by
mechanistic explanations.

**Conclusions**\
DHFI-C provides a transparent and extensible framework for assessing
drug--herb--food interactions through integrated, mechanism-based
reasoning. By modeling health-related conditions as first-class entities
and unifying heterogeneous domains within a single knowledge graph, the
platform addresses key limitations of existing interaction checkers and
enables context-aware, mechanism-driven interpretation of complex
interaction scenarios.

------------------------------------------------------------------------

## System Overview

DHFI-C integrates three primary layers:

1.  **Knowledge Layer**
    -   Ontology-guided data model
    -   RDF knowledge graph
    -   Mechanistic entities (enzymes, transporters, PD effects)
2.  **Inference Layer**
    -   Deterministic rule-based reasoning
    -   Mechanism-driven pharmacokinetic and pharmacodynamic inference
3.  **Application Layer**
    -   REST API backend
    -   Web interface supporting multi-entity queries
    -   Dual presentation modes (consumer / expert)

------------------------------------------------------------------------

## Repository Structure

    DHFI-C
    │
    ├── backend/
    │   REST API server and SPARQL query services
    │
    ├── frontend/
    │   React-based web interface
    │
    ├── docker-compose.yml
    │   Container configuration for GraphDB and application services
    │
    ├── Dockerfile
    │   Backend container build definition
    │
    └── README.md

------------------------------------------------------------------------

## Installation

### Prerequisites

-   Docker ≥ 20\
-   Docker Compose ≥ 2\
-   Node.js ≥ 18 (optional for local development)

------------------------------------------------------------------------

### Option 1 --- Run using Docker (recommended)

``` bash
docker compose up --build
```

This will start:

-   GraphDB triple store\
-   Backend API service\
-   Frontend web interface

GraphDB web interface:

    http://localhost:7200

Create a repository named:

    dhfi

and import the DHFI knowledge graph dataset.

------------------------------------------------------------------------

### Option 2 --- Local Development

Backend

``` bash
cd backend
npm install
npm start
```

Frontend

``` bash
cd frontend
npm install
npm run dev
```

------------------------------------------------------------------------

## Usage

DHFI-C allows users to query interactions among:

-   prescription drugs
-   herbal medicines
-   dietary supplements
-   foods
-   health-related conditions

Example scenarios include:

-   drug--herb interaction
-   drug--food interaction
-   multi-entity interaction assessment
-   disease-driven medication suggestions

Results include:

-   curated interaction evidence
-   mechanism-inferred interactions
-   pharmacokinetic pathways
-   pharmacodynamic effect overlap

------------------------------------------------------------------------

## Reproducibility

The version corresponding to the published article is archived via
**Zenodo DOI**.

DOI: *(to be inserted after Zenodo archive)*

------------------------------------------------------------------------

## License

This project is distributed under the terms of the **Apache License
2.0**.

See the `LICENSE` file for details.

------------------------------------------------------------------------

## Citation

If you use DHFI-C in research, please cite:

Drug--Herb--Food Interaction Checker (DHFI-C).\
F1000Research Software Tool Article.

Full citation details will be updated upon publication.
