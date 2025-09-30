const express = require('express');
const bcrypt = require('bcryptjs');
const { User } = require('../models');
const router = express.Router();

// Middleware to check if user is authenticated
const requireAuth = (req, res, next) => {
  if (req.session.authenticated) {
    next();
  } else {
    res.redirect('/login');
  }
};

// Middleware to check if user is already logged in
const redirectIfAuth = (req, res, next) => {
  if (req.session.authenticated) {
    res.redirect('/dashboard');
  } else {
    next();
  }
};

// Login page
router.get('/login', redirectIfAuth, (req, res) => {
  res.render('auth/login', {
    error: null,
    message: null,
    title: 'Login - PixelVault'
  });
});

// Register page (open for everyone)
router.get('/register', redirectIfAuth, (req, res) => {
  res.render('auth/register', {
    error: null,
    title: 'Create Account - PixelVault'
  });
});

// Handle login
router.post('/login', redirectIfAuth, async (req, res) => {
  const { username, password } = req.body;
 
  try {
    if (!username || !password) {
      return res.render('auth/login', {
        error: 'Please provide both username and password',
        title: 'Login - PixelVault'
      });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.render('auth/login', {
        error: 'Invalid username or password',
        title: 'Login - PixelVault'
      });
    }
   
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.render('auth/login', {
        error: 'Invalid username or password',
        title: 'Login - PixelVault'
      });
    }
   
    req.session.authenticated = true;
    req.session.userId = user._id;
    req.session.username = user.username;
    req.session.user = {
      id: user._id,
      username: user.username,
      email: user.email
    };
   
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Login error:', error);
    res.render('auth/login', {
      error: 'An error occurred during login',
      title: 'Login - PixelVault'
    });
  }
});

// Handle registration (open for everyone)
router.post('/register', redirectIfAuth, async (req, res) => {
  const { username, email, password, confirmPassword } = req.body;
 
  try {
    if (!username || !email || !password || !confirmPassword) {
      return res.render('auth/register', {
        error: 'All fields are required',
        title: 'Create Account - PixelVault'
      });
    }
 
    if (password !== confirmPassword) {
      return res.render('auth/register', {
        error: 'Passwords do not match',
        title: 'Create Account - PixelVault'
      });
    }

    if (password.length < 6) {
      return res.render('auth/register', {
        error: 'Password must be at least 6 characters long',
        title: 'Create Account - PixelVault'
      });
    }
   
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      username,
      email,
      password: hashedPassword
    });
   
    await user.save();
   
    req.session.authenticated = true;
    req.session.userId = user._id;
    req.session.username = user.username;
    req.session.user = {
      id: user._id,
      username: user.username,
      email: user.email
    };
   
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Registration error:', error);
    let errorMessage = 'An error occurred during registration';
   
    if (error.code === 11000) {
      if (error.keyPattern && error.keyPattern.username) {
        errorMessage = 'Username already exists';
      } else if (error.keyPattern && error.keyPattern.email) {
        errorMessage = 'Email already exists';
      }
    } else if (error.name === 'ValidationError') {
      errorMessage = Object.values(error.errors)[0].message;
    }
   
    res.render('auth/register', {
      error: errorMessage,
      title: 'Create Account - PixelVault'
    });
  }
});

// GET Logout (for direct links) - with user feedback
router.get('/logout', (req, res) => {
  const username = req.session.username || 'User';
  
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.redirect('/login');
    }
    
    res.clearCookie('connect.sid'); // Clear the session cookie
    
    // Redirect with query parameter for user feedback
    res.redirect(`/login?logout=success&user=${encodeURIComponent(username)}`);
  });
});

// POST Logout (for forms) - with user feedback
router.post('/logout', (req, res) => {
  const username = req.session.username || 'User';

  req.session.destroy(err => {
    if (err) {
      console.error('Logout error:', err);
      return res.redirect('/');
    }
    // Correctly redirect with a query parameter that includes the username
    res.redirect(`/login?logout=success&username=${encodeURIComponent(username)}`);
  });
});

module.exports = router;
module.exports.requireAuth = requireAuth;
