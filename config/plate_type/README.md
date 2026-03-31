# Plate Type Definitions

This directory contains plate format definitions. Each JSON file defines the layout of a different plate type.

## Available Plate Types

- **384_well.json** - 384-well plate (16 rows × 24 columns)
- **96_well.json** - 96-well plate (8 rows × 12 columns)
- **6_well.json** - 6-well plate (2 rows × 3 columns)

## File Format

Each plate type file follows this schema:

```json
{
  "name": "Display name of the plate",
  "description": "Brief description",
  "rows": ["A", "B", "C", ...],
  "columns": [1, 2, 3, ...]
}
```

## Adding a New Plate Type

1. Create a new `{name}.json` file in this directory
2. Define the rows and columns for your plate format
3. Update `config.json` to use `"plate_type": "{name}"`

Example for a 24-well plate:

```json
{
  "name": "24-well plate",
  "description": "24-well plate: 4 rows (A-D) × 6 columns",
  "rows": ["A", "B", "C", "D"],
  "columns": [1, 2, 3, 4, 5, 6]
}
```

Save as `24_well.json`, then reference it in config.json.

## Usage in config.json

```json
{
  "plate_type": "384_well",
  ...
}
```

The system will automatically load the corresponding plate definition file.
