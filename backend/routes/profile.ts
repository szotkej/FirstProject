// backend\routes\profile.ts
import express from 'express';
import { upload } from '../middlewares/upload';
import { updateUserPhotoURL } from '../services/userService.js';

const router = express.Router();

router.post('/profile/:id/avatar', upload.single('avatar'), async (req, res) => {
  try {
    const userId = req.params.id;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    // Ponieważ upload jest teraz na Netlify, zwróć pustą odpowiedź lub obsługuj tylko aktualizację
    const photoURL = ''; // To zostanie zaktualizowane przez frontend
    await updateUserPhotoURL(userId, photoURL);
    return res.json({ photoURL: 'Upload handled by frontend' });
  } catch (error) {
    console.error('Error in avatar route:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;