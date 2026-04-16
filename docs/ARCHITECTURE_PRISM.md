# Architecture Prism

## Purpose

This document defines the target architecture for a Latvia-focused policy analysis system that:

- analyzes proposed policy changes against Latvian and EU law
- identifies which laws, articles, and implementing acts must change
- estimates budgetary, operational, and macroeconomic impact
- produces auditable, citation-grounded outputs suitable for expert review

The system is not a generic chatbot. It is a structured policy analysis platform with verifiable legal grounding and explicit economic modeling.

## Design Goals

1. Produce legally grounded outputs with verifiable citations.
2. Support temporal analysis using the law as of a specific date.
3. Combine legal dependency reasoning with economic simulation.
4. Distinguish direct textual entailment from model inference.
5. Preserve a clear human review boundary for high-impact conclusions.
6. Remain testable, observable, and auditable under model and data changes.

## Non-Goals

- Replacing lawyers, economists, or public administrators.
- Publishing unreviewed legal conclusions as authoritative advice.
- Treating LLM output as a source of truth without source verification.
- Solving all policy domains in the first release.

## Core Principles

### 1. LLM as orchestrator, not oracle

LLMs may parse, route, synthesize, and explain, but they do not constitute the legal knowledge base or the economic model.

### 2. Claim-first output model

The system does not generate free-form conclusions as its primary artifact. It generates structured claims. Every claim must carry evidence, time validity, confidence, and review status.

### 3. Temporal legality is mandatory

All legal analysis must be parameterized by `as_of_date`. Every node, edge, citation, and report must be tied to a versioned legal state.

### 4. Grounding is a hard invariant

No legal claim may be emitted without source anchors. Unsupported claims must be refused, downgraded, or sent for expert review.

### 5. Multiple models, not one model

No single engine can cover legal interpretation, administrative implementation, micro-fiscal impact, and macroeconomic effects. The system uses a model stack.

### 6. Behavior-based policy analysis

The system must evaluate policies through legally cognizable criteria such as conduct, process, eligibility conditions, sanctions, capacity, and proportionality. It must not normalize unlawful identity-based policy design.

## Prism View

The architecture is organized through six lenses:

1. Knowledge Prism
2. Reasoning Prism
3. Economic Prism
4. Workflow Prism
5. Control Prism
6. Delivery Prism

---

## 1. Knowledge Prism

### 1.1 Source Domains

The system ingests and normalizes:

- Latvian laws
- Cabinet regulations and delegated acts
- EU regulations, directives, and implementing acts
- constitutional and administrative court jurisprudence where available
- ministry annotations, impact assessments, and explanatory notes
- institutional competence maps
- budget classifications and open data
- macroeconomic data and model parameters

### 1.2 Storage Pattern

The knowledge layer uses a hybrid storage model:

- `Graph store`: authoritative relationships and dependency traversal
- `Vector index`: semantic retrieval over chunks, annotations, and jurisprudence
- `Versioned source store`: immutable text snapshots and span references
- `Relational store`: metadata, claims, runs, reviews, audit logs, and economic outputs

### 1.3 Why Hybrid Graph + Vector + Long-Context Window

Vector retrieval is good at relevance. It is not good at legal topology. Long-context windows are good at in-context reasoning over a known document set but cannot traverse graph topology they have not been shown.

Graph retrieval is necessary for:

- amendment chains
- delegated authority chains
- conflicts between higher and lower norms
- institutional responsibility mapping
- EU constraints on domestic law
- procedural dependencies across acts

Vector retrieval is necessary for:

- semantically matching policy proposals to relevant norms
- finding similar reasoning in annotations and case law
- retrieving supporting materials outside strict citation chains

Long-context retrieval is useful for:

- loading a focused set of 10–20 relevant acts into a single reasoning context
- improving coherence when multiple interdependent acts must be analyzed together
- bootstrapping the MVP before the full graph is populated

