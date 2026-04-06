const mongoose = require('mongoose');
const AdoptionRequest = require('./models/AdoptionRequest');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/pawfect_family')
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// Test creating an adoption request
const testData = {
    petId: '68f8f666812a3f200c7295d9',
    petName: 'sam',
    applicantName: 'Test User',
    applicantEmail: 'test@example.com',
    applicantPhone: '1234567890',
    applicantAddress: '123 Test St',
    experience: 'I have had pets before',
    message: 'I love pets'
};

console.log('Testing adoption request creation...');
console.log('Test data:', testData);

const request = new AdoptionRequest(testData);

request.save()
    .then(result => {
        console.log('SUCCESS! Adoption request created:', result);
        process.exit(0);
    })
    .catch(err => {
        console.error('ERROR creating adoption request:', err.message);
        console.error('Full error:', err);
        process.exit(1);
    });
