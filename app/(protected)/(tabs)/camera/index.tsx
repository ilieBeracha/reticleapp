import { CameraDetect } from "@/modules/camera/CameraDetect";
import { View } from "react-native";

export default function CameraDetectPage() {
  return (
    <View style={{ flex: 1, width: "100%", height: "100%", backgroundColor: "black" }}>
      <CameraDetect />
    </View>
  );
}