In a narrow domain like the MVP (5–10 core acts), graph traversal identifies which acts are relevant, and those acts are loaded in full into the context window for reasoning. This outperforms chunked retrieval on coherence and reduces citation errors from fragmented chunks. As coverage grows, graph-backed retrieval becomes the primary path and long-context loading becomes a fallback for complex multi-act reasoning tasks.

### 1.4 Core Entities

The minimum graph should model:

- `LegalAct`
- `LegalVersion`
- `Article`
- `Clause`
- `Definition`
- `EUAct`
- `Judgment`
- `Institution`
- `Procedure`
- `Sanction`
- `PolicyProposal`
- `BudgetLine`
- `EconomicChannel`
- `CapacityConstraint`

### 1.5 Core Edges

- `AMENDS`
- `IMPLEMENTS`
- `REFERENCES`
- `DELEGATES_TO`
- `CONFLICTS_WITH`
- `CONSTRAINED_BY_EU`
- `INTERPRETED_BY`
- `TRIGGERS_PROCEDURE`
- `REQUIRES_CAPACITY_FROM`
- `AFFECTS_BUDGET_LINE`
- `MAPS_TO_ECONOMIC_CHANNEL`
- `SUPERSEDES`

### 1.6 Temporal Versioning

Every legal node and edge must support:

- `valid_from`
- `valid_until`
- `publication_date`
- `effective_date`
- `repeal_date`
- `version_id`
- `source_url`
- `canonical_citation`

Every analysis request must include:

- `jurisdiction`
- `as_of_date`

Every output must record:

- which legal versions were used
- which retrieval index snapshot was used
- which ingestion build produced the underlying graph

### 1.7 Span Anchors

All citations must be resolvable to exact spans inside immutable source text. A citation is incomplete if it only references the act name without article and clause resolution where such granularity exists.

---

## 2. Reasoning Prism

### 2.1 Agent Roles

The reasoning layer is a directed workflow of specialized agents or deterministic stages.

- `Policy Parser`
- `Legal Decomposition Agent`
- `Authority Retrieval Agent`
- `Citation Verifier`
- `Constraint Screening Agent`
- `Deep Constraint Analysis Agent`
- `Implementation Mapping Agent`
- `Economic Orchestrator`
- `Claim Compiler`
- `Review Gate`
- `Report Generator`

### 2.2 Model Allocation

Use different model classes for different tasks.

- `Fast standard model`
  - classification
  - extraction
  - retrieval routing
  - draft claim generation
  - summarization

- `Thinking model`
  - deep legal conflict analysis
  - proportionality and constitutional balancing
  - multi-hop conflict analysis across Latvian law and EU law
  - reconciliation of conflicting constraints

The thinking model must not be the default for the entire pipeline. It should be invoked only when:

- direct textual entailment is insufficient
- retrieved authorities conflict
- constitutional review is implicated
- EU law and national law interact materially
- verifier support is partial rather than direct

### 2.3 Structured State Passing

Agents do not exchange prose as the primary protocol. They exchange typed objects.

Minimum workflow objects:

- `PolicyIntent`
- `PolicyMechanism`
- `LegalIssue`
- `AuthorityPack`
- `ConstraintFinding`
- `ImplementationImpact`
- `EconomicScenario`
- `Claim`
- `ReviewDecision`

This makes the pipeline testable, diffable, and auditable across model versions.

### 2.4 Claim Contract

Every meaningful output is represented as a claim.

```json
{
  "id": "claim_001",
  "text": "Proposal likely requires amendment of Immigration Law article 23, paragraph 2.",
  "type": "amendment_needed",
  "as_of_date": "2026-03-22",
  "jurisdiction": "LV",
  "citations": [
    {
      "source_node_id": "lv_immigration_law_art23_p2",
      "article": "23",
      "clause": "2",
      "span_start": 148,
      "span_end": 261,
      "valid_from": "2024-01-01",
      "valid_until": null
    }
  ],
  "verifier_status": "supported",
  "confidence_tier": "medium",
  "requires_human_review": true,
  "assumptions": [
    "The proposal creates an automatic permit consequence after repeated administrative offenses."
  ]
}
```

