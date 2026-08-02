import ExpoModulesCore
import ActivityKit

public class ReactNativeWidgetExtensionModule: Module {
    public func definition() -> ModuleDefinition {
        Name("ReactNativeWidgetExtension")

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
