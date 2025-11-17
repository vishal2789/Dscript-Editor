import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs-extra';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const uploadDir = process.env.UPLOAD_DIR || join(__dirname, '../uploads');

/**
 * GET /api/project/:id
 * Load saved project by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const projectId = req.params.id;
    const projectPath = join(uploadDir, `${projectId}.json`);

    if (!await fs.pathExists(projectPath)) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const projectData = await fs.readJSON(projectPath);
    res.json(projectData);
  } catch (error) {
    console.error('Error loading project:', error);
    res.status(500).json({ error: 'Failed to load project', message: error.message });
  }
});

/**
 * PUT /api/project/:id
 * Save/update project
 */
router.put('/:id', async (req, res) => {
  try {
    const projectId = req.params.id;
    const projectData = req.body;
    const projectPath = join(uploadDir, `${projectId}.json`);

    // Ensure project data has required fields
    if (!projectData.id || projectData.id !== projectId) {
      projectData.id = projectId;
    }
    projectData.updatedAt = new Date().toISOString();

    await fs.writeJSON(projectPath, projectData, { spaces: 2 });
    res.json({ success: true, project: projectData });
  } catch (error) {
    console.error('Error saving project:', error);
    res.status(500).json({ error: 'Failed to save project', message: error.message });
  }
});

export default router;

