import { create } from 'zustand';
import axios from 'axios';

/**
 * Descript-style Editor state management
 * Word-level granularity with scene and transcript sync
 */
const useEditorStore = create((set, get) => {
  const MAX_HISTORY = 50;
  
  return {
    // Video state
    videoUrl: null,
    videoDuration: 0,
    isPlaying: false,
    playheadTime: 0,
    
    // Transcript & Words
    transcriptText: '',
    words: [], // Word-level data: {id, text, startTime, endTime, speaker, segmentId}
    segments: [], // Segment-level data (from backend)
    selectedWordId: null,
    selectedTextRange: null, // {startWordId, endWordId}
    
    // Scenes
    scenes: [],
    selectedSceneId: null,
    layout: '16:9',
    
    // Timeline
    zoomLevel: 100, // px per second (100px = 1 second)
    timelineScrollLeft: 0,
    
    // Scene deletion UI state
    sceneDeletionModal: {
      isOpen: false,
      sceneId: null
    },
    sceneDeletionStatus: {
      inProgress: false,
      message: '',
      progress: 0
    },
    
    // Layers
    layers: {
      captions: {
        visible: true,
        style: {
          fontSize: 24,
          color: '#FFFFFF',
          alignment: 'center',
          position: 'bottom'
        }
      },
      script: {
        visible: true
      },
      overlays: []
    },
    
    // Settings
    settings: {
      autoScroll: true,
      showWordHighlights: true,
      playbackSpeed: 1.0
    },
    
    // History for undo/redo
    history: [],
    historyIndex: -1,
    
    // Actions
    setVideoUrl: (url) => set({ videoUrl: url }),
    setVideoDuration: (duration) => set({ videoDuration: duration }),
    setIsPlaying: (playing) => set({ isPlaying: playing }),
    setPlayheadTime: (time) => set({ playheadTime: time }),
    
    setTranscriptText: (text) => {
      const project = get().project;
      if (!project) return;
      
      const updated = {
        ...project,
        fullTranscript: text
      };
      get().setProject(updated);
    },
    
    setWords: (words) => {
      // Words are derived from segments, don't set them directly
      // Instead, convert words back to segments and update project
      const project = get().project;
      if (!project) return;
      
      // Group words by segmentId
      const wordsBySegment = {};
      words.forEach(word => {
        if (!wordsBySegment[word.segmentId]) {
          wordsBySegment[word.segmentId] = [];
        }
        wordsBySegment[word.segmentId].push(word);
      });
      
      // Update segments with new text from words
      const updatedSegments = project.transcriptionSegments.map(seg => ({
        ...seg,
        text: (wordsBySegment[seg.id] || []).map(w => w.text).join(' ')
      }));
      
      const fullTranscript = updatedSegments.map(s => s.text).join(' ');
      
      const updated = {
        ...project,
        transcriptionSegments: updatedSegments,
        fullTranscript
      };
      get().setProject(updated);
    },
    
    setSegments: (segments) => {
      const project = get().project;
      if (!project) return;
      
      const updated = {
        ...project,
        transcriptionSegments: segments,
        fullTranscript: segments.map(s => s.text).join(' ')
      };
      get().setProject(updated);
    },
    
    setScenes: (scenes) => {
      const project = get().project;
      if (!project) return;
      
      // ✅ FIX: Create immutable copy of scenes array
      const updatedScenes = scenes.map(scene => ({ ...scene }));
      
      const updated = {
        ...project,
        scenes: updatedScenes // ✅ FIX: Use new array reference
      };
      get().setProject(updated);
    },
    
    selectWord: (wordId) => {
      set({ selectedWordId: wordId, selectedTextRange: null });
      const word = get().words.find(w => w.id === wordId);
      if (word) {
        set({ playheadTime: word.startTime });
      }
    },
    
    selectTextRange: (startWordId, endWordId) => {
      set({ selectedTextRange: { startWordId, endWordId }, selectedWordId: null });
    },
    
    selectScene: (sceneId) => {
      set({ selectedSceneId: sceneId });
      const scene = get().scenes.find(s => s.id === sceneId);
      if (scene) {
        set({ playheadTime: scene.start });
      }
    },
    
    updateWord: (wordId, updates) => {
      const words = get().words;
      const project = get().project;
      if (!words || !project) return;
      
      const updatedWord = words.find(w => w.id === wordId);
      if (!updatedWord) return;
      
      // Update the word
      const newText = updates.text || updatedWord.text;
      
      // Find the segment this word belongs to
      const segment = project.transcriptionSegments.find(s => s.id === updatedWord.segmentId);
      if (!segment) return;
      
      // Get all words in this segment
      const segmentWords = words.filter(w => w.segmentId === segment.id);
      
      // Update the word text in the segment
      const updatedSegmentWords = segmentWords.map(w => 
        w.id === wordId ? { ...w, text: newText } : w
      );
      
      // Reconstruct segment text
      const newSegmentText = updatedSegmentWords.map(w => w.text).join(' ');
      
      // Update segments
      const updatedSegments = project.transcriptionSegments.map(s =>
        s.id === segment.id ? { ...s, text: newSegmentText } : s
      );
      
      const fullTranscript = updatedSegments.map(s => s.text).join(' ');
      
      const updated = {
        ...project,
        transcriptionSegments: updatedSegments,
        fullTranscript
      };
      
      get().setProject(updated);
    },
    
    updateSegment: (segmentId, updates) => {
      const segments = get().segments.map(s =>
        s.id === segmentId ? { ...s, ...updates } : s
      );
      get().setSegments(segments);
    },
    
    splitScene: (sceneId, splitTime) => {
      // ✅ FIX: Use immutable updates with stable IDs
      const scenes = get().scenes.flatMap(scene => {
        if (scene.id === sceneId && splitTime > scene.start && splitTime < scene.end) {
          // ✅ FIX: Generate unique ID using timestamp + random to avoid collisions
          const uniqueId = `scene-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          return [
            { ...scene, end: splitTime },
            { ...scene, id: uniqueId, start: splitTime }
          ];
        }
        return [{ ...scene }]; // ✅ FIX: Create new object reference
      });
      get().setScenes(scenes);
    },
    
    splitWord: (wordId, splitTime) => {
      const words = get().words.flatMap(word => {
        if (word.id === wordId && splitTime > word.startTime && splitTime < word.endTime) {
          return [
            { ...word, endTime: splitTime },
            { ...word, id: `word-${Date.now()}`, startTime: splitTime }
          ];
        }
        return [word];
      });
      get().setWords(words);
    },
    
    reorderScenes: (sceneIds) => {
      const sceneMap = new Map(get().scenes.map(s => [s.id, s]));
      const reordered = sceneIds
        .map((id, order) => ({ ...sceneMap.get(id), order }))
        .filter(Boolean);
      get().setScenes(reordered);
    },
    
    openSceneDeleteModal: (sceneId) => {
      if (!sceneId) return;
      set({
        sceneDeletionModal: {
          isOpen: true,
          sceneId
        }
      });
    },
    
    closeSceneDeleteModal: () => {
      set({
        sceneDeletionModal: {
          isOpen: false,
          sceneId: null
        }
      });
    },
    
    setSceneDeletionStatus: (status) => {
      set({
        sceneDeletionStatus: {
          ...get().sceneDeletionStatus,
          ...status
        }
      });
    },
    
    // ✅ NEW: Delete scene function (calls backend to regenerate video/frames)
    deleteScene: async (sceneId) => {
      const project = get().project;
      if (!project) return;
      if (!sceneId) return;
      
      const updateStatus = (status) => {
        set({
          sceneDeletionStatus: {
            ...get().sceneDeletionStatus,
            ...status
          }
        });
      };
      
      try {
        updateStatus({ inProgress: true, progress: 10, message: 'Deleting scene…' });
        await axios.post('http://localhost:3001/api/scenes/delete', {
          projectId: project.id,
          sceneId
        });

        updateStatus({ inProgress: true, progress: 55, message: 'Rebuilding timeline…' });
        // Reload project to get updated video, scenes, frames, and segments
        const projectResponse = await axios.get(`http://localhost:3001/api/project/${project.id}`);
        get().setProject(projectResponse.data);

        // Update video URL if it changed
        if (projectResponse.data.filePath) {
          get().setVideoUrl(`http://localhost:3001/uploads/${projectResponse.data.filePath}`);
        }

        if (get().selectedSceneId === sceneId) {
          set({ selectedSceneId: null });
        }
        
        updateStatus({ inProgress: true, progress: 90, message: 'Refreshing view…' });
        setTimeout(() => {
          updateStatus({ inProgress: false, progress: 100, message: 'Scene deleted successfully!' });
          setTimeout(() => {
            updateStatus({ inProgress: false, progress: 0, message: '' });
          }, 600);
        }, 300);
      } catch (error) {
        console.error('Error deleting scene:', error);
        updateStatus({ inProgress: false, progress: 0, message: '' });
        alert(error.response?.data?.error || 'Failed to delete scene');
      }
    },
    
    // ✅ NEW: Add scene function (will be called after backend processing)
    addScene: (newScene) => {
      const project = get().project;
      if (!project) return;
      
      const scenes = [...get().scenes, newScene].sort((a, b) => a.start - b.start);
      
      const updated = {
        ...project,
        scenes: scenes
      };
      
      get().setProject(updated);
    },
    
    setZoomLevel: (level) => set({ zoomLevel: Math.max(0.1, Math.min(10, level)) }),
    setTimelineScrollLeft: (scrollLeft) => set({ timelineScrollLeft: scrollLeft }),
    
    setLayout: (layout) => set({ layout }),

    // ✅ NEW: Set background with background removal pipeline
    setBackground: async (sceneId, background) => {
      const project = get().project;
      if (!project || !sceneId) return;
      
      const updateStatus = (status) => {
        set({
          sceneDeletionStatus: {
            ...get().sceneDeletionStatus,
            ...status
          }
        });
      };
      
      try {
        // Step 1: Process background removal with Python
        updateStatus({ inProgress: true, progress: 10, message: 'Processing background removal…' });
        
        const processResponse = await axios.post('http://localhost:3001/api/background/process', {
          projectId: project.id,
          sceneId: sceneId,
          backgroundType: background.type,
          backgroundValue: background.value
        });

        if (!processResponse.data.success || !processResponse.data.jobId) {
          throw new Error(processResponse.data.error || 'Processing failed');
        }

        const jobId = processResponse.data.jobId;
        updateStatus({ inProgress: true, progress: 50, message: 'Background processed. Merging video…' });
        
        // Step 2: Merge processed scene back into main video
        const mergeResponse = await axios.post('http://localhost:3001/api/background/merge', {
          jobId: jobId
        });

        if (!mergeResponse.data.success) {
          throw new Error(mergeResponse.data.error || 'Merge failed');
        }

        updateStatus({ inProgress: true, progress: 80, message: 'Refreshing project data…' });
        
        // Reload project to get updated video and frames
        const projectResponse = await axios.get(`http://localhost:3001/api/project/${project.id}`);
        get().setProject(projectResponse.data);
        
        // Update video URL if it changed
        if (projectResponse.data.filePath) {
          const cacheBustedUrl = `http://localhost:3001/uploads/${projectResponse.data.filePath}?t=${Date.now()}`;
          get().setVideoUrl(cacheBustedUrl);
        }
        
        updateStatus({ inProgress: true, progress: 100, message: 'Background applied successfully!' });
        setTimeout(() => {
          updateStatus({ inProgress: false, progress: 0, message: '' });
        }, 1000);
      } catch (error) {
        console.error('Error replacing background:', error);
        updateStatus({ inProgress: false, progress: 0, message: '' });
        alert(error.response?.data?.error || error.message || 'Failed to replace background');
      }
    },

    updateLayer: (layerName, updates) => {
      const layers = { ...get().layers };
      layers[layerName] = { ...layers[layerName], ...updates };
      set({ layers });
    },
    
    // Project management
    project: null,
    setProject: (project) => {
      const newHistory = [...get().history.slice(0, get().historyIndex + 1), project];
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift();
      }
      
      // Convert segments to word-level data
      let words = [];
      if (project?.words && Array.isArray(project.words)) {
        words = project.words;
      } else if (project?.transcriptionSegments) {
        // Parse segments to words
        project.transcriptionSegments.forEach((segment, segIdx) => {
          // Use word-level data if available
          if (segment.words && segment.words.length > 0) {
            segment.words.forEach((word, wordIdx) => {
              words.push({
                id: `word-${segIdx}-${wordIdx}`,
                text: word.text || word.word || '',
                startTime: word.start || segment.start,
                endTime: word.end || segment.end,
                speaker: segment.speaker,
                segmentId: segment.id
              });
            });
          } else {
            // Fallback: split segment text into words
            const segmentWords = segment.text.split(/\s+/).filter(w => w.length > 0);
            const segmentDuration = segment.end - segment.start;
            const wordDuration = segmentDuration / segmentWords.length;
            
            segmentWords.forEach((wordText, wordIdx) => {
              words.push({
                id: `word-${segIdx}-${wordIdx}`,
                text: wordText,
                startTime: segment.start + (wordIdx * wordDuration),
                endTime: segment.start + ((wordIdx + 1) * wordDuration),
                speaker: segment.speaker,
                segmentId: segment.id
              });
            });
          }
        });
      }
      
      // ✅ FIX: Create immutable copies of arrays to ensure React detects changes
      const scenesCopy = project?.scenes ? project.scenes.map(s => ({ ...s })) : [];
      const framesCopy = project?.frames ? project.frames.map(f => ({ ...f })) : [];
      const segmentsCopy = project?.transcriptionSegments ? project.transcriptionSegments.map(s => ({ ...s })) : [];
      
      // ✅ FIX: Ensure project object is also a new reference
      const projectCopy = {
        ...project,
        scenes: scenesCopy,
        frames: framesCopy,
        transcriptionSegments: segmentsCopy
      };
      
      set({
        project: projectCopy, // ✅ FIX: Use new project reference
        history: newHistory,
        historyIndex: newHistory.length - 1,
        // Sync project data to store with immutable copies
        videoUrl: project?.filePath ? `http://localhost:3001/uploads/${project.filePath}` : null,
        videoDuration: project?.duration || 0,
        scenes: scenesCopy, // ✅ FIX: Use new array reference
        segments: segmentsCopy, // ✅ FIX: Use new array reference
        transcriptText: project?.fullTranscript || '',
        words: words.map(w => ({ ...w })) // ✅ FIX: Create new word objects
      });
    },
    
    updateProject: (updates) => {
      const currentProject = get().project;
      if (!currentProject) return;
      
      // ✅ FIX: Deep merge updates to ensure nested objects/arrays are properly updated
      const updatedProject = {
        ...currentProject,
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      // ✅ FIX: If scenes or frames are updated, create new array references
      if (updates.scenes) {
        updatedProject.scenes = updates.scenes.map(s => ({ ...s }));
      }
      if (updates.frames) {
        updatedProject.frames = updates.frames.map(f => ({ ...f }));
      }
      
      get().setProject(updatedProject);
    },
    
    // Undo/Redo
    undo: () => {
      const { history, historyIndex } = get();
      if (historyIndex > 0) {
        const prevProject = history[historyIndex - 1];
        set({
          project: prevProject,
          historyIndex: historyIndex - 1
        });
        get().setProject(prevProject);
      }
    },
    
    redo: () => {
      const { history, historyIndex } = get();
      if (historyIndex < history.length - 1) {
        const nextProject = history[historyIndex + 1];
        set({
          project: nextProject,
          historyIndex: historyIndex + 1
        });
        get().setProject(nextProject);
      }
    },
    
    canUndo: () => get().historyIndex > 0,
    canRedo: () => {
      const { history, historyIndex } = get();
      return historyIndex < history.length - 1;
    }
  };
});

export default useEditorStore;
