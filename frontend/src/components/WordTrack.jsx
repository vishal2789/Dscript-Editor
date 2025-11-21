import { useMemo } from 'react';
import useEditorStore from '../store/useEditorStore';
import { timeToPixels, formatTime } from '../utils/time';

function WordTrack({ segments: propSegments }) {
  const {
    words,
    segments: storeSegments,
    playheadTime,
    zoomLevel,
    selectedWordId,
    selectWord,
    setPlayheadTime
  } = useEditorStore();
  
  // Use passed segments or fallback to store segments
  const segments = propSegments || storeSegments;

  // Group words by segment and calculate positions
  const wordBlocks = useMemo(() => {
    const blocks = [];
    if (!words || words.length === 0) return blocks;
    
    // Calculate position for each word
    words.forEach(word => {
      if (!word.startTime && word.startTime !== 0) return;
      
      blocks.push({
        ...word,
        left: timeToPixels(word.startTime, zoomLevel),
        width: Math.max(timeToPixels(word.endTime - word.startTime, zoomLevel), 30)
      });
    });

    return blocks;
  }, [words, zoomLevel]);

  // Group words into phrase segments
  const phraseGroups = useMemo(() => {
    if (!segments || segments.length === 0) return [];
    
    return segments.map(segment => {
      const segmentWords = wordBlocks.filter(w => w.segmentId === segment.id);
      if (segmentWords.length === 0) return null;
      
      const minLeft = Math.min(...segmentWords.map(w => w.left));
      const maxRight = Math.max(...segmentWords.map(w => w.left + w.width));
      
      return {
        id: segment.id,
        left: minLeft,
        width: maxRight - minLeft,
        words: segmentWords
      };
    }).filter(Boolean);
  }, [segments, wordBlocks]);

  return (
    <div className="bg-black relative overflow-hidden flex-shrink-0 py-1" style={{ height: '40px' }}>
      <div className="relative w-full h-20" style={{ height: '100%' }}>
        {/* Phrase background groups */}
        {phraseGroups.map((group) => (
          <div
            key={`group-${group.id}`}
            className="absolute bg-blue-50 opacity-30 h-full"
            style={{
              left: `${group.left}px`,
              width: `${group.width}px`,
              top: 0,
              bottom: 0
            }}
          />
        ))}

        {/* Word blocks */}
        {wordBlocks.length > 0 ? (
          wordBlocks.map((word) => {
            const isSelected = selectedWordId === word.id;
            const isActive = playheadTime >= word.startTime && playheadTime < word.endTime;

            return (
              <div
                key={word.id}
                className={`absolute px-1.5 py-1 flex items-center text-xs font-medium cursor-pointer transition-all ${
                  isActive
                    ? 'bg-blue-500 text-white shadow-md ring-2 ring-blue-400'
                    : isSelected
                    ? 'bg-blue-300 text-blue-900 ring-2 ring-blue-500'
                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                }`}
                style={{
                  left: `${word.left}px`,
                  width: `${word.width}px`,
                  minWidth: '30px',
                  top: '2px',
                  bottom: '2px'
                }}
                onClick={() => {
                  selectWord(word.id);
                  setPlayheadTime(word.startTime);
                }}
                title={`${word.text} (${formatTime(word.startTime)} - ${formatTime(word.endTime)})`}
              >
                <span className="truncate w-full text-center">{word.text}</span>
              </div>
            );
          })
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
            No words detected. Check if transcript is loaded.
          </div>
        )}
      </div>
    </div>
  );
}

export default WordTrack;

