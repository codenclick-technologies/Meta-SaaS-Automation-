# Meta SaaS Automation Engine: System Architecture

This document outlines the architecture for a global-scale, event-driven automation engine, optimized for Meta Lead Automation but designed for generic workflow automation.

## 1. Guiding Principles

- **Scalability:** The system is designed to handle millions of workflow executions concurrently through horizontal scaling of its components.
- **Reliability:** With features like idempotency, retry logic, and comprehensive logging, the system guarantees that workflows are executed reliably.
- **Extensibility:** The architecture is modular, allowing new triggers and actions to be added with minimal effort.
- **Security:** Multi-tenancy is at the core of the design, ensuring that data from different organizations is strictly isolated.

## 2. System Architecture Diagram

The architecture is based on a microservices pattern, where different components of the system are decoupled and communicate asynchronously via a central message queue.

```
+----------------+      +-----------------+      +--------------------+
|   API Gateway  |----->|  Trigger Service  |----->|  Event Queue (Kafka) |
+----------------+      +-----------------+      +--------------------+
       ^                     |
       | (Webhooks)          | (API Polling)
       |                     v
+----------------+      +-----------------+
| External Systems|      | Polling Service |
| (Meta, Google) |      +-----------------+
+----------------+

       +--------------------+      +-----------------------+      +------------------+
       |  Event Queue (Kafka) |----->|  Workflow Dispatcher  |----->|  Job Queue (Redis) |
       +--------------------+      +-----------------------+      +------------------+
                                         |
                                         | (DB Queries)
                                         v
                                 +------------------+
                                 |   Database (MongoDB) |
                                 +------------------+

+------------------+      +----------------------+      +-------------------+
| Job Queue (Redis) |----->|  Execution Workers (xN) |----->| 3rd Party APIs  |
+------------------+      +----------------------+      +-------------------+
        ^                               |
        | (Delayed Jobs)                | (Logging)
        |                               v
+-------------------+             +-------------------+
|   Job Scheduler   |             |  Logging Service  |
+-------------------+             +-------------------+

```

### Core Components:

1.  **API Gateway:** The single entry point for all incoming API requests, including webhooks and user-facing API calls. It handles request validation, authentication, and routing to the appropriate service.

2.  **Trigger Service:** Responsible for handling incoming events from various sources (webhooks, API calls). It validates the event payload, identifies the corresponding workflow(s), and pushes a standardized event object into the `Event Queue`.

3.  **Polling Service:** A dedicated service for triggers that require polling (e.g., checking a Google Sheet for new rows). It periodically queries external services and, upon finding new data, sends an event to the `Trigger Service`.

4.  **Event Queue (Apache Kafka):** A high-throughput, distributed streaming platform that acts as the central nervous system of the engine. It decouples the trigger ingestion from workflow processing, providing durability and back-pressure.

5.  **Workflow Dispatcher:** This service consumes events from the `Event Queue`. For each event, it:
    -   Fetches the corresponding workflow definition from the `Database`.
    -   Evaluates the workflow's conditional logic (filters, branches).
    -   If conditions are met, it breaks the workflow into a series of jobs (actions) and pushes them to the `Job Queue`.

6.  **Database (MongoDB):** A NoSQL database used to store:
    -   `Workflows`: User-defined automation rules, including triggers, conditions, and actions.
    -   `ExecutionLogs`: A detailed record of every workflow execution, including status, timing, and errors.
    -   `Organizations` & `Users`: For multi-tenancy and access control.
    -   `Credentials`: Encrypted API keys and tokens for third-party integrations.

7.  **Job Queue (Redis):** A high-performance in-memory data store used for queuing individual action jobs. Redis is chosen for its speed and support for delayed jobs, which is crucial for features like "delay" steps in a workflow.

8.  **Job Scheduler:** Manages delayed or scheduled jobs. It monitors the `Job Queue` and enqueues jobs when their scheduled execution time arrives.

9.  **Execution Workers:** A pool of stateless services that consume jobs from the `Job Queue`. Each worker is responsible for executing a single action (e.g., calling a CRM API, sending an email). They are horizontally scalable.

10. **Logging Service:** Centralizes logs from all services, providing a unified view for monitoring and debugging. It captures both system-level logs and detailed workflow execution logs.

## 3. Workflow Execution Lifecycle