### 2.5 Grounded Generation and Verification

The claim lifecycle is:

1. Retrieve authorities.
2. Draft candidate claim.
3. Verify that cited source text supports the claim.
4. Mark claim as:
   - `supported`
   - `partially_supported`
   - `unsupported`
   - `unverified`
5. Either:
   - publish to claim set
   - downgrade confidence
   - route to review
   - refuse to assert

The verifier may be a combination of deterministic span checks, rule checks, and model-based semantic verification.

### 2.6 Confidence Tiers

Confidence is claim-level, not only section-level.

- `HIGH`
  - directly entailed by source text
  - citations are exact
  - verifier status is `supported`

- `MEDIUM`
  - requires legal interpretation
  - source support is strong but not mechanically conclusive
  - verifier status is `supported` or `partially_supported`

- `LOW`
  - inference-heavy
  - support is indirect or incomplete
  - mandatory expert review

Confidence must be driven by evidence quality, not by LLM token probabilities.

### 2.7 Refusal Behavior

The system must refuse or defer when:

- the current legal version cannot be confirmed
- citation support is insufficient
- sources conflict materially without resolution
- the proposal is underspecified
- the analysis crosses a configured policy or legal safety boundary

### 2.8 Conflict Resolution

If legal and economic outputs point in different directions, both are preserved. The system does not collapse them into a single synthetic score.

Examples:

- legally feasible but fiscally costly
- fiscally favorable but procedurally infeasible
- constitutional risk despite administrative implementability

---

## 3. Economic Prism

### 3.1 Multi-Model Stack

The economic engine is a composition of models:

- `Case-flow model`
  - predicts administrative volume, appeals, enforcement actions, detention, removals

- `Micro-fiscal model`
  - estimates direct state cost and savings by institution, program, and budget line

- `Capacity model`
  - estimates staffing, queueing, and processing constraints in institutions

- `Macro model`
  - DSGE, CGE, or reduced-form satellite models for aggregate economic effects

### 3.2 Explicit Interfaces

Each model must have a defined contract.

`Case-flow model`
- inputs:
  - policy mechanism
  - baseline case volumes
  - enforcement assumptions
- outputs:
  - cases opened
  - appeal rates
  - removals
  - queue pressure

`Micro-fiscal model`
- inputs:
  - case-flow outputs
  - unit cost assumptions
  - budget mappings
- outputs:
  - direct cost by institution
  - direct savings by institution
  - yearly budget delta

`Capacity model`
- inputs:
  - case-flow outputs
  - staffing and service time assumptions
- outputs:
  - capacity breaches
  - backlog changes
  - estimated processing delays

`Macro model`
- inputs:
  - labor supply changes
  - fiscal shock channels
  - migration flow assumptions
  - investment and consumption channels
- outputs:
  - GDP impact
  - employment impact
  - inflation impact
  - medium-term fiscal ratios

### 3.3 Mapping to Economic Channels

Legal and policy mechanisms must map explicitly to economic channels. Example channels:

- labor supply
- public employment demand
- administrative compliance cost
- household disposable income
- transfer eligibility
- business hiring friction
- detention and removal cost
- public order enforcement load

The `EconomicChannel` entity is the bridge between legal mechanisms and model inputs.

### 3.4 Uncertainty Quantification

All economic outputs must carry:

- point estimate
- plausible range
- scenario assumptions
- key sensitivity drivers

This applies to:

- budget effects
- capacity effects
- macro effects

### 3.5 Migration Example

For migration policy, DSGE alone is insufficient. The architecture must support:

- permit issuance and cancellation case flow
- offense escalation flow
- police and court workload
- removal and detention cost
- labor market and demographic effects

---

## 4. Workflow Prism

### 4.1 End-to-End Request Flow

