# Automation Engine

This directory contains the microservices and components for the global-scale automation engine. It is designed to be a self-contained system, operating independently from the main SaaS application.

## Services

- **Ingestion Service:** Entry point for all incoming triggers (webhooks, API calls).
- **Workflow Service:** Core logic for orchestrating and managing workflows.
- **Execution Service:** Pool of workers that execute individual actions (e.g., send email, update CRM).
- **Scheduler Service:** Manages delayed and scheduled jobs.
- **Log Service:** Aggregates and stores execution logs.
