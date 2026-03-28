# Monitoring

## Purpose
System health monitoring — service status, API response times, error rates, and alert management.

## Route
`/monitoring`

## Components
- **MonitoringAgent** (`os-monitoring-agent`) — Service health dashboard, uptime charts, error log, alert configuration

## Services
- `MonitoringService` — Health checks, metrics, alerts

## Models
- `monitoring.model` — ServiceHealth, MetricDataPoint, MonitoringAlert
