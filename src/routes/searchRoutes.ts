import { Router } from 'express';
import { SessionController } from '../controllers/SessionController';

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

// Search endpoint
router.get('/sessions', (req, res, next) => getController().searchSessions(req, res, next));

export default router;

