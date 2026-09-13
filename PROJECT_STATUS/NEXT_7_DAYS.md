# Next 7 Days — Practical Starting Plan

## Day 1: Freeze the scope

Write one sentence defining the first target. Recommended wording: “Detect acoustic anomalies in conveyor idlers and belt operation, then recommend an approved inspection.” Do not claim full rupture diagnosis until the data supports it.

## Day 2: Prepare the recording protocol

Select the first pilot conveyor, define the safe microphone position, decide the minimum recording duration, and complete the safety review with an authorized person. Use `04_templates/recording-protocol.md` as the starting point.

## Day 3–4: Collect normal recordings

Record multiple sessions across normal speed/load conditions. Complete metadata immediately after each recording. Keep the original audio and do not rename files without updating the metadata row.

## Day 5: Create the first dataset manifest

Use `04_templates/dataset-manifest-template.csv`. Check for missing metadata, duplicate files, unusable recordings, and sessions that accidentally mix operating conditions.

## Day 6: Decide the backend contract

Review `02_you_need_to_build/02_BACKEND_AND_AUDIO_PIPELINE.md` and agree on the upload request and response shape. Keep the placeholder analyzer in the app until a working endpoint exists.

## Day 7: Choose the first ML baseline

Install the Python audio/ML environment and run MFCC extraction on a small sample set. The first goal is not high accuracy; it is to prove the dataset can be loaded, transformed, split by session, and evaluated reproducibly.

## End-of-week definition of success

You should have a safe recording procedure, a pilot conveyor, a first set of normal samples, complete metadata, a decided API contract, and a reproducible preprocessing experiment. This is more valuable than adding another visual screen before the data foundation exists.
