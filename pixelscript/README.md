# PixelScript

A collaborative platform for artists and writers to work together on creative projects.

## Features

- Real-time collaboration between artists and writers
- Live drawing canvas with multiple tools
- Chat functionality
- User authentication and authorization
- Profile management
- Rating system
- Genre-based matching

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **Real-time Communication**: Socket.IO
- **Authentication**: JWT

## Prerequisites

- Node.js (>=14.0.0)
- MongoDB
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/pixelscript.git
cd pixelscript
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/pixelscript
JWT_SECRET=your_jwt_secret_key_here
NODE_ENV=development
```

4. Start the development server:
```bash
npm run dev
```

## API Endpoints

### Authentication
- `POST /api/users/register` - Register a new user
- `POST /api/users/login` - Login user
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile

### Collaboration
- `POST /api/collab` - Create new collaboration
- `GET /api/collab/my-collaborations` - Get user's collaborations
- `GET /api/collab/:id` - Get specific collaboration
- `PUT /api/collab/:id` - Update collaboration
- `POST /api/collab/:id/rate` - Rate collaboration

## Real-time Features

- Live drawing canvas
- Real-time chat
- Collaboration room management

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 