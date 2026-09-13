# Status Board

Update this file every week. Replace `[ ]` with `[x]` only when the acceptance criterion is met.

## A. Current POC — completed

- [x] Mobile inspection screen exists.
- [x] Conveyor selector exists.
- [x] Microphone permission flow exists.
- [x] Native audio recording flow exists.
- [x] Recording timer exists.
- [x] POC Normal/Review/Critical result states exist.
- [x] Local inspection history exists.
- [x] Architecture/system map screen exists.
- [x] Unit tests for placeholder scoring pass.
- [x] TypeScript check passes.

## B. Data and field preparation — you need to complete

- [ ] Select first pilot plant or test location.
- [ ] Obtain permission to record industrial audio.
- [ ] Write the safe recording procedure.
- [ ] List the first 3–5 conveyor assets.
- [ ] Define microphone positions.
- [ ] Define recording duration and sample rate.
- [ ] Create the metadata sheet from `04_templates/recording-metadata-template.csv`.
- [ ] Create the fault dictionary from `04_templates/fault-label-dictionary.csv`.
- [ ] Collect at least 20 normal recordings per pilot conveyor.
- [ ] Collect confirmed abnormal recordings where safely available.
- [ ] Get maintenance expert confirmation for abnormal labels.
- [ ] Store original files without overwriting them.

## C. Backend and audio pipeline — developer work

- [ ] Define upload API contract.
- [ ] Implement multipart or signed-upload endpoint.
- [ ] Store audio and metadata.
- [ ] Convert audio to mono 16 kHz.
- [ ] Detect clipping and unusable signal quality.
- [ ] Segment audio into overlapping windows.
- [ ] Implement log-mel spectrogram extraction.
- [ ] Implement MFCC extraction.
- [ ] Write preprocessing unit tests.

## D. Machine-learning work — ML work

- [ ] Create train/validation/test split by recording session.
- [ ] Train MFCC + tree-based baseline.
- [ ] Train normal-only convolutional autoencoder.
- [ ] Calculate reconstruction-error anomaly scores.
- [ ] Calibrate thresholds on validation data.
- [ ] Test on unseen conveyor/session data.
- [ ] Measure false positives and false negatives.
- [ ] Add Unknown/Poor Quality result state.
- [ ] Version and export the model.

## E. Mobile integration — developer work

- [ ] Replace `analyzeRecording()` with an API call.
- [ ] Upload audio with conveyor and operating metadata.
- [ ] Show server signal quality.
- [ ] Show model version and timestamp.
- [ ] Handle offline mode and retry.
- [ ] Add retake sample flow.
- [ ] Add technician feedback.
- [ ] Add safe-action wording reviewed by the plant.

## F. Cloud product layer — later

- [ ] Add authentication.
- [ ] Add plant/conveyor registration.
- [ ] Add cloud inspection history.
- [ ] Add role-based access.
- [ ] Add audio playback/download permissions.
- [ ] Add export/report generation.
- [ ] Add monitoring and error alerts.
- [ ] Add model-version rollback.

## G. Demo readiness

- [ ] Prepare one normal sample.
- [ ] Prepare one repeatable abnormal sample, if safely available.
- [ ] Demonstrate poor-quality/too-short sample.
- [ ] Show the architecture map.
- [ ] Explain that the current placeholder is not a validated rupture detector.
- [ ] Present measured evaluation results, not invented accuracy.
