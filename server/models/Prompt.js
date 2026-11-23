const mongoose = require('mongoose');
const _ = require('underscore');

const escapeTrim = (val) => _.escape(val).trim();

const AnswerOptionSchema = new mongoose.Schema({
    text: {
        type: String,
        required: true,
        trim: true,
    },
    rank: {
        type: Number,
        required: true,
        min: 1,
    },
    tier: {
        type: String,
        enum: ['Common', 'Uncommon', 'Rare', 'Abyssal'],
        required: true,
    },
    points: {
        type: Number,
        required: true,
        min: 1,
    },
    pickCount: {
        type: Number,
        default: 0,
    },
}, { _id: false });

const PromptSchema = new mongoose.Schema({
    question: {
        type: String,
        required: true,
        trim: true,
        set: escapeTrim,
    },
    category: {
        type: String,
        default: 'General',
        trim: true,
        set: escapeTrim,
    },
    isPrivate: {
        type: Boolean,
        default: false,
    },
    answers: {
        type: [AnswerOptionSchema],
        validate: [(arr) => arr.length >= 2, 'Prompts must have at least 2 valid answers'],
    },
    owner: {
        type: mongoose.Schema.ObjectId,
        required: true,
        ref: 'Account',
    },
    createdDate: {
        type: Date,
        default: Date.now,
    },
});

PromptSchema.statics.toAPI = (doc) => ({
    _id: doc._id,
    question: doc.question,
    category: doc.category,
    isPrivate: doc.isPrivate,
    answerCount: doc.answers.length,
    owner: doc.owner,
});

const PromptModel = mongoose.model('Prompt', PromptSchema);
module.exports = PromptModel;