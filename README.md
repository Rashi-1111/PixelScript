🎨 PixelScript

A collaborative platform for artists and writers to work together on creative projects in real-time. Create stories, share artwork, and build amazing creative works together!

✨ Features
🎯 Real-time Collaboration – Work together simultaneously with artists and writers
🖌 Live Drawing Canvas – Interactive drawing tools for sketching
💬 Real-time Chat – Communicate instantly in collaboration rooms
🔐 User Authentication – Secure JWT-based login system
👤 Profile Management – Customize profiles and showcase work
⭐ Rating & Reviews – Rate and review collaborations
🎭 Genre-based Matching – Find collaborators based on interests
🧑‍🤝‍🧑 User Roles – Artists, writers, collaborators, readers
🛠 Tech Stack
Layer	Technology
Frontend	HTML5, CSS3, JavaScript (ES6+)
Backend	Node.js, Express.js
Database	MongoDB
Real-time	Socket.IO
Authentication	JWT (JSON Web Tokens)
Security	bcryptjs
File Upload	Multer
📋 Prerequisites

Make sure you have installed:

Node.js (>=14.0.0)
MongoDB (local or cloud)
npm or yarn
Git
🚀 Installation & Setup
1️⃣ Clone the repository
git clone https://github.com/yourusername/pixelscript.git
cd pixelscript
2️⃣ Install dependencies
npm install
3️⃣ Configure environment variables
cp .env.example .env

Update .env file:

PORT=3000
MONGODB_URI=mongodb://localhost:27017/pixelscript
JWT_SECRET=your_secure_jwt_secret_key
JWT_EXPIRES_IN=24h
NODE_ENV=development
SESSION_SECRET=your_session_secret
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760
4️⃣ Run the server

Development mode:

npm run dev

Production mode:

npm start

🌐 Server runs at: http://localhost:3000

📁 Project Structure
pixelscript/
├── config/              
├── middleware/          
├── models/              
│   ├── User.js
│   ├── Story.js
│   ├── Collaboration.js
│   ├── Room.js
│   ├── Purchase.js
│   └── ...
├── routes/              
│   ├── auth.js
│   ├── collab.js
│   ├── user.js
│   └── ...
├── services/            
├── public/              
│   ├── html/
│   ├── css/
│   ├── js/
│   └── images/
├── uploads/             
├── server.js            
├── socket.js            
└── package.json         
🔌 API Endpoints
🔐 Authentication (/api/users)
Method	Endpoint	Description
POST	/register	Register user
POST	/login	Login
GET	/profile	Get profile (Protected)
PUT	/profile	Update profile (Protected)
POST	/logout	Logout
🤝 Collaboration (/api/collab)
Method	Endpoint	Description
POST	/	Create collaboration
GET	/my-collaborations	Get user collaborations
GET	/:id	Get collaboration
PUT	/:id	Update collaboration
DELETE	/:id	Delete collaboration
POST	/:id/rate	Rate collaboration
📖 Story (/api/story)
Method	Endpoint	Description
POST	/	Create story
GET	/	Get all stories
GET	/:id	Get story
PUT	/:id	Update story
DELETE	/:id	Delete story
👤 Users (/api/user)
Method	Endpoint	Description
GET	/	Get all users
GET	/:id	Get user profile
GET	/:id/works	Get user works
⚡ Real-time Features (Socket.IO)

Events supported:

🎨 drawing – Live canvas updates
💬 chat – Real-time messaging
🔄 collaboration-update – Status updates
👋 user-joined – User joins room
🚪 user-left – User leaves room
🔐 Authentication

Workflow:

User logs in/registers
Server returns JWT
Client sends token in headers
Server validates before access

Header format:

Authorization: Bearer <jwt_token>
🧪 Usage Examples
Register User
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"username":"artist123","email":"artist@example.com","password":"secure_pass"}'
Create Collaboration
curl -X POST http://localhost:3000/api/collab \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Amazing Story","description":"Collaborative project"}'
🤝 Contributing

Steps to contribute:

Fork the repo

Create branch

git checkout -b feature/amazing-feature

Commit changes

git commit -m "Add amazing feature"

Push

git push origin feature/amazing-feature
Open Pull Request
🐛 Known Issues / TODO
 Add unit tests
 Email verification
 Payment integration
 Optimize Socket.IO
 Add TypeScript
📄 License

This project is licensed under the MIT License.

👥 Authors

PixelScript Team – Initial development

🙏 Acknowledgments
Socket.IO
MongoDB
Express.js community
