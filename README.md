# PixelScript

A collaborative platform for artists and writers to work together on creative projects in real-time. Create stories, share artwork, and build amazing creative works together!

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node Version](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen)

## 🎨 Features

- **Real-time Collaboration** - Work together simultaneously with artists and writers
- **Live Drawing Canvas** - Interactive drawing tools for creative sketching
- **Real-time Chat** - Communicate instantly within collaboration rooms
- **User Authentication** - Secure JWT-based authentication system
- **Profile Management** - Customize your profile and showcase your work
- **Rating & Reviews** - Rate and review collaborations
- **Genre-based Matching** - Find collaborators based on genres and interests
- **User Roles** - Support for artists, writers, collaborators, and readers

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | HTML5, CSS3, JavaScript (ES6+) |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB |
| **Real-time** | Socket.IO |
| **Authentication** | JWT (JSON Web Tokens) |
| **Security** | bcryptjs |
| **File Upload** | Multer |

## 📋 Prerequisites

- Node.js (>=14.0.0)
- MongoDB (local or cloud instance)
- npm or yarn package manager
- Git

## 🚀 Installation & Setup

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/pixelscript.git
cd pixelscript
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
Copy `.env.example` to `.env` and update with your configuration:
```bash
cp .env.example .env
```

Edit `.env` with your values:
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/pixelscript
JWT_SECRET=your_secure_jwt_secret_key
JWT_EXPIRES_IN=24h
NODE_ENV=development
SESSION_SECRET=your_session_secret
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760
```

### 4. Start the server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will start at `http://localhost:3000`

## 📁 Project Structure

```
pixelscript/
├── config/              # Database configuration
├── middleware/          # Express middleware (auth, error handling)
├── models/              # MongoDB schemas
│   ├── User.js
│   ├── Story.js
│   ├── Collaboration.js
│   ├── Room.js
│   ├── Purchase.js
│   └── ...
├── routes/              # API route handlers
│   ├── auth.js
│   ├── collab.js
│   ├── user.js
│   └── ...
├── services/            # Business logic
├── public/              # Frontend assets
│   ├── html/            # HTML pages
│   ├── css/             # Stylesheets
│   ├── js/              # Client-side scripts
│   └── images/          # Images and uploads
├── uploads/             # File storage
├── server.js            # Main server file
├── socket.js            # Socket.IO configuration
└── package.json         # Dependencies
```

## 🔌 API Endpoints

### Authentication Routes (`/api/users`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | Register new user |
| POST | `/login` | Login user |
| GET | `/profile` | Get user profile (protected) |
| PUT | `/profile` | Update profile (protected) |
| POST | `/logout` | Logout user |

### Collaboration Routes (`/api/collab`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create new collaboration |
| GET | `/my-collaborations` | Get user's collaborations (protected) |
| GET | `/:id` | Get specific collaboration details |
| PUT | `/:id` | Update collaboration (protected) |
| DELETE | `/:id` | Delete collaboration (protected) |
| POST | `/:id/rate` | Rate collaboration (protected) |

### Story Routes (`/api/story`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create new story |
| GET | `/` | Get all stories |
| GET | `/:id` | Get specific story |
| PUT | `/:id` | Update story (protected) |
| DELETE | `/:id` | Delete story (protected) |

### User Routes (`/api/user`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get all users |
| GET | `/:id` | Get user profile |
| GET | `/:id/works` | Get user's works |

## 🔌 Real-time Features (Socket.IO)

Connected clients can listen to and emit:
- `drawing` - Live canvas drawing data
- `chat` - Real-time chat messages
- `collaboration-update` - Collaboration status changes
- `user-joined` - User joined collaboration room
- `user-left` - User left collaboration room

## 🔐 Authentication

The application uses JWT (JSON Web Tokens) for authentication:
1. User registers or logs in
2. Server returns JWT token
3. Client includes token in Authorization header for protected routes
4. Server validates token before granting access

Protected routes require this header:
```
Authorization: Bearer <jwt_token>
```

## 📝 Usage Examples

### Register a new user
```bash
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"username": "artist123", "email": "artist@example.com", "password": "secure_pass"}'
```

### Create collaboration
```bash
curl -X POST http://localhost:3000/api/collab \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"title": "Amazing Story", "description": "Collaborative project"}'
```

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure:
- Code follows the existing style
- Changes include appropriate documentation
- All features are tested

## 🐛 Known Issues & TODO

- [ ] Add unit tests
- [ ] Implement email verification
- [ ] Add payment integration
- [ ] Optimize socket.io connections
- [ ] Add TypeScript support

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- **PixelScript Team** - Initial development

## 🙏 Acknowledgments

- Socket.IO for real-time communication
- MongoDB for flexible data storage
- Express.js community

## 📞 Support

For support, email support@pixelscript.com or open an issue on GitHub.

---

**Happy Creating! 🎨📝** 