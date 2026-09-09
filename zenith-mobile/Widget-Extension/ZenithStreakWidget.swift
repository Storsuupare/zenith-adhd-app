import WidgetKit
import SwiftUI

// MARK: - Zenith Brand Colors
private extension Color {
    static let zenithBackground = Color(red: 0.035, green: 0.047, blue: 0.074) // #090c13
    static let zenithFlame = Color(red: 0.961, green: 0.651, blue: 0.137)      // #f5a623
}

// The app group Zenith uses to share data between the main app and this widget.
// Must match the "groupIdentifier" set in app.json for react-native-widget-extension.
private let zenithAppGroup = "group.org.zenithapp.mobile"
private let streakDefaultsKey = "currentStreak"

struct StreakEntry: TimelineEntry {
    let date: Date
    let streak: Int
}

struct StreakTimelineProvider: TimelineProvider {
    func placeholder(in context: Context) -> StreakEntry {
        StreakEntry(date: Date(), streak: 7)
    }

    func getSnapshot(in context: Context, completion: @escaping (StreakEntry) -> Void) {
        completion(StreakEntry(date: Date(), streak: readStreak()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<StreakEntry>) -> Void) {
        let entry = StreakEntry(date: Date(), streak: readStreak())
        // No internal schedule to refresh on — the main app calls
        // WidgetCenter.shared.reloadTimelines(ofKind:) whenever the streak changes.
        let timeline = Timeline(entries: [entry], policy: .never)
        completion(timeline)
    }

    private func readStreak() -> Int {
        UserDefaults(suiteName: zenithAppGroup)?.integer(forKey: streakDefaultsKey) ?? 0
    }
}

struct ZenithStreakWidget: Widget {
    let kind: String = "ZenithStreakWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: StreakTimelineProvider()) { entry in
            StreakWidgetView(entry: entry)
        }
        .configurationDisplayName("Streak")
        .description("Your current Zenith streak, at a glance.")
        .supportedFamilies([.systemSmall, .accessoryCircular, .accessoryRectangular])
    }
}

// Switches layout per family — Home Screen keeps the full brand-colored view,
// Lock Screen families get their own minimal layout since iOS renders those in
// a single system-applied tint (from the wallpaper), ignoring custom colors
// almost everywhere except through widgetAccentable().
struct StreakWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: StreakEntry

    var body: some View {
        switch family {
        case .accessoryCircular:
            CircularStreakView(streak: entry.streak)
                .containerBackground(.clear, for: .widget)
        case .accessoryRectangular:
            RectangularStreakView(streak: entry.streak)
                .containerBackground(.clear, for: .widget)
        default:
            HomeScreenStreakView(streak: entry.streak)
                .containerBackground(Color.zenithBackground, for: .widget)
        }
    }
}

struct HomeScreenStreakView: View {
    let streak: Int

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Image(systemName: "flame.fill")
                .font(.title2)
                .foregroundStyle(Color.zenithFlame)

            Spacer(minLength: 0)

            Text("\(streak)")
                .font(.system(size: 34, weight: .heavy, design: .rounded))
                .foregroundStyle(.white)
                .monospacedDigit()
                .minimumScaleFactor(0.6)
                .lineLimit(1)
        }
        .padding(16)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(streak) day streak")
    }
}

// The small circular Lock Screen slot, next to the clock.
struct CircularStreakView: View {
    let streak: Int

    var body: some View {
        ZStack {
            AccessoryWidgetBackground()
            VStack(spacing: 0) {
                Image(systemName: "flame.fill")
                    .font(.caption2)
                Text("\(streak)")
                    .font(.system(size: 16, weight: .bold, design: .rounded))
                    .monospacedDigit()
                    .minimumScaleFactor(0.7)
                    .lineLimit(1)
            }
            .widgetAccentable()
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(streak) day streak")
    }
}

// The wider Lock Screen slot, below the clock.
struct RectangularStreakView: View {
    let streak: Int

    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: "flame.fill")
                .widgetAccentable()
            Text("\(streak) day streak")
                .font(.system(size: 14, weight: .semibold, design: .rounded))
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(streak) day streak")
    }
}

#Preview("Streak", as: .systemSmall) {
    ZenithStreakWidget()
} timeline: {
    StreakEntry(date: Date(), streak: 7)
    StreakEntry(date: Date(), streak: 42)
}

#Preview("Streak - Lock Screen Circular", as: .accessoryCircular) {
    ZenithStreakWidget()
} timeline: {
    StreakEntry(date: Date(), streak: 7)
    StreakEntry(date: Date(), streak: 42)
}

#Preview("Streak - Lock Screen Rectangular", as: .accessoryRectangular) {
    ZenithStreakWidget()
} timeline: {
    StreakEntry(date: Date(), streak: 7)
    StreakEntry(date: Date(), streak: 42)
}
