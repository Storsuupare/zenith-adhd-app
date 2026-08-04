import WidgetKit
import SwiftUI

// MARK: - Zenith Brand Colors
private extension Color {
    static let zenithBackground = Color(red: 0.035, green: 0.047, blue: 0.074) // #090c13
    static let zenithAccent = Color(red: 0.133, green: 0.831, blue: 0.933)     // #22d3ee
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
                    countdownText(endTime: context.state.endTime, font: .title3.bold())
                        .frame(width: 70, alignment: .center)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text(context.attributes.sessionName)
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(.white)
                        .lineLimit(1)
                }
            } compactLeading: {
                Image(systemName: "bolt.fill")
                    .foregroundStyle(Color.zenithAccent)
            } compactTrailing: {
                countdownText(endTime: context.state.endTime, font: .caption.bold())
                    .frame(width: 44, alignment: .center)
            } minimal: {
                Image(systemName: "bolt.fill")
                    .foregroundStyle(Color.zenithAccent)
            }
        }
    }

    @ViewBuilder
    private func lockScreenView(context: ActivityViewContext<ZenithSessionAttributes>) -> some View {
        HStack(spacing: 14) {
            countdownText(endTime: context.state.endTime, font: .title2.bold())
                .frame(width: 88, alignment: .center)

            VStack(alignment: .leading, spacing: 3) {
                Text(context.attributes.sessionName)
                    .font(.headline)
                    .foregroundStyle(.white)
                    .lineLimit(1)

                HStack(spacing: 4) {
                    Image(systemName: "bolt.fill")
                        .font(.caption2)
                        .foregroundStyle(Color.zenithAccent)
                    Text(context.attributes.skillName)
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.7))
                        .lineLimit(1)
                }
            }

            Spacer(minLength: 0)
        }
        .padding(16)
        .activityBackgroundTint(Color.zenithBackground)
        .activitySystemActionForegroundColor(.white)
    }

    private func countdownText(endTime: Date, font: Font) -> some View {
        Text(timerInterval: Date()...endTime, countsDown: true)
            .font(font)
            .monospacedDigit()
            .lineLimit(1)
            .minimumScaleFactor(0.5)
            .multilineTextAlignment(.center)
            .foregroundStyle(Color.zenithAccent)
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

#Preview("Lock Screen", as: .content, using: ZenithSessionAttributes(sessionName: "Morning Grind", skillName: "Strength")) {
    ZenithSessionLiveActivity()
} contentStates: {
    ZenithSessionAttributes.ContentState(endTime: Date().addingTimeInterval(900))
    ZenithSessionAttributes.ContentState(endTime: Date().addingTimeInterval(5400))
}
