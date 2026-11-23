const models = require('../models');

const { Prompt, Score, Account } = models;

const buildAnswerOptions = (rawAnswers) => {
    const total = rawAnswers.length;
    return rawAnswers.map((text, index) => {
        const rank = index + 1;
        const ratio = rank / total;
        let tier = 'Common';
        if (ratio > 0.75) {
            tier = 'Abyssal';
        } else if (ratio > 0.5) {
            tier = 'Rare';
        } else if (ratio > 0.25) {
            tier = 'Uncommon';
        }
        const points = Math.round((rank / total) * 100);
        return {
            text: text.trim(),
            rank,
            tier,
            points,
            pickCount: 0,
        };
    });
};

const seedStarterPrompts = async (ownerId) => {
    const starters = [
        {
            question: 'Name a planet in our solar system',
            category: 'Astronomy',
            isPrivate: false,
            answers: buildAnswerOptions([
                'Earth', 'Mars', 'Jupiter', 'Saturn', 'Venus', 'Mercury', 'Uranus', 'Neptune',
            ]),
            owner: ownerId,
        },
        {
            question: 'Name a standard chess piece',
            category: 'Games',
            isPrivate: false,
            answers: buildAnswerOptions([
                'Pawn', 'Queen', 'King', 'Knight', 'Rook', 'Bishop',
            ]),
            owner: ownerId,
        },
        {
            question: 'Name a color in the classic ROYGBIV rainbow',
            category: 'General',
            isPrivate: false,
            answers: buildAnswerOptions([
                'Red', 'Blue', 'Green', 'Yellow', 'Orange', 'Violet', 'Indigo',
            ]),
            owner: ownerId,
        },
        {
            question: 'Name a noble gas on the periodic table',
            category: 'Science',
            isPrivate: false,
            answers: buildAnswerOptions([
                'Helium', 'Neon', 'Argon', 'Krypton', 'Xenon', 'Radon', 'Oganesson',
            ]),
            owner: ownerId,
        },
    ];

    await Prompt.insertMany(starters);
};

const gamePage = (req, res) => res.render('app');

const getPrompts = async (req, res) => {
    try {
        const publicCount = await Prompt.countDocuments({ isPrivate: false }).exec();
        if (publicCount === 0) {
            await seedStarterPrompts(req.session.account._id);
        }

        const query = {
            $or: [
                { isPrivate: false },
                { owner: req.session.account._id },
            ],
        };

        const docs = await Prompt.find(query).sort({ createdDate: -1 }).lean().exec();
        const prompts = docs.map((doc) => ({
            _id: doc._id,
            question: doc.question,
            category: doc.category,
            isPrivate: doc.isPrivate,
            answerCount: doc.answers.length,
            isOwner: `${doc.owner}` === `${req.session.account._id}`,
        }));

        return res.json({ prompts });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ error: 'Error retrieving prompts!' });
    }
};

const createPrompt = async (req, res) => {
    const question = req.body.question ? `${req.body.question}`.trim() : '';
    const category = req.body.category ? `${req.body.category}`.trim() : 'General';
    const answersText = req.body.answersText ? `${req.body.answersText}` : '';
    const isPrivate = Boolean(req.body.isPrivate);

    if (!question || !answersText) {
        return res.status(400).json({ error: 'Question and answers are required!' });
    }

    const parsedAnswers = answersText
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0);

    const uniqueAnswers = [...new Set(parsedAnswers)];

    if (uniqueAnswers.length < 3) {
        return res.status(400).json({ error: 'Enter at least 3 comma-separated answers (most common to rarest)!' });
    }

    try {
        const newPrompt = new Prompt({
            question,
            category: category || 'General',
            isPrivate,
            answers: buildAnswerOptions(uniqueAnswers),
            owner: req.session.account._id,
        });

        await newPrompt.save();
        return res.status(201).json({ prompt: Prompt.toAPI(newPrompt) });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ error: 'Error creating prompt!' });
    }
};

const submitAnswer = async (req, res) => {
    const promptId = req.body.promptId ? `${req.body.promptId}`.trim() : '';
    const rawAnswer = req.body.answer ? `${req.body.answer}`.trim() : '';

    if (!promptId || !rawAnswer) {
        return res.status(400).json({ error: 'Please select a prompt and enter an answer!' });
    }

    try {
        const prompt = await Prompt.findById(promptId).exec();
        if (!prompt) {
            return res.status(404).json({ error: 'Prompt not found!' });
        }

        if (prompt.isPrivate && `${prompt.owner}` !== `${req.session.account._id}`) {
            return res.status(403).json({ error: 'You do not have access to this private prompt!' });
        }

        const normalized = rawAnswer.toLowerCase();
        const matchedOption = prompt.answers.find(
            (opt) => opt.text.toLowerCase() === normalized,
        );

        if (!matchedOption) {
            return res.json({
                valid: false,
                submittedAnswer: rawAnswer,
                message: `"${rawAnswer}" did not match any valid answers for this prompt. Try again!`,
            });
        }

        matchedOption.pickCount += 1;
        await prompt.save();

        const newScore = new Score({
            owner: req.session.account._id,
            username: req.session.account.username,
            promptId: prompt._id,
            question: prompt.question,
            submittedAnswer: matchedOption.text,
            tier: matchedOption.tier,
            points: matchedOption.points,
        });
        await newScore.save();

        const updatedAccount = await Account.findByIdAndUpdate(
            req.session.account._id,
            { $inc: { totalScore: matchedOption.points, gamesPlayed: 1 } },
            { new: true },
        ).exec();

        if (updatedAccount) {
            req.session.account = Account.toAPI(updatedAccount);
        }

        return res.status(201).json({
            valid: true,
            matchedAnswer: matchedOption.text,
            rank: matchedOption.rank,
            totalOptions: prompt.answers.length,
            tier: matchedOption.tier,
            points: matchedOption.points,
            pickCount: matchedOption.pickCount,
            account: req.session.account,
        });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ error: 'Error evaluating answer!' });
    }
};

const getLeaderboard = async (req, res) => {
    try {
        const topPlayers = await Account.find({})
            .sort({ totalScore: -1 })
            .limit(10)
            .select('username totalScore gamesPlayed isPremium')
            .lean()
            .exec();

        const recentFinds = await Score.find({ owner: req.session.account._id })
            .sort({ createdDate: -1 })
            .limit(8)
            .select('question submittedAnswer tier points createdDate')
            .lean()
            .exec();

        return res.json({ topPlayers, recentFinds });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ error: 'Error loading leaderboard!' });
    }
};

module.exports = {
    gamePage,
    getPrompts,
    createPrompt,
    submitAnswer,
    getLeaderboard,
};