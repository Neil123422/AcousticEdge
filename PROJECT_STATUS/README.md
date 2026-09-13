# Conveyor Sentinel — Project Status Directory

This directory is the project control center for the conveyor-belt acoustic anomaly-detection app. It separates what is already implemented from what still needs to be built, and identifies the tools, files, people, and evidence required for each remaining portion.

## Current project status

| Area | Status | Who should work on it now? | Priority |
|---|---|---|---|
| Mobile inspection UI | **Completed for POC** | Already implemented; review and test | Done |
| Real microphone capture | **Completed for POC** | Already implemented; test on Android/iOS | Done |
| Local inspection history | **Completed for POC** | Already implemented; review data model | Done |
| Transparent placeholder scoring | **Completed for POC only** | Replace later with real model | Temporary |
| System architecture screen | **Completed for POC** | Keep updated as backend evolves | Done |
| Conveyor audio dataset | **Not started / highest priority** | **You + industrial/domain team** | P0 |
| Audio labeling and metadata | **Not started** | **You + maintenance experts** | P0 |
| Backend audio upload | **Not started** | App/backend developer | P0 |
| Audio preprocessing | **Not started** | ML/backend developer | P0 |
| Real anomaly model | **Not started** | ML engineer/data scientist | P0 |
| Model evaluation | **Not started** | ML engineer + domain expert | P0 |
| Cloud history and authentication | **Not started** | Backend developer | P1 |
| Technician feedback loop | **Not started** | App/backend developer + technicians | P1 |
| Offline upload queue | **Not started** | Mobile developer | P1 |
| Production deployment and monitoring | **Not started** | Backend/DevOps owner | P2 |

## The most important message

The application can currently demonstrate the **record → analyze → result → history** workflow, but it does not yet perform validated rupture detection. The next major milestone is not more UI. It is collecting and labeling real conveyor recordings, then replacing the placeholder analyzer with a tested backend model.

## Recommended work order

1. **Define the data format and safety protocol.**
2. **Collect normal and abnormal conveyor recordings.**
3. **Label the recordings with maintenance confirmation.**
4. **Build the backend upload and preprocessing pipeline.**
5. **Train a normal-only anomaly model.**
6. **Connect the mobile app to backend inference.**
7. **Evaluate on unseen conveyor sessions.**
8. **Add supervised fault classification after enough confirmed examples exist.**
9. **Add accounts, cloud history, feedback, deployment, and monitoring.**

## Directory map

| Folder/file | Purpose |
|---|---|
| `01_completed/` | Records what is already implemented and where it lives in the codebase |
| `02_you_need_to_build/` | Work packages that remain, with tools and acceptance criteria |
| `03_tools_and_resources/` | Recommended software, hardware, datasets, and learning resources |
| `04_templates/` | Ready-to-use CSV, labeling, API, and experiment templates |
| `05_decision_log/` | Decisions, assumptions, risks, and open questions |
| `STATUS_BOARD.md` | One-page checklist for weekly progress tracking |
| `OWNERSHIP_GUIDE.md` | What the student/team should do versus what an engineer or domain expert should do |
| `NEXT_7_DAYS.md` | Concrete short-term plan |

## Status language

- **Completed**: implemented in the current POC and verified by tests or preview review.
- **POC only**: works as a demonstration but must be replaced or validated before safety-related use.
- **In progress**: implementation has started but is not complete.
- **Blocked**: requires data, access, domain approval, hardware, or an unresolved decision.
- **Not started**: no production implementation exists yet.

## Safety rule

A model result is not an authorization to approach, touch, stop, or repair a moving conveyor. All field recordings and responses must follow the plant’s approved safety procedure and be supervised by authorized personnel.
