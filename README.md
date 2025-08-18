# PixelVault - Image Hosting Platform

A secure, categorized image hosting platform built with Node.js, Express, MongoDB, and EJS templates. Perfect for developers who need a reliable place to host images for their web projects.

## Features

- **Secure Authentication** - Login system to protect your images
- **Category Organization** - Organize images by project or type
- **Drag & Drop Upload** - Easy image uploading with progress tracking
- **Copy URLs** - One-click URL copying for use in your projects
- **Gallery Management** - Browse, search, and manage all your images
- **Responsive Design** - Works on desktop and mobile devices
- **Modern UI** - Cyberpunk-inspired design with smooth animations

## Prerequisites

- Node.js (v16 or higher)
- MongoDB (local installation or MongoDB Atlas)
- Git

## Installation

1. **Clone or download the project files**
   ```bash
   git clone <your-repo> pixelvault
   cd pixelvault
   ```

2. **Create the project structure**
   ```
   pixelvault/
   ├── models/
   │   └── index.js
   ├── routes/
   │   ├── auth.js
   │   ├── upload.js
   │   └── dashboard.js
   ├── views/
   │   ├── auth/
   │   │   ├── login.ejs
   │   │   └── register.ejs
   │   └── dashboard/
   │       ├── layout.ejs
   │       ├── index.ejs
   │       └── upload.ejs
   ├── public/
   │   └── uploads/
   │       └── categories/
   ├── package.json
   └── server.js
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Set up MongoDB**
   
   **Option A: Local MongoDB**
   - Install MongoDB on your system
   - Start MongoDB service:
     ```bash
     # On macOS with Homebrew
     brew services start mongodb-community
     
     # On Ubuntu/Debian
     sudo systemctl start mongod
     
     # On Windows
     net start MongoDB
     ```
   
   **Option B: MongoDB Atlas (Cloud)**
   - Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
   - Create a cluster and get connection string
   - Update the connection string in `server.js`

5. **Create environment variables (optional)**
   Create a `.env` file in the project root:
   ```env
   SESSION_SECRET=your-very-secure-session-secret-change-this
   MONGODB_URI=mongodb://localhost:27017/imagehost
   BASE_URL=http://localhost:3000
   PORT=3000
   ```

6. **Create the directory structure**
   ```bash
   mkdir -p public/uploads/categories
   mkdir -p views/auth views/dashboard
   mkdir -p routes models
   ```

## Usage

1. **Start the application**
   ```bash
   npm start
   # or for development with auto-restart
   npm run dev
   ```

2. **Initial Setup**
   - Navigate to `http://localhost:3000`
   - You'll be redirected to create your first account
   - Fill in the registration form (this only works for the first user)

3. **Create Categories**
   - After logging in, go to "Categories" in the dashboard
   - Create categories for your different projects (e.g., "Blog Images", "Icons", "Headers")

4. **Upload Images**
   - Go to "Upload" in the dashboard
   - Select a category
   - Drag and drop images or click to select
   - Add tags, alt text, and descriptions (optional)
   - Click "Upload Images"

5. **Use Your Images**
   - In the gallery, click the copy button on any image
   - Paste the URL in your HTML: `<img src="copied-url" alt="your-image">`

## File Structure Explanation

### Server Files
- `server.js` - Main application server and configuration
- `package.json` - Dependencies and scripts
- `models/index.js` - Database schemas for Users, Categories, and Images

### Routes
- `routes/auth.js` - Authentication (login, register, logout)
- `routes/upload.js` - Image upload and management
- `routes/dashboard.js` - Dashboard pages and API endpoints

### Views
- `views/auth/` - Login and registration templates
- `views/dashboard/` - Dashboard layout and pages
- `views/dashboard/layout.ejs` - Shared dashboard layout with navigation

### Storage
- `public/uploads/categories/` - Uploaded images organized by category slugs

## API Endpoints

### Authentication
- `GET /login` - Login page
- `POST /login` - Process login
- `GET /register` - Registration (first user only)
- `POST /register` - Process registration
- `POST /logout` - Logout

### Dashboard
- `GET /dashboard` - Dashboard home
- `GET /dashboard/upload` - Upload page
- `GET /dashboard/gallery` - Image gallery
- `GET /dashboard/categories` - Category management

### Upload
- `POST /upload/image` - Upload single image
- `POST /upload/images` - Upload multiple images
- `PUT /upload/image/:id` - Update image metadata
- `DELETE /upload/image/:id` - Delete image

### Categories
- `GET /dashboard/api/categories` - Get all categories
- `POST /dashboard/categories` - Create category
- `PUT /dashboard/categories/:id` - Update category
- `DELETE /dashboard/categories/:id` - Delete category

### Images
- `GET /dashboard/api/images` - Get images with filtering/pagination

## Configuration Options

### Environment Variables
Create a `.env` file for production settings:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/imagehost

# Session Security
SESSION_SECRET=your-very-secure-random-string-here

# Server
PORT=3000
BASE_URL=http://localhost:3000

# Upload Limits
MAX_FILE_SIZE=10485760  # 10MB in bytes
MAX_FILES_PER_UPLOAD=10
```

### MongoDB Connection
Update the connection string in `server.js` if using a different setup:

```javascript
// For MongoDB Atlas
mongoose.connect('mongodb+srv://username:password@cluster.mongodb.net/imagehost')

// For custom MongoDB setup
mongoose.connect('mongodb://localhost:27017/imagehost')
```

## Security Features

- **Session-based authentication** with secure session storage
- **Password hashing** using bcrypt
- **File type validation** (images only)
- **File size limits** (10MB per image)
- **Protected routes** requiring authentication
- **CSRF protection** through same-origin policy
- **Input sanitization** and validation

## Customization

### Styling
The application uses Tailwind CSS with custom CSS variables for the cyberpunk theme. Key color variables in the templates:
- `--neon-blue: #00d4ff`
- `--neon-pink: #ff0080`
- `--neon-purple: #8b5cf6`

### Upload Limits
Modify limits in `routes/upload.js`:
```javascript
const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // Change this value
  }
});
```

### File Organization
Images are stored in: `public/uploads/categories/{category-slug}/`

## Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   - Ensure MongoDB is running
   - Check connection string
   - Verify database permissions

2. **Upload Directory Permissions**
   ```bash
   chmod -R 755 public/uploads/
   ```

3. **Port Already in Use**
   - Change PORT in `.env` or `server.js`
   - Kill process using the port:
     ```bash
     lsof -ti:3000 | xargs kill
     ```

4. **Session Issues**
   - Clear browser cookies
   - Check SESSION_SECRET is set
   - Verify MongoDB connection for session storage

### Development Tips

1. **Auto-restart during development**
   ```bash
   npm install -g nodemon
   npm run dev
   ```

2. **View database contents**
   ```bash
   mongosh imagehost
   db.images.find()
   db.categories.find()
   db.users.find()
   ```

3. **Reset database**
   ```bash
   mongosh imagehost
   db.dropDatabase()
   ```

## Production Deployment

### Environment Setup
1. Set production environment variables
2. Use a reverse proxy (nginx)
3. Enable HTTPS
4. Set up proper MongoDB security

### Example nginx configuration:
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /uploads/ {
        alias /path/to/pixelvault/public/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### PM2 Process Management
```bash
npm install -g pm2
pm2 start server.js --name pixelvault
pm2 save
pm2 startup
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

ISC License - Feel free to use this for your projects.

## Support

For issues and questions:
1. Check this README
2. Search existing issues
3. Create a new issue with detailed description

---

**Note**: This is a single-user application designed for personal use. For multi-user scenarios, additional authentication and authorization features would be needed.