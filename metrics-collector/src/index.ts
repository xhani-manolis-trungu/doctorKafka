import { Kafka, Partitioners } from "kafkajs";
import * as os from "os";

const BROKER_ID = process.env.BROKER_ID || "broker-1";
const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || "localhost:9092").split(
  ","
);
const TOPIC_METRICS = "_doctor_metrics";

const kafka = new Kafka({
  clientId: `metrics-collector-${BROKER_ID}`,
  brokers: KAFKA_BROKERS,
});

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

const getMockMetrics = (): BrokerMetrics => {
  // Simulate some load
  const cpuLoad = Math.random() * 100;
  const memLoad = Math.random() * 100;

  // Simulate network I/O
  const bytesIn = Math.floor(Math.random() * 10000);
  const bytesOut = Math.floor(Math.random() * 10000);

  return {
    brokerId: BROKER_ID,
    timestamp: Date.now(),
    cpuUsage: parseFloat(cpuLoad.toFixed(2)),
    memoryUsage: parseFloat(memLoad.toFixed(2)),
    bytesInPerSec: bytesIn,
    bytesOutPerSec: bytesOut,
  };
};

const run = async () => {
  try {
    await producer.connect();
    console.log(`Connected to Kafka brokers: ${KAFKA_BROKERS}`);

    setInterval(async () => {
      const metrics = getMockMetrics();
      console.log("Sending metrics:", metrics);

      try {
        await producer.send({
          topic: TOPIC_METRICS,
          messages: [{ key: BROKER_ID, value: JSON.stringify(metrics) }],
        });
      } catch (err) {
        console.error("Failed to send metrics", err);
      }
    }, 5000); // Send every 5 seconds
  } catch (err) {
    console.error("Error in metrics collector:", err);
  }
};

run();
