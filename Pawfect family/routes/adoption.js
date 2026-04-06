const express = require('express');
const router = express.Router();
const AdoptionRequest = require('../models/AdoptionRequest');
const Pet = require('../models/Pet');

// Create adoption request
router.post('/', async (req, res) => {
    try {
        const request = new AdoptionRequest(req.body);
        await request.save();
        // Mark pet as requested (on hold) globally
        if (request.petId) {
            await Pet.findByIdAndUpdate(request.petId, { adoptionStatus: 'requested' });
        }
        res.status(201).json({ message: 'Adoption request submitted successfully!', request });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Get all adoption requests (with optional email filter for users)
router.get('/', async (req, res) => {
    try {
        const { email } = req.query;
        let query = {};
        
        // If email is provided, filter by applicant email
        if (email) {
            query.applicantEmail = email;
        }
        
        const requests = await AdoptionRequest.find(query).populate('petId').sort({ submittedAt: -1 });
        res.json(requests);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Approve adoption request
router.patch('/:id/approve', async (req, res) => {
    try {
        const request = await AdoptionRequest.findByIdAndUpdate(
            req.params.id, 
            { status: 'approved' }, 
            { new: true }
        );
        if (!request) return res.status(404).json({ message: 'Request not found' });

        // Update pet as adopted and make it unavailable
        if (request.petId) {
            await Pet.findByIdAndUpdate(request.petId, { adoptionStatus: 'adopted', available: false });
            // Optionally reject other pending requests for this pet
            await AdoptionRequest.updateMany(
                { petId: request.petId, _id: { $ne: request._id }, status: 'pending' },
                { $set: { status: 'rejected' } }
            );
        }
        res.json({ message: 'Adoption request approved!', request });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Reject adoption request
router.patch('/:id/reject', async (req, res) => {
    try {
        const request = await AdoptionRequest.findByIdAndUpdate(
            req.params.id, 
            { status: 'rejected' }, 
            { new: true }
        );
        if (!request) return res.status(404).json({ message: 'Request not found' });

        // If no other pending or approved requests remain for this pet, mark pet back to available (if still available)
        if (request.petId) {
            const hasPending = await AdoptionRequest.exists({ petId: request.petId, status: 'pending' });
            const hasApproved = await AdoptionRequest.exists({ petId: request.petId, status: 'approved' });
            if (!hasPending && !hasApproved) {
                await Pet.findByIdAndUpdate(request.petId, { adoptionStatus: 'available' });
            }
        }
        res.json({ message: 'Adoption request rejected', request });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete adoption request
router.delete('/:id', async (req, res) => {
    try {
        const request = await AdoptionRequest.findByIdAndDelete(req.params.id);
        if (!request) return res.status(404).json({ message: 'Request not found' });

        // After deletion, if no other pending/approved requests exist, mark pet as available
        if (request.petId) {
            const hasPending = await AdoptionRequest.exists({ petId: request.petId, status: 'pending' });
            const hasApproved = await AdoptionRequest.exists({ petId: request.petId, status: 'approved' });
            if (!hasPending && !hasApproved) {
                // Only set available if it wasn't adopted already
                await Pet.findByIdAndUpdate(request.petId, { adoptionStatus: 'available' });
            }
        }
        res.json({ message: 'Request deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;