1. User submits a policy proposal.
2. Parser converts it to structured intent.
3. Decomposition stage identifies legal mechanisms.
4. Retrieval stage builds the authority pack from graph, vector, and source store.
5. Verifier checks candidate supports and rejects weak anchors.
6. Fast model screens constraints and implementation implications.
7. Thinking model performs deep analysis when triggered.
8. Economic orchestrator runs case-flow, micro-fiscal, capacity, and macro models.
9. Claim compiler assembles evidence-backed claims.
10. Review gate determines what may be shown automatically.
11. Report generator renders expert-facing output.

### 4.2 Stateful Orchestration

Use an explicit state graph, not ad hoc chaining.

Recommended properties:

- typed global state
- deterministic handoff schemas
- resumable execution
- branch and retry support
- event logging at every stage

This can be implemented with LangGraph or an equivalent orchestration framework.

### 4.3 Trigger Conditions for Deep Legal Analysis

Escalate to deeper reasoning when:

- there is a constitutional rights issue
- the proposal changes status, liberty, or expulsion conditions
- there is possible conflict between Latvian and EU law
- proportionality balancing is required
- one norm references another through multiple hops

### 4.4 Human-in-the-Loop Gates

Mandatory review should be triggered for:

- low-confidence claims
- unsupported or partially supported claims in high-impact areas
- constitutional incompatibility findings
- EU law conflict findings
- recommendations likely to alter enforcement or deprivation rights

### 4.5 Output Modes

The system should support:

- `Exploration mode`
  - broad search, hypothesis generation, lower threshold for surfaced leads

- `Analysis mode`
  - stricter claim gating, stronger evidence requirements

- `Briefing mode`
  - review-passed claims only, citation-complete, audit-ready

---

## 5. Control Prism

### 5.1 Safety and Legality Controls

The system must enforce:

- claim grounding
- refusal on unsupported legal assertions
- identity-based policy risk detection
- mandatory review for coercive or high-impact policy claims
- explicit separation between descriptive and normative outputs

### 5.2 Auditability

Every run must log:

- request payload
- as-of date
- source versions
- retrieval results
- graph traversal decisions
- model invocations
- prompts and tool outputs where policy permits
- verifier outcomes
- human review actions
- final published claims

### 5.3 Model Governance

Track per run:

- model name and version
- prompt version
- schema version
- retrieval index version
- graph snapshot version
- economic model version

### 5.4 Evaluation and Red Teaming

The system requires continuous evaluation against:

- false citation generation
- unsupported conflict assertions
- temporal version mistakes
- missing amendment dependencies
- failure to detect EU constraints
- overconfident economic estimates
- improper refusal behavior

Test suites should include adversarial prompts designed to induce:

- invented legal provisions
- false article references
- fabricated compliance claims
- false confidence inflation

### 5.5 Compliance Posture

The architecture must assume that a system providing policy analysis with legal consequence is a **high-risk AI system** under the EU AI Act (Annex III categories covering administration of justice and democratic processes). This classification implies binding obligations, not aspirational guidelines:

- mandatory human oversight mechanisms built into the architecture
- logging and audit trail requirements with defined retention periods
- explainability of outputs to affected persons and competent authorities
- conformity assessment and documentation before deployment
- clear accountability assignment for each human review boundary

Additionally, the system must comply with GDPR where analysis involves personal data or individual case processing (e.g., migration case-flow modeling).

These requirements affect the architecture from day one. They are not a legal wrapper added after the system is built. Specifically:

- the review gate in the workflow (section 4.4) is not optional — it is a compliance control
- the audit log (section 5.2) must be designed for external inspection, not only internal debugging
- the confidence tier system (section 2.6) is the explainability mechanism — its output format must be human-readable for non-technical reviewers

---

## 6. Delivery Prism

### 6.1 External Interfaces

Primary interfaces:

- `Policy analysis API`
- `Review and audit API`
- `Knowledge ingestion pipeline`
- `Simulation and modeling API`
- `Frontend policy workbench`

### 6.2 Primary User Roles

- policy analyst
- legal expert
- economist
- administrator / reviewer
- ingestion operator

