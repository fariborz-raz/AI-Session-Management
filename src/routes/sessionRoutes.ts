import { Router } from 'express';
import multer from 'multer';
import { SessionController } from '../controllers/SessionController';
import { EnvConfig } from '../config/EnvConfig';

const router = Router();
// Controller will be instantiated lazily when routes are registered
// to ensure DI container is set up first
let controller: SessionController | null = null;

function getController(): SessionController {
  if (!controller) {
    controller = new SessionController();
  }
  return controller;
}

// Configure multer for audio file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: EnvConfig.MAX_FILE_SIZE
  },
  fileFilter: (req, file, cb) => {
    // Accept audio files based on configured MIME types
    const allowedTypes = EnvConfig.ALLOWED_AUDIO_MIME_TYPES.split(',').map(t => t.trim());
    const isAllowed = allowedTypes.some(type => {
      if (type === 'audio/*') {
        return file.mimetype.startsWith('audio/');
      }
      return file.mimetype === type;
    });

    if (isAllowed) {
      cb(null, true);
    } else {
      cb(new Error(`Only ${EnvConfig.ALLOWED_AUDIO_MIME_TYPES} files are allowed`));
    }
  }
});

// Core endpoints
router.post('/', (req, res, next) => getController().createSession(req, res, next));
// Note: GET / must come before GET /:sessionId to avoid route conflicts
router.get('/', (req, res, next) => getController().getSessionsByTherapist(req, res, next)); // GET /sessions?therapistId=xxx
router.get('/:sessionId', (req, res, next) => getController().getSession(req, res, next));
router.get('/:sessionId/summary', (req, res, next) => getController().getSessionSummary(req, res, next));
router.post('/:sessionId/entries', (req, res, next) => getController().addSessionEntry(req, res, next));

// RAG endpoints
router.post('/:sessionId/transcribe', upload.single('audio'), (req, res, next) => getController().transcribeSession(req, res, next));
router.post('/:sessionId/embed', (req, res, next) => getController().embedSession(req, res, next));

export default router;

