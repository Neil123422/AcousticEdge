# Decision and Risk Log

Update this file whenever a project assumption changes.

| ID | Type | Question/risk | Current decision | Owner | Status |
|---|---|---|---|---|---|
| D-001 | Scope | What is the first target? | Acoustic anomaly screening; rupture is a later validated class | Team lead | Open for confirmation |
| D-002 | Model | What model comes first? | Normal-only autoencoder plus MFCC/tree baseline | ML owner | Proposed |
| D-003 | Safety | What does Critical mean? | Requires approved inspection procedure; not proof of rupture | Domain expert | Must approve |
| D-004 | Data | How are splits made? | By session/conveyor, never random windows only | ML owner | Decided |
| R-001 | Risk | Too few confirmed fault recordings | Use normal-only anomaly detection and label unknowns | Team | Active |
| R-002 | Risk | Phone microphones vary | Record device metadata and test across devices | Team | Active |
| R-003 | Risk | Industrial noise creates false alarms | Capture context and calibrate thresholds by environment | ML/domain | Active |
| R-004 | Risk | Operators interpret score as certainty | Use careful wording and approved actions | Product/domain | Active |
| R-005 | Risk | Network unavailable at plant | Add local pending queue and retry | Mobile/backend | Planned |

## Questions to answer before field deployment

- Which fault types can be confirmed safely and repeatedly?
- Which measurement points are safe and acoustically useful?
- What false-alarm rate is operationally acceptable?
- Who is authorized to review a Critical result?
- What information must be retained for a maintenance audit?
- What is the fallback when the signal quality is poor?
