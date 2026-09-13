# Audio File Naming Convention

Use a stable, sortable filename:

```text
YYYY-MM-DD_CONVEYORID_LABEL_SESSIONNUMBER.ext
```

Examples:

```text
2026-09-11_CV-01_normal_001.m4a
2026-09-11_CV-01_idler_fault_002.m4a
2026-09-11_CV-02_unknown_003.wav
```

The filename is only a convenience. The authoritative metadata is the CSV row and the immutable sample ID. If a label changes after technician review, update the metadata and manifest but preserve the original file and checksum.
