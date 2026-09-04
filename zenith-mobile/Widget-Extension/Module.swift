import ExpoModulesCore
import ActivityKit
import WidgetKit

// Must match the "groupIdentifier" set in app.json for react-native-widget-extension,
// and the same literal in ZenithStreakWidget.swift — this file compiles into the main
// app target, that one into the widget extension target, so the constant can't be
// shared directly across the two.
private let zenithAppGroup = "group.org.zenithapp.mobile"
private let streakDefaultsKey = "currentStreak"

public class ReactNativeWidgetExtensionModule: Module {
    public func definition() -> ModuleDefinition {
        Name("ReactNativeWidgetExtension")

        Function("updateStreak") { (streak: Int) -> Void in
            UserDefaults(suiteName: zenithAppGroup)?.set(streak, forKey: streakDefaultsKey)
            WidgetCenter.shared.reloadTimelines(ofKind: "ZenithStreakWidget")
        }

        Function("areActivitiesEnabled") { () -> Bool in
            if #available(iOS 16.2, *) {
                return ActivityAuthorizationInfo().areActivitiesEnabled
            } else {
                return false
            }
        }

        Function("startActivity") { (sessionName: String, skillName: String, durationSeconds: Int) -> Void in
            if #available(iOS 16.2, *) {
                let endTime = Calendar.current.date(byAdding: .second, value: durationSeconds, to: Date())!
                let attributes = ZenithSessionAttributes(sessionName: sessionName, skillName: skillName)
                let contentState = ZenithSessionAttributes.ContentState(endTime: endTime)
                let activityContent = ActivityContent(state: contentState, staleDate: endTime)

                do {
                    let activity = try Activity.request(attributes: attributes, content: activityContent)
                    print("Started Zenith session Live Activity: \(activity.id)")
                } catch {
                    print("Error starting Zenith Live Activity: \(error.localizedDescription)")
                }
            }
        }

        Function("updateActivity") { (durationSeconds: Int) -> Void in
            if #available(iOS 16.2, *) {
                let newEndTime = Calendar.current.date(byAdding: .second, value: durationSeconds, to: Date())!
                let contentState = ZenithSessionAttributes.ContentState(endTime: newEndTime)
                let updatedContent = ActivityContent(state: contentState, staleDate: newEndTime)

                Task {
                    for activity in Activity<ZenithSessionAttributes>.activities {
                        await activity.update(updatedContent)
                    }
                }
            }
        }

        Function("endActivity") { () -> Void in
            if #available(iOS 16.2, *) {
                Task {
                    for activity in Activity<ZenithSessionAttributes>.activities {
                        await activity.end(nil, dismissalPolicy: .immediate)
                    }
                }
            }
        }
    }
}
