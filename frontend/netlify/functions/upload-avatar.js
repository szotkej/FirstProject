const { promises: fs } = require('fs');
const path = require('path');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { avatar } = JSON.parse(event.body);
  const buffer = Buffer.from(avatar, 'base64');
  const fileName = `avatars/${Date.now()}-${Math.random() * 1E9}${path.extname(avatar.originalname || '.png')}`; // Dodano obsługę rozszerzenia
  const filePath = path.join(__dirname, '..', 'public', 'uploads', 'avatars', fileName);

  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, buffer);

    const photoURL = `https://naneno.netlify.app/uploads/avatars/${fileName}`;
    return {
      statusCode: 200,
      body: JSON.stringify({ photoURL }),
    };
  } catch (error) {
    console.error('Error saving avatar:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to upload avatar' }),
    };
  }
};