import { AnalyticsEventProducer } from "../mq/AnalyticsEventProducer";
import { WidgetRepository } from "../repositories/WidgetRepository";

interface CreateWidgetInput {
  title: string;
  type: string;
  value: string;
  config?: Record<string, unknown>;
}

export class WidgetService {
  constructor(
    private readonly widgets: WidgetRepository,
    private readonly events: AnalyticsEventProducer
  ) {}

  async listWidgets(userId: number) {
    return this.widgets.findByUserId(userId);
  }

  async createWidget(userId: number, input: CreateWidgetInput) {
    const widget = await this.widgets.save({ userId, ...input });
    this.events.publish("widget.created", { widgetId: widget.id, userId });
    return widget;
  }

  async updateWidgetConfig(id: number, userId: number, config: Record<string, unknown>) {
    const allowedKeys = ["position", "size", "refreshInterval", "colorScheme"];
    const filtered: Record<string, unknown> = {};
    for (const key of allowedKeys) {
      if (key in config) filtered[key] = config[key];
    }
    return this.widgets.update(id, userId, filtered);
  }
}
