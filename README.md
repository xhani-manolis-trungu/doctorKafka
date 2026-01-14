# DoctorKafka

Proof of Concept for Kafka Cluster Auto-healing.

## Components

- **3 Kafka Brokers**: A local cluster managed by Docker Compose.
- **Metrics Collector**: Runs on brokers (simulated as separate processes), sends stats to Kafka.
- **Doctor Service**: Central brain, analyzes stats, heals clusters.
- **Web UI**: Dashboard for operators.

## Prerequisites

- Docker & Docker Compose
- Node.js (v18+)

## System Overview

DoctorKafka acts as a "cluster physician". It continuously monitors the health of your Kafka brokers and intervenes when necessary.

### Why use DoctorKafka?

Managing Kafka at scale is complex. DoctorKafka takes the burden off operations teams by:

- **Increasing Availability**: It reacts to failures instantly, much faster than a human operator could.
- **Reducing Toil**: Automates tedious tasks like reassigning partitions when a broker is overloaded.
- **Preventing Outages**: Proactively detects symptoms (like high CPU or disk usage) and balances the cluster before it crashes.
- **Cost Efficiency**: Allows you to run clusters closer to capacity with confidence, knowing the "doctor" will handle spikes.

### Scaling for Production

This Proof of Concept (PoC) uses a simplified architecture. For a production-grade deployment:

1.  **Metrics Collector**: Deploy as a **sidecar container** or a **Java Agent** directly on the broker pods (e.g., in Kubernetes) to gather low-level metrics with minimal latency.
2.  **Doctor Service**:
    - **High Availability**: Run multiple instances with **Leader Election** (via Zookeeper or Kubernetes) to ensure only one "doctor" is making decisions at a time.
    - **Persistence**: Store cluster state in a persistent database (e.g., PostgreSQL) instead of in-memory.
3.  **Security**: Enable **mTLS** or **SASL** for all internal communication.
4.  **Integration**: Integrate with **Cruise Control** for the heavy lifting of partition reassignment, using DoctorKafka as the high-level decision maker.

### What it Offers

- **Centralized Health Management**: A single view of your entire cluster's health.
- **Automated "Healing"**: Automatically detects issues like CPU overload or broker outages.
- **Audit Trail**: Logs every decision and action taken by the system.

### How it Works

1. **Metrics Collection**: Each broker (simulated by `metrics-collector`) sends CPU, Memory, and Network stats to a Kafka topic `_doctor_metrics`.
2. **Analysis**: The `doctor-service` consumes these metrics.
3. **Decision Making**:
   - If CPU > 80%, the broker is marked **OVERLOADED**.
   - If a heartbeat is missing > 10s, the broker is marked **UNHEALTHY**.
4. **Action**: The system logs a remedial action (e.g., "REASSIGN_PARTITIONS") to the `_doctor_actions_log` topic.

### How to Test "Healing"

The `metrics-collector` is designed to be chaotic. It randomly spikes CPU usage to simulate real-world load.

1. **Start all services** (see below).
2. **Watch the Dashboard** (http://localhost:3000): You will see brokers flip between "HEALTHY", "OVERLOADED", and "UNHEALTHY".
3. **Check the Action Log**: On the dashboard or in `doctor-service` terminal logs, look for entries like:
   > "ALERT_OVERLOAD: CPU usage 95% > 80%"
   > "REASSIGN_PARTITIONS: Moving leadership to healthy brokers"

## 1. Start Infrastructure

Start the Kafka cluster (3 brokers + Zookeeper + Kafka UI).

```powershell
docker-compose up -d
```

Verify the cluster is running:

- **Kafka UI**: http://localhost:8080

## 2. Install Dependencies

Install dependencies for all services:

```powershell
cd metrics-collector; npm install; cd ..
cd doctor-service; npm install; cd ..
cd web-ui; npm install; cd ..
```

## 3. Run Services

You need to run multiple terminals to simulate the distributed system.

### Terminal 1: Doctor Service

The central service that listens to metrics and triggers actions.

```powershell
cd doctor-service
$env:KAFKA_BROKERS='localhost:9092,localhost:9093,localhost:9094'
$env:PORT='3001'
npm start
```

### Terminal 2: Metrics Collector (Broker 1)

Simulates metrics for Broker 1.

```powershell
cd metrics-collector
$env:BROKER_ID='1'
$env:KAFKA_BROKERS='localhost:9092,localhost:9093,localhost:9094'
npm start
```

### Terminal 3: Metrics Collector (Broker 2)

Simulates metrics for Broker 2.

```powershell
cd metrics-collector
$env:BROKER_ID='2'
$env:KAFKA_BROKERS='localhost:9092,localhost:9093,localhost:9094'
npm start
```

### Terminal 4: Metrics Collector (Broker 3)

Simulates metrics for Broker 3.

```powershell
cd metrics-collector
$env:BROKER_ID='3'
$env:KAFKA_BROKERS='localhost:9092,localhost:9093,localhost:9094'
npm start
```

### Terminal 5: Web UI

The frontend dashboard.

```powershell
cd web-ui
npm run dev
```

## 4. Access the Dashboard

Open the DoctorKafka Dashboard:

- **URL**: http://localhost:3000

You should see the status of the 3 brokers and a log of actions (e.g., "Broker OVERLOADED", "Partitions Reassigned") as the system "heals" itself based on the simulated metrics.
