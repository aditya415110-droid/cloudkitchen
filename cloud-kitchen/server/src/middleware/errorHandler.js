import config from '../config/index.js';

export const errorHandler = (err, req, res, _next) => {
  console.error('Unhandled error:', err);

  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: 'File too large. Maximum 5MB.' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ success: false, message: 'Too many files. Maximum 3.' });
    }
    return res.status(400).json({ success: false, message: err.message });
  }

  if (err.message?.includes('Invalid file type')) {
    return res.status(400).json({ success: false, message: err.message });
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: statusCode === 500 && config.nodeEnv === 'production'
      ? 'Internal server error.'
      : err.message || 'Internal server error.',
  });
};
