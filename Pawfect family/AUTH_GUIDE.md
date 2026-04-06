# Authentication System Guide - Pawfect Family

## 🔐 Complete Authentication Implementation

### Features Implemented:

#### 1. **User Registration (Signup)**
- Users can signup as either **User** or **Admin**
- Required fields:
  - Full Name
  - Email
  - Password
  - Role (User/Admin)
- Data is stored in MongoDB with hashed passwords
- Auto-login after successful signup

#### 2. **User Login**
- Login with email and password
- Password validation using bcrypt
- Credentials verified against database
- Session stored in browser's localStorage

#### 3. **Role-Based Redirection**
- **Admin Login/Signup** → Redirected to Admin Panel
- **User Login/Signup** → Stays on Home Page
- Navbar updates to show user info

#### 4. **Protected Admin Panel**
- Only accessible to users with admin role
- Shows "Access Denied" message to non-admin users
- Automatic redirect if not authenticated

#### 5. **Persistent Sessions**
- User data stored in localStorage
- Navbar automatically updates on all pages
- Session persists across page refreshes

---

## 📋 How to Use

### **For Regular Users:**

1. **Signup as User**:
   - Click "Signup" in navbar
   - Fill in name, email, password
   - Select "User" as role
   - Click "Signup"
   - You'll be redirected to home page with your name showing

2. **Login as User**:
   - Click "Login" in navbar
   - Enter email and password
   - Click "Login"
   - Navbar updates to show "Welcome, [Your Name]"
   - You stay on home page

3. **Browse Pets**:
   - Navigate to Browse Pets
   - View approved pets
   - Click "Adopt Now" on any pet

4. **Logout**:
   - Click your name in navbar dropdown
   - Click "Logout"
   - You'll be returned to logged-out state

---

### **For Admins:**

1. **Signup as Admin**:
   - Click "Signup" in navbar
   - Fill in name, email, password
   - Select **"Admin"** as role
   - Click "Signup"
   - **Automatically redirected to Admin Panel**

2. **Login as Admin**:
   - Click "Login" in navbar
   - Enter admin email and password
   - Click "Login"
   - **Automatically redirected to Admin Panel**

3. **Manage Pets in Admin Panel**:
   - View all submitted pets
   - Filter: All / Pending / Approved
   - Approve pending submissions
   - Revoke approvals
   - Delete pets

4. **Access Admin Panel Anytime**:
   - Click your name in navbar
   - Click "Admin Panel" from dropdown
   - Or directly visit: `http://localhost:5000/admin-panel.html`

---

## 🔄 Complete Workflow Examples

### **Example 1: User Journey**
```
1. User visits homepage → Clicks "Signup"
2. Fills form: Name: "John", Email: "john@email.com", Role: "User"
3. After signup → Stays on homepage, navbar shows "Welcome, John"
4. Clicks "Browse Pets" → Sees approved pets
5. Clicks "Adopt Now" → Can fill adoption form
6. Clicks "Logout" → Back to guest view
```

### **Example 2: Admin Journey**
```
1. Admin visits homepage → Clicks "Signup"
2. Fills form: Name: "Admin", Email: "admin@email.com", Role: "Admin"
3. After signup → Automatically taken to Admin Panel
4. Sees all pet submissions (pending and approved)
5. Clicks "Approve" on pending pets → They become visible to users
6. Can logout or navigate to other pages (navbar shows admin options)
```

### **Example 3: Pet Approval Workflow**
```
1. User submits pet for adoption → Saved with approved: false
2. Admin logs in → Redirected to Admin Panel
3. Admin sees new submission in "Pending" (yellow highlighted)
4. Admin clicks "Approve" → Pet status changes to approved: true
5. Pet now appears on Browse Pets page for public viewing
6. Regular users can now see and adopt this pet
```

---

## 🗄️ Database Storage

### **User Collection:**
```javascript
{
  name: "John Doe",
  email: "john@email.com",
  password: "$2a$10$hashedpasswordhere", // Encrypted with bcrypt
  role: "user" // or "admin"
}
```

### **Pet Collection:**
```javascript
{
  name: "Buddy",
  breed: "Dog",
  age: 3,
  description: "Friendly dog",
  image: "images/1234567890-buddy.jpg",
  approved: true, // false until admin approves
  submittedBy: "anonymous",
  submittedAt: "2025-10-21T10:30:00.000Z"
}
```

---

## 🔒 Security Features

1. **Password Hashing**: All passwords encrypted with bcrypt (10 salt rounds)
2. **Role-Based Access**: Admin panel checks user role before displaying
3. **Client-Side Session**: User info stored in localStorage
4. **Protected Routes**: Admin panel shows access denied to non-admins

---

## 📱 Navbar Behavior

### **When Not Logged In:**
- Shows: Home | Browse Pets | Give Pet | **Login** | **Signup**

### **When Logged In as User:**
- Shows: Home | Browse Pets | Give Pet | **Welcome, [Name] ▼**
  - Dropdown: Logout

### **When Logged In as Admin:**
- Shows: Home | Browse Pets | Give Pet | **Welcome, [Name] ▼**
  - Dropdown: Admin Panel | Logout

---

## 🧪 Testing the System

### Test User Account:
1. Open: `http://localhost:5000/index.html`
2. Click "Signup"
3. Create account with role: "User"
4. Verify you stay on homepage
5. Check navbar shows your name

### Test Admin Account:
1. Open: `http://localhost:5000/index.html`
2. Click "Signup"
3. Create account with role: "Admin"
4. Verify you're redirected to admin panel
5. Try approving a pet

### Test Protected Access:
1. Without logging in, try to access: `http://localhost:5000/admin-panel.html`
2. Should show "Access Denied" message
3. Login as admin → Should see full admin panel

---

## 🚀 Quick Start Commands

```bash
# Make sure MongoDB is running
mongod

# Start the server
node server.js

# Open in browser
http://localhost:5000/index.html
```

---

## 📝 API Endpoints Used

- `POST /api/auth/signup` - Create new user account
- `POST /api/auth/login` - Authenticate user
- User data returned on successful login/signup

---

## ✨ Features Summary

✅ User signup with role selection (User/Admin)  
✅ User login with credential verification  
✅ Passwords hashed and stored securely  
✅ Role-based redirection after login/signup  
✅ Protected admin panel (admins only)  
✅ Persistent sessions with localStorage  
✅ Dynamic navbar based on auth status  
✅ Logout functionality on all pages  
✅ Access denied page for unauthorized users  

**Everything is fully functional and ready to use!** 🎉
