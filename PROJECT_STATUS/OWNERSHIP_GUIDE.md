# Ownership Guide — What You Need to Work On

This guide is designed so the team can divide the project without confusion.

## Work that you should own directly

These activities require your project understanding, access, decisions, or coordination.

| Your work | Why you own it | Deliverable |
|---|---|---|
| Confirm the exact problem scope | Decide whether the first target is rupture, idler damage, or general anomaly detection | Signed-off scope statement |
| Get industrial site access | Recordings require permission and safety approval | Site-access and safety approval |
| Identify conveyor assets | The model must know which machines and operating conditions are represented | Conveyor inventory |
| Coordinate maintenance experts | Fault labels need technician confirmation | Named label reviewers |
| Collect representative recordings | Dataset quality determines model usefulness | Raw audio + metadata |
| Maintain the label dictionary | Fault names must be consistent | `fault-label-dictionary.csv` |
| Decide acceptable false alarms | Operations must define what Review/Critical means | Threshold policy |
| Prepare the SIH demonstration | Explain limitations honestly and show evidence | Demo script and test samples |

## Work for an ML/data-science contributor

| Task | Required output |
|---|---|
| Audio preprocessing | Reproducible 16 kHz mono/windowing pipeline |
| Feature extraction | Log-mel spectrogram and MFCC implementations |
| Baseline model | MFCC + Random Forest/GBDT benchmark |
| Primary anomaly model | Normal-only convolutional autoencoder |
| Threshold calibration | Validation-based Normal/Review/Critical cutoffs |
| Evaluation | Session-level metrics and confusion analysis |
| Model export | API-ready model artifact and version file |

## Work for a mobile/backend developer

| Task | Required output |
|---|---|
| Audio upload | Multipart upload or signed object-storage upload |
| Inference API integration | Mobile app calls backend instead of placeholder function |
| Cloud history | Authenticated inspection records and audio references |
| Offline queue | Upload retry for low-connectivity industrial sites |
| Feedback UI | Technician confirms or rejects the prediction |
| Error handling | Safe state when API, audio, or model fails |

## Work for a domain/maintenance expert

| Task | Required output |
|---|---|
| Define fault taxonomy | Practical fault names and severity levels |
| Confirm labels | Evidence-backed normal/fault labels |
| Define measurement points | Safe and repeatable phone/microphone locations |
| Define operating context | Speed, load, ambient noise, weather, maintenance state |
| Review alerts | Determine whether recommendations are operationally useful |

## Work for DevOps/security

| Task | Required output |
|---|---|
| Backend deployment | Reproducible staging environment |
| Secrets and authentication | Secure API and storage access |
| Monitoring | Logs, errors, latency, model version tracking |
| Backups | Recovery process for audio and metadata |
| Access control | Plant/team/operator permissions |

## Simple rule

If the task needs **industrial access, fault confirmation, or operational policy**, you should coordinate it. If the task needs **model training or backend implementation**, assign it to the relevant technical contributor. If the task needs **what counts as safe and useful**, involve a maintenance expert before coding the behavior.
