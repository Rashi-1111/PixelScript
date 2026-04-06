# Pawfect Family - Setup Instructions

## Features Implemented

✅ **Pet Submission System**
- Users can submit pets for adoption via the form
- Image upload functionality
- All submissions are stored in MongoDB database
- Submissions require admin approval before appearing publicly

✅ **Admin Approval System**
- Admin panel to view all pet submissions
- Approve or reject pet submissions
- Filter pets by status (All/Pending/Approved)
- Delete unwanted submissions

✅ **Public Pet Browsing**
- Browse only approved pets
- View pet details and images
- Adopt Now button for approved pets

## How to Use

### 1. Start MongoDB
Make sure MongoDB is running on your system:
```bash
mongod
```

### 2. Configure Environment
Update `.env` file with your MongoDB connection:
```
MONGO_URI=mongodb://localhost:27017/pawfect_family
PORT=5000
```

### 3. Start the Server
```bash
node server.js
```
Server will run on http://localhost:5000

### 4. Access the Application

**For Users:**
- **Submit a Pet**: http://localhost:5000/give-pet-for-adoption.html
  - Fill out the form with pet details
  - Upload a photo
  - Click "Submit for Adoption"
  - Pet will be sent for admin approval

- **Browse Pets**: http://localhost:5000/browse-pets.html
  - View all approved pets
  - Click "Adopt Now" to start adoption process

**For Admins:**
- **Admin Panel**: http://localhost:5000/admin-panel.html
  - View all pet submissions
  - Filter by status (Pending/Approved/All)
  - Approve pending submissions
  - Revoke approval or delete pets
  - Approved pets automatically appear on browse page

### 5. API Endpoints

- `GET /api/pets` - Get all approved pets (public)
- `GET /api/pets/all` - Get all pets including pending (admin)
- `POST /api/pets` - Submit a new pet (with image upload)
- `PATCH /api/pets/:id/approve` - Approve a pet (admin)
- `PATCH /api/pets/:id/reject` - Reject/revoke approval (admin)
- `DELETE /api/pets/:id` - Delete a pet (admin)

## Database Schema

**Pet Model:**
- `name` - Pet's name (required)
- `breed` - Pet's breed/type (required)
- `age` - Pet's age in years (required)
- `description` - Pet description
- `image` - Path to uploaded image
- `available` - Availability status (default: true)
- `approved` - Admin approval status (default: false)
- `submittedBy` - Who submitted the pet
- `submittedAt` - Submission timestamp

## Workflow

1. User submits pet → Stored in database with `approved: false`
2. Admin reviews submission in admin panel
3. Admin approves → Pet appears on browse page
4. Public users can now see and adopt the pet
5. Admin can revoke approval or delete pet anytime

## Notes

- Only approved pets appear on the public browse page
- Images are stored in the `images/` folder
- File upload is restricted to image formats (jpg, jpeg, png, gif)
- Admin panel shows color-coded status (yellow=pending, green=approved)
