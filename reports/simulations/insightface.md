# Onda 9 — Simulação preventiva InsightFace

**Total de cenários:** 301
**Safe:** 263 | **Warn:** 38 | **Unsafe:** 0

## Por categoria

| Categoria   | Safe | Warn | Unsafe |
| ----------- | ---: | ---: | -----: |
| detection   |   53 |    7 |      0 |
| recognition |   43 |   17 |      0 |
| analysis    |   32 |    9 |      0 |
| spoofing    |   58 |    2 |      0 |
| migration   |   30 |    0 |      0 |
| integration |   28 |    2 |      0 |
| security    |   19 |    1 |      0 |

## Warnings (não bloqueantes)

- **detection/face_yaw_90deg_profile** — No frontal landmarks; encoding skipped
- **detection/face_low_light_10lux** — Score < 0.4; skipped by config
- **detection/brightness_20_lux** — below threshold
- **detection/brightness_24_lux** — below threshold
- **detection/brightness_28_lux** — below threshold
- **detection/brightness_32_lux** — below threshold
- **detection/brightness_36_lux** — below threshold
- **recognition/identical_twin** — Distance ~0.35; suggest ask secondary factor
- **recognition/aging_20_years** — Distance ~0.55; may miss
- **recognition/mask_covid** — Distance ~0.60; rely on eye region only
- **recognition/threshold_0.7_loose** — More false positives; document tradeoff
- **recognition/threshold_0.300** — sweep of match threshold
- **recognition/threshold_0.308** — sweep of match threshold
- **recognition/threshold_0.316** — sweep of match threshold
- **recognition/threshold_0.324** — sweep of match threshold
- **recognition/threshold_0.332** — sweep of match threshold
- **recognition/threshold_0.340** — sweep of match threshold
- **recognition/threshold_0.348** — sweep of match threshold
- **recognition/threshold_0.356** — sweep of match threshold
- **recognition/threshold_0.364** — sweep of match threshold
- **recognition/threshold_0.372** — sweep of match threshold
- **recognition/threshold_0.380** — sweep of match threshold
- **recognition/threshold_0.388** — sweep of match threshold
- **recognition/threshold_0.396** — sweep of match threshold
- **analysis/age_estimation_5yr** — expected ±5yr, edge cases documented
- **analysis/age_estimation_7yr** — expected ±5yr, edge cases documented
- **analysis/age_estimation_9yr** — expected ±5yr, edge cases documented
- **analysis/age_estimation_11yr** — expected ±5yr, edge cases documented
- **analysis/age_estimation_77yr** — expected ±5yr, edge cases documented
- **analysis/age_estimation_79yr** — expected ±5yr, edge cases documented
- **analysis/age_estimation_81yr** — expected ±5yr, edge cases documented
- **analysis/age_estimation_83yr** — expected ±5yr, edge cases documented
- **analysis/age_estimation_85yr** — expected ±5yr, edge cases documented
- **spoofing/3d_silicone_mask** — Silent-FAS not tuned for 3D masks
- **spoofing/deepfake_video_hires** — May bypass; require secondary factor
- **integration/cold_start_penalty** — first call ~2s; document to users
- **integration/cost_60_cameras_1fps** — ~$800/mo; throttle recommended
- **security/bypass_liveness_via_flag** — liveness_required=true blocks

_Gerado em 2026-07-16T17:53:06.414Z_
