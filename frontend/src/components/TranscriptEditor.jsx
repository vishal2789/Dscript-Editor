import { useEffect, useRef, useState, useCallback } from 'react';
import useEditorStore from '../store/useEditorStore';
import { findWordAtTime } from '../utils/transcriptParser';

function TranscriptEditor() {
  const {
    words,
    playheadTime,
    selectedWordId,
    selectWord,
    updateWord,
    settings
  } = useEditorStore();

  const editorRef = useRef(null);
  const [editingWordId, setEditingWordId] = useState(null);
  const [editingText, setEditingText] = useState('');

  // Find active word at current playhead time
  const activeWord = words && words.length > 0 ? findWordAtTime(words, playheadTime) : null;

  // Auto-scroll to active word
  useEffect(() => {
    if (settings.autoScroll && activeWord && editorRef.current) {
      const wordElement = editorRef.current.querySelector(`[data-word-id="${activeWord.id}"]`);
      if (wordElement) {
        wordElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeWord, settings.autoScroll]);

  // Handle word click
  const handleWordClick = useCallback((wordId, event) => {
    event.preventDefault();
    selectWord(wordId);
  }, [selectWord]);

  // Handle word double-click to edit
  const handleWordDoubleClick = useCallback((word) => {
    setEditingWordId(word.id);
    setEditingText(word.text);
  }, []);

  // Handle word edit
  const handleWordEdit = useCallback((wordId, newText) => {
    updateWord(wordId, { text: newText });
    setEditingWordId(null);
  }, [updateWord]);
  
  // Early return if no words
  if (!words || words.length === 0) {
    return (
      <div className="h-full flex flex-col bg-white">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-900">Transcript</h2>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4" data-no-editor="true">
          <div className="text-center text-gray-400 py-12">
            <p>No transcript available</p>
            <p className="text-xs mt-2">Upload a video to see the transcript</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header - No "Add Speaker" button */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h2 className="text-sm font-semibold text-gray-900">Transcript</h2>
      </div>

      {/* Transcript Content - Continuous paragraph (no segment breaks) */}
      <div
        ref={editorRef}
        className="flex-1 overflow-y-auto px-4 py-4"
        style={{ fontSize: '14px', lineHeight: '1.8' }}
        data-no-editor="true"
        data-gramm="false"
        data-gramm_editor="false"
        data-enable-grammarly="false"
      >
        {/* Render all words as continuous text without segment breaks */}
        <div className="flex flex-wrap gap-1">
          {words.map((word, idx) => {
            const isActive = activeWord?.id === word.id;
            const isSelected = selectedWordId === word.id;
            const isEditing = editingWordId === word.id;

            return (
              <span
                key={word.id}
                data-word-id={word.id}
                className={`inline-block px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                  isActive
                    ? 'bg-blue-500 text-white font-medium'
                    : isSelected
                    ? 'bg-blue-200 text-blue-900'
                    : 'hover:bg-gray-100'
                }`}
                onClick={(e) => handleWordClick(word.id, e)}
                onDoubleClick={() => handleWordDoubleClick(word)}
                title={`${word.text} (${formatTime(word.startTime)} - ${formatTime(word.endTime)})`}
              >
                {isEditing ? (
                  <input
                    type="text"
                    defaultValue={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    onBlur={(e) => {
                      e.stopPropagation();
                      if (editingText && editingText.trim()) {
                        handleWordEdit(word.id, editingText);
                      } else {
                        setEditingWordId(null);
                      }
                    }}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const newText = e.target.value;
                        if (newText && newText.trim()) {
                          handleWordEdit(word.id, newText);
                        } else {
                          setEditingWordId(null);
                        }
                      } else if (e.key === 'Escape') {
                        e.preventDefault();
                        setEditingWordId(null);
                      }
                    }}
                    className="bg-white border-2 border-blue-500 rounded px-2 py-1 min-w-[70px] text-sm text-gray-900"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                    onFocus={(e) => {
                      e.stopPropagation();
                      e.target.select();
                    }}
                    data-no-editor="true"
                    data-gramm="false"
                    data-gramm_editor="false"
                    data-enable-grammarly="false"
                  />
                ) : (
                  word.text
                )}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export default TranscriptEditor;
