import WidgetKit
import SwiftUI

// MARK: - Zenith Brand Colors
private extension Color {
    static let zenithBackground = Color(red: 0.035, green: 0.047, blue: 0.074) // #090c13
    static let zenithAccent = Color(red: 0.133, green: 0.831, blue: 0.933)     // #22d3ee
    // Matches COLORS.green in the app's own colors.js — same "done" color everywhere.
    static let zenithComplete = Color(red: 0.204, green: 0.784, blue: 0.510)   // #34d399
}

struct ZenithSessionLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: ZenithSessionAttributes.self) { context in
            lockScreenView(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    skillBadge(skillName: context.attributes.skillName)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    expandedTrailing(context: context)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    expandedBottom(context: context)
                }
            } compactLeading: {
                statusIcon(endTime: context.state.endTime)
            } compactTrailing: {
                compactTrailingContent(context: context)
            } minimal: {
                statusIcon(endTime: context.state.endTime)
            }
        }
    }

    // MARK: - Lock Screen

    // Deadline passing is detected entirely here, client-side, once a second —
    // not by waiting for the app to call endActivity(). That call only ever
    // fires when someone actually opens the app and collects the session, so
    // relying on it left the widget frozen on a stale countdown (and iOS's own
    // degraded "stale content" treatment) for however long the app stayed
    // closed after time ran out.
    @ViewBuilder
    private func lockScreenView(context: ActivityViewContext<ZenithSessionAttributes>) -> some View {
        TimelineView(.periodic(from: .now, by: 1)) { timeline in
            if timeline.date >= context.state.endTime {
                completedLockScreenView(context: context)
            } else {
                inProgressLockScreenView(context: context)
            }
        }
    }

    @ViewBuilder
    private func inProgressLockScreenView(context: ActivityViewContext<ZenithSessionAttributes>) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 4) {
                Image(systemName: "bolt.fill")
                    .font(.caption2)
                    .foregroundStyle(Color.zenithAccent)
                Text(context.attributes.skillName)
                    .font(.caption)
                    .foregroundStyle(.white.opacity(0.7))
                    .lineLimit(1)
            }

            Text(context.attributes.sessionName)
                .font(.headline)
                .foregroundStyle(.white)
                .lineLimit(1)

            // ProgressView(timerInterval:) ships its own self-updating countdown
            // text bundled with the bar (its CurrentValueLabel is fixed to Text
            // in the API itself — there's no way to opt out of it). A separate
            // Text(timerInterval:) alongside it just showed the same time twice.
            ProgressView(timerInterval: context.attributes.startTime...context.state.endTime, countsDown: true)
                .tint(Color.zenithAccent)
        }
        .padding(16)
        .activityBackgroundTint(Color.zenithBackground)
        .activitySystemActionForegroundColor(.white)
    }

    @ViewBuilder
    private func completedLockScreenView(context: ActivityViewContext<ZenithSessionAttributes>) -> some View {
        HStack(spacing: 14) {
            ZStack {
                Circle()
                    .fill(Color.zenithComplete.opacity(0.18))
                    .frame(width: 44, height: 44)
                Image(systemName: "checkmark")
                    .font(.title3.bold())
                    .foregroundStyle(Color.zenithComplete)
            }

            VStack(alignment: .leading, spacing: 3) {
                Text(context.attributes.sessionName)
                    .font(.headline)
                    .foregroundStyle(.white)
                    .lineLimit(1)
                Text("Session Completed!")
                    .font(.caption)
                    .foregroundStyle(Color.zenithComplete)
                    .lineLimit(1)
            }

            Spacer(minLength: 0)
        }
        .padding(16)
        .activityBackgroundTint(Color.zenithBackground)
        .activitySystemActionForegroundColor(.white)
    }

    // MARK: - Dynamic Island

    @ViewBuilder
    private func expandedTrailing(context: ActivityViewContext<ZenithSessionAttributes>) -> some View {
        TimelineView(.periodic(from: .now, by: 1)) { timeline in
            if timeline.date >= context.state.endTime {
                Image(systemName: "checkmark.circle.fill")
                    .font(.title3)
                    .foregroundStyle(Color.zenithComplete)
                    .frame(width: 70, alignment: .center)
            } else {
                countdownText(endTime: context.state.endTime, font: .title3.bold())
                    .frame(width: 70, alignment: .center)
            }
        }
    }

    @ViewBuilder
    private func expandedBottom(context: ActivityViewContext<ZenithSessionAttributes>) -> some View {
        TimelineView(.periodic(from: .now, by: 1)) { timeline in
            if timeline.date >= context.state.endTime {
                Text("Session Completed!")
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(Color.zenithComplete)
                    .lineLimit(1)
            } else {
                Text(context.attributes.sessionName)
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(.white)
                    .lineLimit(1)
            }
        }
    }

    @ViewBuilder
    private func compactTrailingContent(context: ActivityViewContext<ZenithSessionAttributes>) -> some View {
        TimelineView(.periodic(from: .now, by: 1)) { timeline in
            if timeline.date < context.state.endTime {
                countdownText(endTime: context.state.endTime, font: .caption.bold())
                    .frame(width: 44, alignment: .center)
            }
        }
    }

    // MARK: - Shared pieces

    private func countdownText(endTime: Date, font: Font) -> some View {
        Text(timerInterval: Date()...endTime, countsDown: true)
            .font(font)
            .monospacedDigit()
            .lineLimit(1)
            .minimumScaleFactor(0.5)
            .multilineTextAlignment(.center)
            .foregroundStyle(Color.zenithAccent)
    }

    // Compact-leading and minimal Dynamic Island slots — bolt while running,
    // checkmark once the deadline passes, same self-checking pattern as the
    // lock screen and expanded regions.
    private func statusIcon(endTime: Date) -> some View {
        TimelineView(.periodic(from: .now, by: 1)) { timeline in
            if timeline.date >= endTime {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundStyle(Color.zenithComplete)
            } else {
                Image(systemName: "bolt.fill")
                    .foregroundStyle(Color.zenithAccent)
            }
        }
    }

    private func skillBadge(skillName: String) -> some View {
        HStack(spacing: 4) {
            Image(systemName: "bolt.fill")
                .font(.caption)
                .foregroundStyle(Color.zenithAccent)
            Text(skillName)
                .font(.caption.weight(.medium))
                .foregroundStyle(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
        }
    }
}
