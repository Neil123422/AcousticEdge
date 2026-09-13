# Machine-Learning Training Environment Setup

This guide sets up a separate Python workspace for conveyor-sound preprocessing and model training. It does not add Python dependencies to the Expo mobile application. The mobile app remains responsible for recording and displaying results; the Python workspace will eventually produce the model artifact or inference service.

## Recommended architecture

| Layer | Technology | Current status |
|---|---|---|
| Mobile recording | Expo + `expo-audio` | Implemented in the app |
| Training workspace | Python 3.12 + `uv` virtual environment | Set up by this guide |
| Audio preprocessing | FFmpeg, librosa, soundfile, scipy | Dependencies declared |
| Classical baseline | scikit-learn + XGBoost | Dependencies declared |
| Deep model | PyTorch + torchaudio | Dependencies declared; choose CPU/GPU build |
| Experiment reports | pandas, matplotlib, seaborn, YAML | Dependencies declared |
| Future inference API | FastAPI + Uvicorn | Dependencies declared |

> **Important:** Installing the environment does not create a rupture-detection model. The model becomes meaningful only after training and validation on conveyor-specific recordings with reliable labels.

## Environment status in this project

The environment has been created at `ml-training/.venv/` and the dependency smoke test passes. The installed PyTorch build is CUDA-enabled, but this sandbox reports `CUDA available: False`, so training currently runs on CPU here. The exact installed package set is recorded in `ml-training/requirements-lock.txt`.

## 1. Open the project and verify prerequisites

From a terminal, run:

```bash
cd /home/ubuntu/conveyor-acoustic-poc
python3 --version
uv --version
ffmpeg -version | head -1
git --version
```

The current development environment has Python 3.12.3, `uv` 0.12.1, FFmpeg 6.1.1, and Git 2.43. The commands above should work on your machine before continuing.

## 2. Create the Python virtual environment

Use Python 3.12 for consistency with the prepared dependency set:

```bash
cd /home/ubuntu/conveyor-acoustic-poc/ml-training
uv venv --python 3.12 .venv
source .venv/bin/activate
python --version
```

Every new terminal session needs the activation command again:

```bash
cd /home/ubuntu/conveyor-acoustic-poc/ml-training
source .venv/bin/activate
```

On Windows PowerShell, the activation command is:

```powershell
.venv\Scripts\Activate.ps1
```

## 3. Install the dependencies

Install the declared environment:

```bash
cd /home/ubuntu/conveyor-acoustic-poc/ml-training
source .venv/bin/activate
uv pip install -r requirements.txt
```

The dependency file is stored at `ml-training/requirements.txt`. It includes audio processing, classical ML, PyTorch, experiment reporting, API support, and tests.

## 4. Select CPU or NVIDIA GPU PyTorch

The repository’s requirements file contains a safe PyTorch baseline. For a first small dataset, CPU training is acceptable. For spectrogram CNNs and repeated experiments, an NVIDIA GPU is preferable.

Check for an NVIDIA GPU:

```bash
nvidia-smi
```

If `nvidia-smi` is available, visit the official [PyTorch installation selector][1], choose Linux, Pip, Python, and the CUDA version supported by the machine. Install the generated PyTorch and TorchAudio command inside the activated virtual environment. Run that command after the general requirements installation if it replaces the CPU build.

Then verify the selected backend:

```bash
python - <<'PY'
import torch
print('PyTorch:', torch.__version__)
print('CUDA available:', torch.cuda.is_available())
if torch.cuda.is_available():
    print('GPU:', torch.cuda.get_device_name(0))
PY
```

Do not assume that a GPU is available just because PyTorch installed successfully. Record the output in the experiment report.

## 5. Verify every important package

Run this smoke test:

```bash
python - <<'PY'
import librosa
import numpy
import pandas
import scipy
import sklearn
import soundfile
import torch
import torchaudio
import xgboost

print('librosa:', librosa.__version__)
print('numpy:', numpy.__version__)
print('pandas:', pandas.__version__)
print('scipy:', scipy.__version__)
print('scikit-learn:', sklearn.__version__)
print('soundfile:', soundfile.__version__)
print('torch:', torch.__version__)
print('torchaudio:', torchaudio.__version__)
print('xgboost:', xgboost.__version__)
print('Environment check: PASS')
PY
```

If the import check fails, fix the environment before writing training code. Do not silently continue with a partially installed environment.

## 6. Understand the training workspace

The prepared directory is:

