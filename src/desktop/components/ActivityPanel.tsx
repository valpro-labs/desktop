import { Text } from "@valpro-labs/ui";

import type { AppEvent } from "../../shared/app-events";
import { formatTime, summarizePayload } from "../lib/format";

export function ActivityPanel({ events }: { events: AppEvent[] }) {
  return (
    <section className="activity-panel" aria-label="Live activity">
      <div className="panel-header">
        <div>
          <Text className="eyebrow">Events</Text>
          <Text variant="h4">Live Activity</Text>
        </div>
      </div>
      <ol className="activity-list">
        {events.length === 0 ? (
          <li className="activity-empty">
            <Text className="text-sm font-semibold">No activity yet</Text>
            <Text className="text-muted-foreground text-xs">Game events and recording updates will appear here.</Text>
          </li>
        ) : (
          events.slice(0, 30).map((event) => (
            <li key={event.id} className={`activity-item ${event.severity}`}>
              <span className="activity-marker" />
              <span className="activity-content">
                <span className="activity-title">{event.title}</span>
                <span className="activity-meta">
                  {formatTime(event.timestamp)} - {event.type}
                </span>
                {event.payload ? <span className="activity-payload">{summarizePayload(event.payload)}</span> : null}
              </span>
            </li>
          ))
        )}
      </ol>
    </section>
  );
}
