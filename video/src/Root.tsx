import { Composition } from "remotion";
import { ProductVideo } from "./ProductVideo";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ProductVideo"
        component={ProductVideo}
        durationInFrames={900} // 30 seconds @ 30fps
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
