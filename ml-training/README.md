# Conveyor Acoustic ML Training

This workspace converts labeled audio recordings into MFCC or log-mel spectrogram features and trains a small PyTorch CNN classifier with validation metrics and early stopping.

## Input manifest

Use `data/metadata/sample_manifest.csv` as the starting format. The required columns are:

```text
file_name,label_code,split
```

The `file_name` is resolved relative to the `--audio-root` directory. The `split` column must contain `train`, `val`, and `test`. For real conveyor data, create these splits by recording session or conveyor before training.

## Run the integrated trainer

From this directory:

```bash
source .venv/bin/activate
python -m src.train_audio_cnn \
  --metadata data/metadata/sample_manifest.csv \
  --audio-root data/raw \
  --feature-kind logmel \
  --output-dir models/audio-cnn \
  --epochs 40 \
  --patience 7
```

For MFCC input, change `--feature-kind logmel` to `--feature-kind mfcc`.

The script performs the following steps:

1. Reads the metadata manifest.
2. Resolves each audio file.
3. Loads mono audio at 16 kHz.
4. Pads or trims each sample to four seconds.
5. Extracts and normalizes the selected feature type.
6. Trains the CNN on the training split.
7. Computes validation loss, accuracy, precision, recall, and macro F1 after every epoch.
8. Saves the best checkpoint when validation loss improves.
9. Stops when validation loss fails to improve for the configured patience.
10. Evaluates the best checkpoint on the test split.

## Outputs

The output directory contains:

```text
best_model.pt   # PyTorch checkpoint, labels, and feature configuration
metrics.json    # Per-epoch validation history and final test metrics
label_map.json # Label-to-index mapping
```

A high test score on a tiny or leaked dataset is not evidence of field performance. Keep session-level splits and report results on unseen conveyors whenever possible.

## Run tests

```bash
pytest -q
```
