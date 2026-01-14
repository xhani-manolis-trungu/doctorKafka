import { Kafka, Partitioners, Consumer, Producer } from "kafkajs";
import express from "express";
import cors from "cors";

const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || "localhost:9092").split(
  ","
);
const TOPIC_METRICS = "_doctor_metrics";
const TOPIC_ACTIONS = "_doctor_actions_log";
const APP_PORT = process.env.PORT || 3001;

const kafka = new Kafka({
  clientId: "doctor-service",
  brokers: KAFKA_BROKERS,
});

const consumer = kafka.consumer({ groupId: "doctor-group" });
const producer = kafka.producer({
  createPartitioner: Partitioners.LegacyPartitioner,
});

interface BrokerMetrics {
  brokerId: string;
  timestamp: number;
  cpuUsage: number;
  memoryUsage: number;
  bytesInPerSec: number;
  bytesOutPerSec: number;
}

interface BrokerStatus {
  lastSeen: number;
  metrics: BrokerMetrics | null;
  status: "HEALTHY" | "UNHEALTHY" | "OVERLOADED";
}

const clusterState: Record<string, BrokerStatus> = {};

// Heuristics
const CPU_THRESHOLD = 80;
const HEARTBEAT_TIMEOUT = 10000; // 10 seconds

const analyzeAndHeal = async () => {
  const now = Date.now();
  for (const brokerId in clusterState) {
    const broker = clusterState[brokerId];

    // Check for missing heartbeat
    if (now - broker.lastSeen > HEARTBEAT_TIMEOUT) {
      if (broker.status !== "UNHEALTHY") {
        console.log(`Broker ${brokerId} is UNHEALTHY (heartbeat missing)`);
        broker.status = "UNHEALTHY";
        await logAction(
          brokerId,
          "MARK_UNHEALTHY",
          "Broker heartbeat timed out"
        );
        // Trigger healing logic here (e.g., reassign partitions - mock)
        await logAction(
          brokerId,
          "REASSIGN_PARTITIONS",
          "Moving leadership to healthy brokers (MOCK)"
        );
      }
    } else if (broker.metrics && broker.metrics.cpuUsage > CPU_THRESHOLD) {
      if (broker.status !== "OVERLOADED") {
        console.log(
          `Broker ${brokerId} is OVERLOADED (CPU ${broker.metrics.cpuUsage}%)`
        );
        broker.status = "OVERLOADED";
        await logAction(
          brokerId,
          "ALERT_OVERLOAD",
          `CPU usage ${broker.metrics.cpuUsage}% > ${CPU_THRESHOLD}%`
        );
      }
    } else {
      if (broker.status !== "HEALTHY") {
        console.log(`Broker ${brokerId} recovered and is HEALTHY`);
        broker.status = "HEALTHY";
        await logAction(
          brokerId,
          "MARK_HEALTHY",
          "Broker metrics returned to normal"
        );
      }
    }
  }
};

const logAction = async (
  brokerId: string,
  actionType: string,
  description: string
) => {
  try {
    const action = {
      id: Date.now().toString(), // precise enough for mock
      timestamp: Date.now(),
      brokerId,
      actionType,
      description,
    };
    await producer.send({
      topic: TOPIC_ACTIONS,
      messages: [{ value: JSON.stringify(action) }],
    });
    console.log("Action logged:", action);
  } catch (err) {
    console.error("Failed to log action:", err);
  }
};

const run = async () => {
  try {
    await producer.connect();
    await consumer.connect();
    await consumer.subscribe({ topic: TOPIC_METRICS, fromBeginning: false });

    console.log("Doctor Service started. Listening for metrics...");

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        if (!message.value) return;
        try {
          const metrics: BrokerMetrics = JSON.parse(message.value.toString());
          clusterState[metrics.brokerId] = {
            lastSeen: Date.now(),
            metrics: metrics,
            status:
              clusterState[metrics.brokerId]?.status === "UNHEALTHY"
                ? "HEALTHY"
                : clusterState[metrics.brokerId]?.status || "HEALTHY",
          };
          // Re-evaluate immediately or wait for periodic check?
          // Let's rely on periodic for stability, but we can do a quick check here if needed.
        } catch (err) {
          console.error("Error parsing metrics:", err);
        }
      },
    });

    // Periodic Health Check
    setInterval(analyzeAndHeal, 5000);

    // API Server
    const app = express();
    app.use(cors());
    app.get("/api/status", (req, res) => {
      res.json(clusterState);
    });

    // We can't easily fetch the actions log from Kafka without consumer,
    // effectively we might want to store actions in memory for this POC or just rely on the UI to consume the topic directly (if it can).
    // Since UI is Next.js server-side, it can consume Kafka too? Or we can just keep a short history here.
    // Let's keep short history here for simplicity of the UI.
    app.get("/api/actions", (req, res) => {
      // This is a placeholder. In a real system, we'd query a store.
      // For this POC, let's just cheat and not return historical actions for now
      // OR implementing a simple in-memory list populated by our own producer logic (which is funny but works)
      res.json([]);
    });

    app.listen(APP_PORT, () => {
      console.log(`Doctor Service API listening on port ${APP_PORT}`);
    });
  } catch (err) {
    console.error("Error in Doctor Service:", err);
  }
};

run();
