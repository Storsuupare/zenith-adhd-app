import WidgetKit
import SwiftUI

// A separate widget from ZenithStreakWidget — this one carries no data at all,
// it's just the Zenith mark sitting on the Lock Screen as a quiet reminder the
// app exists, the same pattern several other apps use for a plain icon widget.
// Uses the SF Symbol hexagon rather than importing the app's raster icon, since
// Zenith's own brand mark (⬡, used in AuthScreen and onboarding) already is a
// hexagon — this needs no image asset import at all, and Lock Screen widgets
// strip custom colors down to a single system tint anyway, so a vector shape
// is the correct fit here, not a full-color logo image.
struct IconEntry: TimelineEntry {
    let date: Date
}

struct IconTimelineProvider: TimelineProvider {
    func placeholder(in context: Context) -> IconEntry {
        IconEntry(date: Date())
    }

    func getSnapshot(in context: Context, completion: @escaping (IconEntry) -> Void) {
        completion(IconEntry(date: Date()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<IconEntry>) -> Void) {
        // Nothing dynamic to show, so one entry that never refreshes.
        let timeline = Timeline(entries: [IconEntry(date: Date())], policy: .never)
        completion(timeline)
    }
}

struct ZenithIconWidget: Widget {
    let kind: String = "ZenithIconWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: IconTimelineProvider()) { _ in
            ZStack {
                AccessoryWidgetBackground()
                Image(systemName: "hexagon.fill")
                    .font(.system(size: 22))
                    .widgetAccentable()
            }
            .accessibilityElement(children: .ignore)
            .accessibilityLabel("Zenith")
            .containerBackground(.clear, for: .widget)
        }
        .configurationDisplayName("Zenith")
        .description("A quick reminder Zenith is here — tap to jump back in.")
        .supportedFamilies([.accessoryCircular])
    }
}

#Preview("Zenith Icon", as: .accessoryCircular) {
    ZenithIconWidget()
} timeline: {
    IconEntry(date: Date())
}