```text
ml-training/
├── .venv/                 # local virtual environment; do not commit
├── requirements.txt       # pinned dependency ranges
├── data/
│   ├── raw/               # original recordings; never overwrite
│   ├── metadata/          # CSV manifests and labels
│   └── processed/         # generated features and split manifests
├── src/                   # preprocessing, datasets, models, training, evaluation
├── notebooks/             # exploration only; production logic goes in src/
├── models/                # versioned model artifacts and thresholds
├── reports/               # metrics, plots, and experiment summaries
└── tests/                 # preprocessing and model tests
```

Use the templates in `PROJECT_STATUS/04_templates/` for recording metadata, fault labels, dataset manifests, and file names. Copy the CSV templates into `ml-training/data/metadata/` when you begin collecting recordings.

## 7. Put recordings into the dataset correctly

Keep raw audio immutable. Do not edit or replace a raw file after it has been used in an experiment. Store the metadata row with the same `sample_id` and include the recording session, conveyor ID, operating condition, device, microphone position, label, and reviewer.

A practical initial layout is:

```text
ml-training/data/raw/
├── 2026-09-11_CV-01_normal_001.m4a
├── 2026-09-11_CV-01_normal_002.m4a
└── 2026-09-11_CV-02_unknown_001.m4a
```

The first model should use a session-level split. Do not place different windows from one recording session into both training and test sets.

## 8. First technical milestone

Do not start with a neural network. First prove that one audio file can be loaded, converted to mono 16 kHz, checked for quality, divided into windows, and transformed into both MFCC and log-mel spectrogram features.

The first milestone is complete when the team can produce:

| Output | Required evidence |
|---|---|
| Audio loader | A script reads the recorded file without errors |
| Resampled waveform | Sample rate and channel count are printed |
| Quality result | Silence/clipping/short-duration checks are recorded |
| MFCC features | Shape and configuration are saved |
| Log-mel features | Shape and configuration are saved |
| Dataset manifest | Train/validation/test session IDs are documented |
| Reproducible run | A command regenerates the same result |

## 9. Recommended first training sequence

Run the work in this order:

1. Create a preprocessing script in `ml-training/src/`.
2. Test it on one normal recording.
3. Run it over the dataset and save a processed manifest.
4. Train an MFCC plus tree-based baseline.
5. Record baseline metrics and failure examples.
6. Train a normal-only convolutional autoencoder using log-mel spectrograms.
7. Calibrate the anomaly threshold on validation sessions.
8. Evaluate on unseen sessions and conveyors.
9. Export the model, preprocessing configuration, and threshold together.

The exported model must always be accompanied by its model version, feature configuration, sample rate, window size, hop length, class/threshold policy, and evaluation report.

## 10. Commands to use regularly

From `ml-training/` with the virtual environment active:

```bash
# Run Python tests
pytest -q

# Check installed packages
uv pip list

# Freeze the exact environment for an experiment
uv pip freeze > requirements-lock.txt

# Inspect the project without training
python -c "import torch, librosa; print('ready')"
```

Commit `requirements.txt` and, after the first stable environment, commit `requirements-lock.txt`. Do not commit `.venv/`, raw industrial audio, secrets, or private plant information.

## Common mistakes to avoid

| Mistake | Why it is harmful | Correct approach |
|---|---|---|
| Training before labels and metadata are stable | Results cannot be interpreted | Freeze the label dictionary and manifest format first |
| Randomly splitting windows | Causes leakage from the same recording session | Split by session or conveyor |
| Using only accuracy | Hides missed faults and false alarms | Report precision, recall, F1, false-negative rate, and PR-AUC |
| Editing raw recordings in place | Makes experiments irreproducible | Preserve raw files and generate processed outputs |
| Treating a public dataset as conveyor truth | Machine acoustics differ by asset and environment | Use public data only for prototyping; validate on conveyor recordings |
| Returning a fault for poor-quality audio | Creates unsafe false confidence | Return `poor_quality` or `unknown` |
| Claiming rupture detection too early | The POC would overstate evidence | Use “acoustic anomaly screening” until confirmed evaluation exists |

## What you should do first

Your immediate action is to install this environment and confirm the smoke test passes. Then prepare the first normal-recording metadata manifest. Once you have a small set of real recordings, the next implementation should be the preprocessing script, not the final model.

## References

[1]: https://pytorch.org/get-started/locally/ "PyTorch official installation selector"
[2]: https://librosa.org/doc/latest/ "librosa audio and music signal processing documentation"
[3]: https://scikit-learn.org/stable/ "scikit-learn official documentation"
[4]: https://pytorch.org/audio/stable/ "TorchAudio official documentation"
