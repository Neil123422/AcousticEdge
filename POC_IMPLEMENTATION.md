# Conveyor Sentinel — Acoustic Inspection POC

## What is implemented

This first working slice is a native Expo mobile application for conveyor inspection. It includes a real microphone recording flow, conveyor selection, a signal-quality gate, a transparent demo scoring layer, local inspection history, and a system-map screen explaining where the production machine-learning components will sit.

The app deliberately labels the current score as a **POC anomaly-score placeholder**. The capture and decision workflow is real, but the production model must be trained and validated on conveyor-specific recordings before it is used for safety decisions.

## User flow

1. Select a conveyor asset.
2. Start an inspection from a safe measurement point.
3. Record a short audio sample with the phone microphone.
4. Stop the recording and run the POC analysis layer.
5. Receive Normal, Review, or Critical status.
6. Review the result and recommendation.
7. View the inspection in the local history tab.

## App areas

- `app/(tabs)/index.tsx`: Inspection screen and microphone recording flow.
- `app/(tabs)/architecture.tsx`: Component map representation inside the app.
- `app/(tabs)/history.tsx`: Device-local inspection history.
- `lib/poc-analysis.ts`: Transparent deterministic scoring boundary used until a trained model exists.
- `lib/inspection-store.ts`: AsyncStorage persistence for inspection records.
- `tests/poc-analysis.test.ts`: Unit tests for the risk bands and recording-quality gate.

## Run locally

From the project directory:

```bash
pnpm dev
```

The scaffold starts Expo web preview and the template server together. For a native device, use the QR route provided by the project environment or run the standard Expo command for the connected device.

## Validate changes

```bash
pnpm test -- --run
pnpm check
```

## Replacing the placeholder model

The next implementation phase should replace `analyzeRecording()` with a backend inference call. The server contract should accept:

- audio file or object-storage reference;
- conveyor ID;
- belt speed and load state;
- microphone position;
- recording timestamp;
- device metadata.

The backend should then:

1. resample to 16 kHz mono;
2. perform clipping and noise checks;
3. segment the recording into overlapping windows;
4. create log-mel spectrogram features;
5. run the normal-only convolutional autoencoder;
6. optionally run the MFCC plus gradient-boosted-tree classifier;
7. aggregate window scores;
8. return the score, threshold, model version, signal quality, and recommended action.

The mobile UI already has the result shape needed for that contract. Do not claim rupture detection until an evaluation set containing confirmed conveyor faults and unseen recording sessions is available.

## Data collection requirements

Collect normal and confirmed abnormal recordings across conveyor speed, load, noise, microphone position, device, and maintenance state. Split train, validation, and test data by recording session rather than random audio windows. Store the original audio and context metadata so that false alerts can be investigated.

## Safety boundary

The POC must never instruct an operator to approach a moving hazard or bypass plant controls. A Critical result means that the approved site inspection or shutdown procedure should be initiated by authorized personnel.
