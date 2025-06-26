// backend\routes\profile.ts
import express from 'express';
import { upload } from '../middlewares/upload';
import { updateUserPhotoURL } from '../services/userService.js'; // Twoja funkcja do aktualizacji bazy
import path from 'path';

const router = express.Router();

router.post('/profile/:id/avatar', upload.single('avatar'), async (req, res) => {
  try {
    const userId = req.params.id;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }
    
    const avatarPath = `uploads/avatars/${req.file.filename}`;
    console.log('File saved at:', avatarPath); // Dodaj logowanie
    const photoURL = `${process.env.BASE_URL}/uploads/avatars/${req.file.filename}`;

    // Zaktualizuj photoURL w bazie
    await updateUserPhotoURL(userId, photoURL);

    return res.json({ photoURL });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
