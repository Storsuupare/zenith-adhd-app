import WidgetKit
import SwiftUI

// MARK: - Background modifier (handles iOS 16 vs 17+ difference)
// containerBackground was introduced in iOS 17 for widgets specifically.
// Using iOSApplicationExtension (not iOS) is required inside extension targets —
// the compiler treats them differently from the main app target.
struct WidgetBackgroundModifier: ViewModifier {
    func body(content: Content) -> some View {
        if #available(iOSApplicationExtension 17.0, *) {
            content
                .containerBackground(
                    Color(red: 0.035, green: 0.047, blue: 0.074),
                    for: .widget
                )
        } else {
            content
        }
    }
}

// MARK: - Data model

struct StreakEntry: TimelineEntry {
    let date: Date
    let streak: Int
    let completedToday: Bool
}

// MARK: - Timeline provider

struct StreakProvider: TimelineProvider {
    func placeholder(in context: Context) -> StreakEntry {
        StreakEntry(date: Date(), streak: 7, completedToday: true)
    }

    func getSnapshot(in context: Context, completion: @escaping (StreakEntry) -> Void) {
        completion(loadEntry())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<StreakEntry>) -> Void) {
        let entry = loadEntry()
        // Refresh at midnight so at-risk state flips automatically
        let midnight = Calendar.current.startOfDay(for: Date().addingTimeInterval(86400))
        let timeline = Timeline(entries: [entry], policy: .after(midnight))
        completion(timeline)
    }

    private func loadEntry() -> StreakEntry {
        let defaults = UserDefaults(suiteName: "group.org.zenithapp.mobile")
        let streak = defaults?.integer(forKey: "currentStreak") ?? 0
        let lastCompleted = defaults?.object(forKey: "lastCompletedDate") as? Date
        let completedToday = lastCompleted.map {
            Calendar.current.isDateInToday($0)
        } ?? false
        return StreakEntry(date: Date(), streak: streak, completedToday: completedToday)
    }
}

// MARK: - Views

struct StreakWidgetView: View {
    let entry: StreakEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .systemSmall:
            smallView
        case .systemMedium:
            mediumView
        default:
            smallView
        }
    }

    var smallView: some View {
        ZStack {
            Color(red: 0.035, green: 0.047, blue: 0.074)
            VStack(spacing: 4) {
                Text(entry.completedToday ? "🔥" : "🕯️")
                    .font(.system(size: 36))

                Text("\(entry.streak)")
                    .font(.system(size: 38, weight: .bold, design: .rounded))
                    .foregroundStyle(
                        entry.completedToday
                            ? Color(red: 0.133, green: 0.831, blue: 0.933)
                            : Color.white.opacity(0.4)
                    )
                    .monospacedDigit()

                Text("day streak")
                    .font(.caption2)
                    .fontWeight(.medium)
                    .foregroundStyle(.white.opacity(0.5))
                    .textCase(.uppercase)
                    .tracking(1)
            }
        }
    }

    var mediumView: some View {
        ZStack {
            Color(red: 0.035, green: 0.047, blue: 0.074)
            HStack(spacing: 20) {
                VStack(spacing: 4) {
                    Text(entry.completedToday ? "🔥" : "🕯️")
                        .font(.system(size: 40))

                    Text("\(entry.streak)")
                        .font(.system(size: 42, weight: .bold, design: .rounded))
                        .foregroundStyle(
                            entry.completedToday
                                ? Color(red: 0.133, green: 0.831, blue: 0.933)
                                : Color.white.opacity(0.4)
                        )
                        .monospacedDigit()

                    Text("day streak")
                        .font(.caption2)
                        .fontWeight(.medium)
                        .foregroundStyle(.white.opacity(0.5))
                        .textCase(.uppercase)
                        .tracking(1)
                }

                Rectangle()
                    .fill(.white.opacity(0.08))
                    .frame(width: 1)
                    .padding(.vertical, 12)

                VStack(alignment: .leading, spacing: 6) {
                    Text(entry.completedToday ? "Today: done ✓" : "Today: pending")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(
                            entry.completedToday
                                ? Color(red: 0.133, green: 0.831, blue: 0.933)
                                : .white.opacity(0.5)
                        )

                    Text(
                        entry.completedToday
                            ? "Keep the streak alive tomorrow."
                            : "Complete a session to keep your streak."
                    )
                    .font(.caption)
                    .foregroundStyle(.white.opacity(0.4))
                    .fixedSize(horizontal: false, vertical: true)
                }

                Spacer(minLength: 0)
            }
            .padding(16)
        }
    }
}

// MARK: - Widget

struct StreakWidget: Widget {
    let kind = "StreakWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: StreakProvider()) { entry in
            StreakWidgetView(entry: entry)
                .modifier(WidgetBackgroundModifier())
        }
        .configurationDisplayName("Zenith Streak")
        .description("Your current daily session streak.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
