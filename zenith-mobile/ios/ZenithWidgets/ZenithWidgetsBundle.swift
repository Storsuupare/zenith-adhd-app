import WidgetKit
import SwiftUI

@main
struct ZenithWidgetsBundle: WidgetBundle {
    var body: some Widget {
        ZenithSessionLiveActivity()
        ZenithStreakWidget()
    }
}
