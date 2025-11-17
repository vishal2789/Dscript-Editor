import express from 'express';
import { improveCaptions } from '../services/openai.js';

const router = express.Router();

/**
 * POST /api/captions/improve
 * Improve captions using OpenAI GPT
 * 
 * Body: {
 *   captions: string | [{text, start, end}],
 *   style: 'grammar' | 'concise' | 'professional' | 'casual'
 * }
 */
router.post('/improve', async (req, res) => {
  try {
    const { captions, style = 'grammar' } = req.body;

    if (!captions) {
      return res.status(400).json({ error: 'Captions are required' });
    }

    // Convert array to text if needed
    const captionText = Array.isArray(captions) 
      ? captions.map(c => c.text).join(' ')
      : captions;

    const improved = await improveCaptions(captionText, style);

    // If input was array, try to preserve timing structure
    if (Array.isArray(captions)) {
      // Simple approach: split improved text by sentences and map back
      const sentences = improved.split(/[.!?]+/).filter(s => s.trim());
      const result = captions.map((cap, idx) => ({
        ...cap,
        text: sentences[idx]?.trim() || cap.text
      }));
      res.json({ improved: result, fullText: improved });
    } else {
      res.json({ improved, fullText: improved });
    }
  } catch (error) {
    console.error('Improve captions error:', error);
    res.status(500).json({ 
      error: 'Failed to improve captions', 
      message: error.message 
    });
  }
});

export default router;

