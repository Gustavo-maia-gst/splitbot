# Skill: GCP List Logs

This tool allows you to list logs from Google Cloud Platform using the Logs Explorer syntax.

## Usage

You can filter logs using the `filters` parameter.

### Parameters

- `filters` (required): An array of strings. Each string is a filter expression. You can verify valid filter syntax in the [Google Cloud Logging Query Language documentation](https://cloud.google.com/logging/docs/view/logging-query-language).
- `limit` (optional): Maximum number of logs to return. Default is 100.
- `hours` (optional): Number of hours to look back. Default is 1 hour. Max is 168 hours (7 days).

### Examples of searching

#### Search for a specific correlation id
```json
{
  "filters": ["jsonPayload.correlationId=\"30406f05-c088-420c-8003-6a200cf64800\""]
}
```

#### Searching for logs of a specific application
Applications have different container names:
sheet db         -> sheet-db-api
backend ou bff   -> bff-api
sas ou auth-api  -> auth-api

```json
{
  "filters": ["jsonPayload.correlationId=\"30406f05-c088-420c-8003-6a200cf64800\"", "resource.labels.container_name=\"sheet-db-api\""]
}
```

#### Search for a specific text payload, anywhere in any log
```json
{
  "filters": ["Process started"]
}
```

#### List error logs from the last 2 hours
```json
{
  "filters": ["severity=ERROR"],
  "hours": 2
}
```

