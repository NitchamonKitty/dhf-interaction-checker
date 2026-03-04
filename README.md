DHFI-C

Drug–Herb–Food Interaction Checker

An ontology-guided, knowledge graph–based software platform for mechanism-transparent and condition-inclusive assessment of drug–herb–food interactions.

Overview

DHFI-C (Drug–Herb–Food Interaction Checker) is a research-oriented software system developed to address limitations of existing interaction-checking platforms, which are typically drug-centric, rely on predefined interaction pairs, and provide limited support for mechanistic transparency and health-condition–inclusive interpretation.

DHFI-C unifies drugs, herbs, foods, health-related conditions, and underlying diseases within a single RDF knowledge graph and performs deterministic, rule-based pharmacokinetic (PK) and pharmacodynamic (PD) inference through explicit mechanistic pathways stored in GraphDB.

This repository contains the full system implementation (frontend, backend, data model, and reasoning components) corresponding to the version evaluated in the accompanying F1000Research manuscript (under review).

Scientific Motivation

Real-world medication use frequently involves concurrent consumption of prescription drugs with herbal products, dietary supplements, and foods, often under modifying conditions such as advanced age, pregnancy, renal impairment, hepatic impairment, or lifestyle factors (e.g., smoking).

Existing interaction checkers:

focus primarily on drug–drug interactions,

rely on enumerated interaction pairs,

rarely incorporate personal conditions into interaction reasoning,

provide limited mechanistic explainability.

DHFI-C was developed to:

support multi-domain interaction checking (drug, herb, food, condition),

enable mechanism-based inference beyond curated pairs,

treat health-related conditions as first-class entities in interaction interpretation,

provide transparent, ontology-aligned, and reproducible outputs.

Conceptual Architecture

DHFI-C adopts an ontology-first and mechanism-first design philosophy.

High-level architecture

Frontend

Web interface for multi-entity input (drugs, herbs, foods, conditions)

Dual output modes:

Public mode: simplified summaries

Expert mode: PK/PD mechanisms, ontology paths, evidence tags

Backend

Interaction & Inference API (Node.js)

Deterministic, rule-based inference engine

Knowledge Graph Layer

RDF knowledge graph stored in GraphDB

Entities, interactions, mechanisms, and ontology mappings encoded explicitly

Accessed via SPARQL endpoint

Curated interactions and mechanism-inferred interactions are explicitly distinguished, and all outputs are traceable to their mechanistic and evidence basis.

Core Functional Modules

DHFI-C integrates the following modules operating on a shared structured data model and RDF knowledge graph:

Mechanism-Based Interaction Inference Engine
PK/PD inference via shared enzymes, transporters, targets, and effect pathways

Condition-Inclusive Interaction Interpretation
Health-related conditions (e.g., age, pregnancy, renal impairment, hepatic impairment, smoking) participate directly in reasoning

Pharmacological Effect Duplication Detection
Identification of overlapping or equivalent pharmacodynamic effects

Drug Combination Handling Module
Decomposition of multi-ingredient products into active components with provenance preservation

Disease-to-Drug Suggestion Module
Disease-driven input assistance using curated disease–drug associations
(non-causal, non-inferential)

Data Model and Semantic Alignment

Entities are represented as first-class objects and organized into:

Drugs and drug classes

Products (herbs and foods)

Health-related conditions

Underlying diseases

Pharmacokinetic targets (enzymes, transporters)

Pharmacodynamic effect descriptors

Ontology alignment follows a hybrid strategy:

External ontologies where appropriate:

NCIT (drugs, drug classes)

DINTO (mechanistic interaction types, partial)

MONDO (underlying diseases)

FoodOn, NCBI Taxonomy

UniProt / Pfam (PK targets)

A DHFI mini-ontology for domains insufficiently covered by existing ontologies
(health-related conditions, interaction-level PD effects)

Internal identifiers remain the primary reference system to preserve reproducibility and independence from ontology version changes.

Repository Structure
dhfi-checker-main/
├── dhfi-backend/        # Node.js backend & inference API
│   └── src/
│       └── services/
│           └── graphdbClient.js   # SPARQL client for GraphDB
├── frontend/            # Web frontend
├── docker-compose.yml   # Reproducible deployment
├── Dockerfile
├── README.md

Reproducibility and Installation
Tested environment

Node.js ≥ 20

GraphDB (Free Edition) as the primary RDF triplestore

Modern web browser (Chrome recommended)

DHFI-C does not use MongoDB or any relational database.
All interaction reasoning is performed over the RDF knowledge graph in GraphDB.

Local development (non-Docker)
Backend
cd dhfi-backend
npm install
cp .env.example .env
# set SPARQL_ENDPOINT to your GraphDB repository endpoint
npm run dev

Frontend
cd frontend
npm install
npm run dev


Note: GraphDB must be running, and the DHFI repository must be available
at the configured SPARQL_ENDPOINT before starting the backend.

Docker-based setup (recommended for reproducibility)
docker-compose up --build


This launches:

GraphDB

Backend API

Frontend interface

Versioning and Stability

This repository corresponds to the version evaluated in the manuscript:

An Integrated Drug–Herb–Food Interaction Checker with Ontology-Guided Knowledge Graph Reasoning and Health-Condition–Integrated Interpretation
F1000Research (under review)

Current version: v0.9.0 (research prototype)

Intended Use and Limitations

DHFI-C is intended as a research and educational tool to support:

Transparent interaction interpretation

Mechanism-driven hypothesis generation

Multi-domain interaction assessment

It is not intended to replace clinical judgment, regulatory drug safety evaluation, or professional medical decision-making.

License

This software is released under the XXX License.

How to Cite

If you use DHFI-C in academic work, please cite:

[Authors]. An Integrated Drug–Herb–Food Interaction Checker with Ontology-Guided Knowledge Graph Reasoning and Health-Condition–Integrated Interpretation.
F1000Research, under review.
