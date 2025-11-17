import { useEffect, useRef } from 'react';
import { Stage, Layer, Text, Rect } from 'react-konva';
import useEditorStore from '../store/useEditorStore';

function CanvasOverlay({ currentTime }) {
  const { project } = useEditorStore();
  const stageRef = useRef(null);

  // Get active captions/overlays for current time
  const activeOverlays = project?.transcriptionSegments
    ?.filter(seg => currentTime >= seg.start && currentTime <= seg.end)
    .map(seg => ({
      type: 'caption',
      text: seg.text,
      start: seg.start,
      end: seg.end
    })) || [];

  // Update canvas size
  useEffect(() => {
    if (stageRef.current) {
      const container = stageRef.current.container();
      if (container) {
        const parent = container.parentElement;
        if (parent) {
          stageRef.current.width(parent.offsetWidth);
          stageRef.current.height(parent.offsetHeight);
        }
      }
    }
  }, []);

  if (!project) return null;

  return (
    <div className="absolute inset-0 pointer-events-none">
      <Stage
        ref={stageRef}
        width={window.innerWidth}
        height={window.innerHeight}
        className="pointer-events-none"
      >
        <Layer>
          {activeOverlays.map((overlay, idx) => (
            <Text
              key={idx}
              text={overlay.text}
              fontSize={24}
              fill="white"
              fontStyle="bold"
              x={50}
              y={window.innerHeight - 150}
              shadowColor="black"
              shadowBlur={10}
              shadowOpacity={0.8}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
}

export default CanvasOverlay;

