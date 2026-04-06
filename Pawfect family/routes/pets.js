const express = require('express');
const router = express.Router();
const Pet = require('../models/Pet');
const AdoptionRequest = require('../models/AdoptionRequest');
const multer = require('multer');
const path = require('path');

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'images/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|gif/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb('Error: Images only!');
        }
    }
});

// Get all approved & available pets (for public browsing)
// Additionally exclude pets that already have an approved adoption request (retroactive safety)
router.get('/', async (req, res) => {
    try {
        // Find petIds with approved adoption requests
        const adoptedPetIds = await AdoptionRequest.find({ status: 'approved' }).distinct('petId');

        // Return pets that are approved by admin, marked available, and not already adopted
        const pets = await Pet.find({
            approved: true,
            available: true,
            _id: { $nin: adoptedPetIds }
        });
        res.json(pets);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get all pets (for admin panel)
router.get('/all', async (req, res) => {
    try {
        const pets = await Pet.find();
        res.json(pets);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Add a new pet with image upload
router.post('/', upload.single('petPhoto'), async (req, res) => {
    try {
        const petData = {
            name: req.body.petName,
            breed: req.body.petType,
            age: req.body.petAge,
            description: req.body.petDesc,
            image: req.file ? 'images/' + req.file.filename : '',
            submittedBy: req.body.submittedBy || 'anonymous',
            approved: false // Requires admin approval
        };
        const pet = new Pet(petData);
        await pet.save();
        res.status(201).json({ message: 'Pet submitted successfully! Waiting for admin approval.', pet });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Approve a pet (admin only)
router.patch('/:id/approve', async (req, res) => {
    try {
        const pet = await Pet.findByIdAndUpdate(
            req.params.id, 
            { approved: true }, 
            { new: true }
        );
        if (!pet) return res.status(404).json({ message: 'Pet not found' });
        res.json({ message: 'Pet approved successfully', pet });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Reject/Unapprove a pet (admin only)
router.patch('/:id/reject', async (req, res) => {
    try {
        const pet = await Pet.findByIdAndUpdate(
            req.params.id, 
            { approved: false }, 
            { new: true }
        );
        if (!pet) return res.status(404).json({ message: 'Pet not found' });
        res.json({ message: 'Pet approval revoked', pet });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Get a single pet
router.get('/:id', async (req, res) => {
    try {
        const pet = await Pet.findById(req.params.id);
        if (!pet) return res.status(404).json({ message: 'Pet not found' });
        res.json(pet);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Update a pet
router.put('/:id', async (req, res) => {
    try {
        const pet = await Pet.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!pet) return res.status(404).json({ message: 'Pet not found' });
        res.json(pet);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete a pet
router.delete('/:id', async (req, res) => {
    try {
        const pet = await Pet.findByIdAndDelete(req.params.id);
        if (!pet) return res.status(404).json({ message: 'Pet not found' });
        res.json({ message: 'Pet deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;