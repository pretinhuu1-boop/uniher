import { Composition } from 'remotion';
import { Presentation } from './Presentation';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="UniHER-Presentation"
        component={Presentation}
        durationInFrames={570}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
