const mongoose = require('mongoose');

const ScoreSchema = new mongoose.Schema({
    owner: {
        type: mongoose.Schema.ObjectId,
        required: true,
        ref: 'Account',
    },
    username: {
        type: String,
        required: true,
    },
    promptId: {
        type: mongoose.Schema.ObjectId,
        required: true,
        ref: 'Prompt',
    },
    question: {
        type: String,
        required: true,
    },
    submittedAnswer: {
        type: String,
        required: true,
    },
    tier: {
        type: String,
        required: true,
    },
    points: {
        type: Number,
        required: true,
    },
    createdDate: {
        type: Date,
        default: Date.now,
    },
});

const ScoreModel = mongoose.model('Score', ScoreSchema);
module.exports = ScoreModel;