### 6.3 Core UI Sections

For each proposal, the UI should expose:

- policy summary
- affected Latvian acts
- affected EU acts
- constitutional and proportionality concerns
- implementation map by institution
- budget impact range
- macroeconomic impact range
- assumptions and sensitivities
- confidence and verifier status per claim
- claims requiring expert review
- audit trail

### 6.4 Report Artifact

A report is not a narrative blob. It is a rendering of:

- structured proposal
- verified claim set
- supporting sources
- model outputs
- review decisions

---

## Reference Architecture

```text
                        +--------------------------+
                        |  Frontend Policy UI      |
                        |  Review + Audit Console  |
                        +------------+-------------+
                                     |
                                     v
                        +--------------------------+
                        |   FastAPI / API Layer     |
                        |   Auth, DTOs, Sessions    |
                        +------------+-------------+
                                     |
                                     v
                    +--------------------------------------+
                    |   Workflow Orchestrator              |
                    |   Typed State Graph                  |
                    |   Runs, Retries, Branches, Logs      |
                    +---+----------+----------+------------+
                        |          |          |
                        v          v          v
              +-------------+ +---------+ +-------------+
              | Legal Flow   | | Verifier| | Econ Flow   |
              | Parse/Decomp | | Claims  | | Multi-Model |
              +------+------+ +----+----+ +------+------+
                     |               |             |
                     v               v             v
           +----------------+  +-----------+  +----------------+
           | Graph Store    |  | Source    |  | Case-flow      |
           | Law + EU +     |  | Snapshot  |  | Micro-fiscal   |
           | Institutions   |  | Store     |  | Capacity       |
           +--------+-------+  +-----+-----+  | DSGE / Macro   |
                    |                |        +--------+-------+
                    v                v                 |
             +-----------+    +-------------+          |
             | Vector DB |    | Relational  |<---------+
             | Chunks,   |    | Claims,     |
             | Notes,    |    | Reviews,    |
             | Cases     |    | Runs, Logs  |
             +-----------+    +-------------+
```

---

## MVP Recommendation

Do not start with all law. Start with one constrained domain.

Recommended MVP domain:

- migration
- administrative liability
- public order
- permit cancellation and removal procedures

Recommended MVP scope:

- 5 to 10 core Latvian acts loaded in full text
- relevant EU acts (Return Directive, Reception Conditions Directive, ECHR Article 5 and 8)
- 3 institutions minimum: PMLP, police, courts
- graph for dependency traversal + long-context window for in-context reasoning over retrieved acts
- claim grounding with verifier
- case-flow + micro-fiscal + initial DSGE interface

Bootstrap strategy: load acts into long-context window first, build graph edges incrementally. The graph does not need to be complete for the first run. A partial graph that identifies which acts to load is enough to produce useful output.

### MVP Success Criteria

The MVP is successful if it can:

1. parse a migration-related proposal into structured mechanisms
2. identify relevant Latvian and EU legal sources as of a given date
3. produce citation-grounded claims on likely amendments and legal risks
4. estimate administrative and fiscal effects with explicit uncertainty
5. route ambiguous or high-risk conclusions to human review

## Decisions Locked by This Prism

1. The system will use hybrid graph + vector retrieval.
2. The system will use claim-level evidence and confidence contracts.
3. The system will require temporal versioning throughout the legal layer.
4. The system will use multiple economic models rather than a single black-box simulator.
5. The system will reserve reasoning models for high-value deep legal analysis.
6. The system will preserve a hard human review boundary for high-impact claims.

## Open Decisions

1. Graph implementation: Neo4j versus PostgreSQL-based graph patterns versus another graph-native store.
2. Vector implementation: pgvector versus Qdrant versus Weaviate.
3. Orchestration framework: LangGraph versus in-house typed workflow engine.
4. Source acquisition strategy for Latvian and EU legal texts.
5. Review workflow and access control design for expert users.
6. Exact calibration strategy for migration-related fiscal and macro models.