1.  **Trigger Ingestion:** An event occurs (e.g., a new lead from a Meta webhook). The `API Gateway` receives the request and forwards it to the `Trigger Service`.
2.  **Event Standardization:** The `Trigger Service` validates the payload, authenticates the source, and creates a standardized JSON event. This event is published to a specific topic in the `Event Queue`.
3.  **Dispatching:** The `Workflow Dispatcher` consumes the event. It queries the `Database` to find all workflows subscribed to that event type for the specific organization.
4.  **Condition Evaluation:** For each workflow found, the dispatcher evaluates its filter and branching logic against the event payload.
5.  **Job Creation:** If the conditions pass, the dispatcher creates one or more "jobs" for each action in the workflow. Each job contains the action type, payload, and credentials needed for execution. These jobs are pushed to the `Job Queue`.
6.  **Execution:** An available `Execution Worker` picks up a job from the queue. It decrypts any necessary credentials and executes the action (e.g., makes a POST request to a CRM).
7.  **Logging & Callback:** The worker logs the result of the execution (success or failure) to the `Logging Service`. If the action has a callback (e.g., the next step in a sequence), it may push a new job to the queue.
8.  **Retry/Failure:** If an action fails, the worker updates the execution log with the error details. A separate retry mechanism can re-queue the job based on a predefined strategy (e.g., exponential backoff). If all retries fail, the workflow execution is marked as "Failed".

## 4. Database Schema (High-Level)

**`organizations`**
```json
{
  "_id": "org_...",
  "name": "Zoho Corp",
  "subscription_plan": "pro"
}
```

**`users`**
```json
{
  "_id": "user_...",
  "email": "test@example.com",
  "password_hash": "...",
  "org_id": "org_...",
  "role": "admin"
}
```

**`workflows`**
```json
{
  "_id": "wf_...",
  "name": "New Facebook Lead to CRM and WhatsApp",
  "org_id": "org_...",
  "is_active": true,
  "trigger": {
    "type": "META_LEAD_AD",
    "config": { "form_id": "12345" }
  },
  "steps": [
    {
      "id": "step_1",
      "type": "FILTER",
      "condition": { "field": "email", "operator": "NOT_NULL" }
    },
    {
      "id": "step_2",
      "type": "ACTION",
      "action_type": "CRM_INSERT",
      "depends_on": "step_1",
      "config": {
        "crm_integration_id": "integ_...",
        "field_mapping": { ... }
      },
      "retry_policy": {
        "strategy": "exponential",
        "attempts": 3
      }
    },
    {
      "id": "step_3",
      "type": "ACTION",
      "action_type": "SEND_WHATSAPP",
      "depends_on": "step_2",
      "config": { ... }
    }
  ]
}
```

**`execution_logs`**
```json
{
  "_id": "log_...",
  "workflow_id": "wf_...",
  "org_id": "org_...",
  "trigger_event_id": "evt_...",
  "status": "completed", // pending, in_progress, completed, failed
  "started_at": "...",
  "finished_at": "...",
  "steps": [
    {
      "step_id": "step_2",
      "status": "completed",
      "output": { "crm_record_id": "rec_..." },
      "attempts": 1
    }
  ]
}
```

## 5. Global Scalability

-   **Stateless Services:** All core processing services (`Trigger Service`, `Dispatcher`, `Workers`) are stateless, allowing them to be scaled horizontally behind a load balancer.
-   **Distributed Message Queue:** Kafka is inherently distributed and scalable. We can add more brokers to handle increased event volume and create partitions for parallel consumption.
-   **Database Scaling:** MongoDB supports sharding, which allows us to distribute the database across multiple machines. We can shard collections by `org_id` to distribute the load and ensure data locality.
-   **Geographic Distribution:** For a global audience, services can be deployed across multiple geographic regions (e.g., US, EU, APAC). Geo-DNS routing can direct users and webhooks to the nearest regional endpoint, reducing latency. The central database can use multi-region replication.

## 6. Failure Detection and Recovery

-   **Health Checks:** Each microservice exposes a `/health` endpoint that the load balancer uses to detect and replace unhealthy instances.
-   **Idempotency:** The `Trigger Service` generates a unique ID for each incoming event. This ID is passed through the entire system. If a duplicate event is received (e.g., due to a webhook retry), the system can detect and ignore it.
-   **Atomic Actions:** Execution workers are designed to perform atomic actions. If a worker fails mid-execution, the job is not acknowledged in the `Job Queue` and will be picked up by another worker.
-   **Retry Logic:** For transient failures (e.g., a temporary network issue with a third-party API), actions can be automatically retried. The `retry_policy` in the workflow definition allows for configurable strategies like exponential backoff.
-   **Dead Letter Queue (DLQ):** If a job consistently fails after all retry attempts, it is moved to a Dead Letter Queue. This prevents a failing job from blocking the queue and allows developers to inspect and manually re-process the failed job later.
-   **Alerting:** The `Logging Service` is integrated with an alerting system (e.g., Prometheus, Grafana, PagerDuty). Alerts are configured for critical errors, high failure rates, or queue backlogs, notifying the engineering team of potential issues in real-time.
