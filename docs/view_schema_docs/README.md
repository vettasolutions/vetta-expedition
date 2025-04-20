# Stoplight Analytics Schema Documentation

## Overview

This directory contains documentation for the `stoplight_analytics` schema, which consists of views that pull data from various source schemas in the database. This documentation follows the format of the existing source schema documentation while adding data quality checks and PII recommendations.

## View Structure and Source Tables

The `stoplight_analytics` schema contains views that reference tables from the following source schemas:

| View Schema | Source Schema | Description |
|-------------|---------------|-------------|
| `stoplight_analytics` | `data_collect` | Contains survey data collection tables like `snapshot`, `survey_definition` |
| `stoplight_analytics` | `ps_families` | Contains family data like `family`, `family_members` |
| `stoplight_analytics` | `library` | Contains reference data like `stoplight_indicator` |

## Documentation Format

Each CSV file in this directory documents a view in the `stoplight_analytics` schema with the following columns:

- **Schema Name**: The schema that contains the view (`stoplight_analytics`)
- **Table Name**: The name of the view
- **Field Name**: The name of the field within the view
- **Data Type**: The PostgreSQL data type of the field
- **Description**: A description of the field's purpose
- **Sample Values**: Example values to illustrate the field
- **Required?**: Indicates if the field is required (although in views all fields show as nullable)
- **Notes**: Additional information, particularly the source field in the original table
- **Data Quality Checks**: Recommended validation rules for the field
- **PII**: Indicates if the field contains Personally Identifiable Information

## Data Quality Recommendations

For robust data quality management of these views, consider implementing the following:

1. **Regular View Maintenance**:
   - Ensure views stay in sync with source tables when source schemas change
   - Validate view performance periodically

2. **PII Data Handling**:
   - Fields marked as PII require special handling
   - Consider data masking or encryption for sensitive fields
   - Implement access controls for views containing PII

3. **Data Validation**:
   - Implement the suggested data quality checks for each field
   - Create materialized views with constraints for critical reporting tables
   - Run periodic validation jobs to catch inconsistencies

4. **Field-specific Validations**:
   - Foreign key validations ensure referential integrity
   - Date/timestamp fields should be validated for chronological consistency
   - Enumeration fields should be strictly validated against allowed values
   - JSONB fields should be validated for structure and content

## View-Source Field Mapping

The CSV files provide a mapping between each field in a view and its source field. This mapping is documented in the "Notes" column with the format:

```
Source: {source_schema}.{source_table}.{source_field}
```

For fields that exist in the view but not in the source table, the note indicates:

```
Source: Added in view, not in source table
```

This documentation helps maintain the link between analytical views and source data, making it easier to trace data lineage.

## Key Data Relationships

Understanding the relationships between views in the `stoplight_analytics` schema:

- `family` contains basic family information
- `family_members` provides details about individuals in each family
- `snapshot` represents a point-in-time survey of a family's situation
- `snapshot_stoplight` and related views contain indicator measurements
- `stoplight_indicator` defines the indicators being measured

By documenting these views with their sources and relationships, data analysts can more effectively work with the data while maintaining awareness of data quality and privacy concerns. 