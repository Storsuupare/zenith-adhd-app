import { Alert } from "react-native";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";

// Captures a View as a PNG and hands it to the OS share sheet — the user picks
// the destination (Instagram, iMessage, Discord, TikTok, wherever), so this
// never has to decide where a shared moment ends up.
export async function shareViewAsImage(viewRef, dialogTitle) {
  try {
    const uri = await captureRef(viewRef, { format: "png", quality: 1 });

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      Alert.alert("Sharing unavailable", "Your device doesn't support sharing images.");
      return;
    }

    await Sharing.shareAsync(uri, {
      mimeType: "image/png",
      dialogTitle,
      UTI: "public.png",
    });
  } catch (err) {
    console.error("[shareCard] share failed:", err?.message);
    Alert.alert("Share failed", "Could not create the image to share. Please try again.");
  }
}
