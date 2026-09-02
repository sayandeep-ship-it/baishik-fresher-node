const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const multer = require('multer');

require('dotenv').config();

const sequelize = require('./config/database');

const { connectDatabase } = require('./config/database');

const { verifySMTPConnection } = require('./services/emailService');

require('./models');

const apiRoutes = require('./routes/api');

const app = express();

// MIDDLEWARE

app.use(morgan('dev'));

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
  })
);

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  })
);

// STATIC UPLOADS

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// HEALTH

app.get('/', (req, res) => {
  res.redirect('/health');
});

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,

    message: 'Server is running.',
  });
});

// API

app.use('/api', apiRoutes);

// 404

app.use((req, res) => {
  res.status(404).json({
    message: 'Route not found.',
  });
});

// ERROR

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        message: 'File size too large. Maximum allowed size is 5MB.',
      });
    }

    return res.status(400).json({
      message: err.message,
    });
  }

  if (
    err &&
    (err.status === 400 ||
      err.statusCode === 400 ||
      err.message === 'Only JPG, JPEG, PNG and WEBP images are allowed.')
  ) {
    return res.status(err.status || err.statusCode || 400).json({
      message: err.message,
    });
  }

  console.error(err);

  res.status(500).json({
    message: 'Internal server error.',
  });
});

// START SERVER

const PORT = Number(process.env.PORT || 3000);

const HOST = process.env.HOST || '127.0.0.1';

const startServer = async () => {
  try {
    await connectDatabase();

    await verifySMTPConnection();

    app.listen(PORT, HOST, () => {
      console.log(`Server running at http://${HOST}:${PORT}`);
    });
  } catch (error) {
    console.error('Unable to start server:', error.message);

    process.exit(1);
  }
};

startServer();
