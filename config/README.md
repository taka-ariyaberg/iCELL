# `config/` directory

The two artifacts a user needs to provide before a run live here.

| File | Status | Purpose |
|---|---|---|
| `config.template.json` | tracked | Copy this to `config.json`; edit for your run. |
| `config.json` | gitignored (you create it) | The actual per-run configuration the engine reads. |
| `config.schema.json` | tracked | JSON Schema (draft 2020-12) that `config.json` must satisfy. |
| `schema.json` | tracked | Documentation of the **CSV input format** (not the config.json structure — separate concern; lives here for historical reasons). |
| `plate_type/*.json` | tracked | Plate dimension definitions; selected by the `plate_type` field in `config.json`. See `plate_type/README.md`. |

## Validating your `config.json`

The schema is enforceable but iCELL doesn't currently validate at startup. To check by hand:

```bash
docker run --rm -v "$PWD/config:/config" python:3.11.10-slim-bookworm sh -c \
  "pip install --quiet jsonschema && python -c 'import json,jsonschema; \
   schema = json.load(open(\"/config/config.schema.json\")); \
   data = json.load(open(\"/config/config.json\")); \
   jsonschema.validate(data, schema); print(\"config.json is valid\")'"
```

Wiring startup validation into the engine is a follow-up (Phase 1 / Phase 9 ratchet).

## Adding a new plate type

See [`plate_type/README.md`](plate_type/README.md). The filename stem (without `.json`) is what you reference from `config.json`'s `plate_type` field.