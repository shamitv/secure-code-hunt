import { Request, Response } from "express";
import { AnalyticsEventProducer } from "../mq/AnalyticsEventProducer";

export class MetricsController {
  constructor(private readonly producer: AnalyticsEventProducer) {}

  // Decoy: Validates required fields before publishing to Kafka.
  ingest = async (req: Request, res: Response) => {
    const { event_type, widget_id, payload } = req.body;
    if (!event_type || !widget_id) {
      return res.status(400).json({ error: "Missing required fields: event_type, widget_id" });
    }
    await this.producer.publish(event_type, { widget_id, payload: payload || {} });
    return res.json({ success: true });
  };
}
