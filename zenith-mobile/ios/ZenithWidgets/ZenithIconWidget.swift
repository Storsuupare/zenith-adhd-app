import WidgetKit
import SwiftUI

// A separate widget from ZenithStreakWidget — this one carries no data at all,
// it's just the Zenith mark sitting on the Lock Screen as a quiet reminder the
// app exists, the same pattern several other apps use for a plain icon widget.
// Drawn as vector bars rather than the app's raster logo file: that PNG has an
// opaque navy background baked in (no alpha channel), and Lock Screen widgets
// render in a single system-applied tint via widgetAccentable() — an opaque
// full-color image would just show as a solid tinted square, not the bars
// shape. A few RoundedRectangles reproduce the same ascending-bars mark used
// for the app icon and website, and tint correctly since they're real shapes.
struct AscendingBarsMark: View {
    var body: some View {
        HStack(alignment: .bottom, spacing: 2) {
            bar(height: 7)
            bar(height: 11)
            bar(height: 15)
            bar(height: 19)
        }
        .frame(height: 19)
    }

    private func bar(height: CGFloat) -> some View {
        RoundedRectangle(cornerRadius: 1.5)
            .frame(width: 4, height: height)
    }
}

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
                AscendingBarsMark()
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
