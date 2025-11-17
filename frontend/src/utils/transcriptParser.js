/**
 * Transcript parsing utilities
 * Converts backend segments to word-level data
 */

/**
 * Parse segments into word-level data with timestamps
 */
export function parseSegmentsToWords(segments) {
  const words = [];
  
  segments.forEach((segment, segIdx) => {
    // Split segment text into words
    const segmentWords = segment.text.split(/(\s+)/).filter(w => w.trim().length > 0);
    const segmentDuration = segment.end - segment.start;
    
    // If segment has word-level data, use it
    if (segment.words && segment.words.length > 0) {
      segment.words.forEach((word, wordIdx) => {
        words.push({
          id: `word-${segIdx}-${wordIdx}`,
          text: word.text || word.word || '',
          startTime: word.start || segment.start,
          endTime: word.end || segment.end,
          speaker: segment.speaker,
          segmentId: segment.id,
          confidence: word.confidence
        });
      });
    } else {
      // Fallback: distribute words evenly across segment duration
      const wordDuration = segmentDuration / segmentWords.length;
      
      segmentWords.forEach((wordText, wordIdx) => {
        words.push({
          id: `word-${segIdx}-${wordIdx}`,
          text: wordText.trim(),
          startTime: segment.start + (wordIdx * wordDuration),
          endTime: segment.start + ((wordIdx + 1) * wordDuration),
          speaker: segment.speaker,
          segmentId: segment.id
        });
      });
    }
  });
  
  return words;
}

/**
 * Reconstruct transcript text from words
 */
export function wordsToTranscript(words) {
  return words.map(w => w.text).join(' ');
}

/**
 * Find word at given time
 */
export function findWordAtTime(words, time) {
  return words.find(w => time >= w.startTime && time < w.endTime);
}

/**
 * Find words in time range
 */
export function findWordsInRange(words, startTime, endTime) {
  return words.filter(w => 
    (w.startTime >= startTime && w.startTime < endTime) ||
    (w.endTime > startTime && w.endTime <= endTime) ||
    (w.startTime <= startTime && w.endTime >= endTime)
  );
}

