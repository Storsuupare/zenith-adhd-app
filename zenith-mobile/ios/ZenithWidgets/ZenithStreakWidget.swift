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
                .containerBackground(Color.zenithBackground, for: .widget)
        }
        .configurationDisplayName("Streak")
        .description("Your current Zenith streak, at a glance.")
        .supportedFamilies([.systemSmall])
    }
}

struct StreakWidgetView: View {
    let entry: StreakEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Image(systemName: "flame.fill")
                .font(.title2)
                .foregroundStyle(Color.zenithFlame)

            Spacer(minLength: 0)

            Text("\(entry.streak)")
                .font(.system(size: 34, weight: .heavy, design: .rounded))
                .foregroundStyle(.white)
                .monospacedDigit()
                .minimumScaleFactor(0.6)
                .lineLimit(1)

            Text("DAY STREAK")
                .font(.caption2.weight(.semibold))
                .foregroundStyle(.white.opacity(0.6))
                .tracking(0.5)
        }
        .padding(16)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }
}

#Preview("Streak", as: .systemSmall) {
    ZenithStreakWidget()
} timeline: {
    StreakEntry(date: Date(), streak: 7)
    StreakEntry(date: Date(), streak: 42)
}
