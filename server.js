const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 3000;

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/imagehost';
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('✅ Connected to MongoDB');
}).catch(err => {
  console.error('❌ Could not connect to MongoDB:', err);
  process.exit(1);
});

// Create upload directories if they don't exist
const uploadDir = path.join(__dirname, 'public', 'uploads');
const categoriesDir = path.join(uploadDir, 'categories');
try {
  if (!fs.existsSync(path.join(__dirname, 'public'))) {
    fs.mkdirSync(path.join(__dirname, 'public'), { recursive: true });
    console.log('📁 Created public directory');
  }
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('📁 Created uploads directory');
  }
  if (!fs.existsSync(categoriesDir)) {
    fs.mkdirSync(categoriesDir, { recursive: true });
    console.log('📁 Created categories directory');
  }
} catch (error) {
  console.error('❌ Error creating directories:', error);
}

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-this-in-production',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: MONGODB_URI,
    touchAfter: 24 * 3600 // lazy session update
  }),
  cookie: {
    secure: false, // Set to true if using HTTPS in production
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true
  }
}));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Add user to locals for templates
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.authenticated = req.session.authenticated || false;
  next();
});

// Temporary debugging - add this before importing routes
console.log('📋 About to import routes...');
try {
  console.log('📥 Importing auth routes...');
  const authRoutes = require('./routes/auth');
  console.log('✅ Auth routes imported successfully');
  
  console.log('📥 Importing upload routes...');
  const uploadRoutes = require('./routes/upload');
  console.log('✅ Upload routes imported successfully');
  
  console.log('📥 Importing dashboard routes...');
  const dashboardRoutes = require('./routes/dashboard');
  console.log('✅ Dashboard routes imported successfully');
  
  // Use routes
  console.log('🔌 Registering routes...');
  app.use('/', authRoutes);
  console.log('✅ Auth routes registered');
  
  app.use('/upload', uploadRoutes);
  console.log('✅ Upload routes registered');
  
  app.use('/dashboard', dashboardRoutes);
  console.log('✅ Dashboard routes registered');
  
} catch (error) {
  console.error('❌ Error importing routes:', error.message);
  console.error('❌ Error stack:', error.stack);
  console.error('❌ Make sure all route files exist and export valid Express routers');
  process.exit(1);
}

// Home route - redirect to login if not authenticated, otherwise to dashboard
app.get('/', (req, res) => {
  if (req.session.authenticated) {
    res.redirect('/dashboard');
  } else {
    res.redirect('/login');
  }
});

// Enhanced error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server Error Details:');
  console.error('Error message:', err.message);
  console.error('Error stack:', err.stack);
  console.error('Request URL:', req.url);
  console.error('Request method:', req.method);
  
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Page not found' });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

// Start server
app.listen(port, () => {
  console.log(`🚀 PixelVault server running at http://localhost:${port}`);
  console.log('✨ Navigate to the URL to access your image hosting platform');
});