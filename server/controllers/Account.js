const models = require('../models');

const { Account } = models;

const loginPage = (req, res) => res.render('login');

const logout = (req, res) => {
    req.session.destroy();
    return res.redirect('/');
};

const login = (req, res) => {
    const username = req.body.username ? `${req.body.username}`.trim() : '';
    const pass = req.body.pass ? `${req.body.pass}` : '';

    if (!username || !pass) {
        return res.status(400).json({ error: 'All fields are required!' });
    }

    return Account.authenticate(username, pass, (err, account) => {
        if (err || !account) {
            return res.status(401).json({ error: 'Wrong username or password!' });
        }

        req.session.account = Account.toAPI(account);
        return res.json({ redirect: '/game' });
    });
};

const signup = async (req, res) => {
    const username = req.body.username ? `${req.body.username}`.trim() : '';
    const pass = req.body.pass ? `${req.body.pass}` : '';
    const pass2 = req.body.pass2 ? `${req.body.pass2}` : '';

    if (!username || !pass || !pass2) {
        return res.status(400).json({ error: 'All fields are required!' });
    }

    if (pass !== pass2) {
        return res.status(400).json({ error: 'Passwords do not match!' });
    }

    try {
        const hash = await Account.generateHash(pass);
        const newAccount = new Account({ username, password: hash });
        await newAccount.save();
        req.session.account = Account.toAPI(newAccount);
        return res.status(201).json({ redirect: '/game' });
    } catch (err) {
        console.log(err);
        if (err.code === 11000) {
            return res.status(400).json({ error: 'Username already in use!' });
        }
        return res.status(500).json({ error: 'An error occurred!' });
    }
};

const getAccount = async (req, res) => {
    try {
        const doc = await Account.findById(req.session.account._id).exec();
        if (!doc) {
            return res.status(404).json({ error: 'Account not found!' });
        }
        req.session.account = Account.toAPI(doc);
        return res.json({ account: req.session.account });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ error: 'Error retrieving account!' });
    }
};

const changePassword = async (req, res) => {
    const currentPass = req.body.currentPass ? `${req.body.currentPass}` : '';
    const newPass = req.body.newPass ? `${req.body.newPass}` : '';
    const newPass2 = req.body.newPass2 ? `${req.body.newPass2}` : '';

    if (!currentPass || !newPass || !newPass2) {
        return res.status(400).json({ error: 'All password fields are required!' });
    }

    if (newPass !== newPass2) {
        return res.status(400).json({ error: 'New passwords do not match!' });
    }

    return Account.authenticate(req.session.account.username, currentPass, async (err, account) => {
        if (err || !account) {
            return res.status(401).json({ error: 'Current password is incorrect!' });
        }

        try {
            account.password = await Account.generateHash(newPass);
            await account.save();
            return res.json({ message: 'Password updated successfully!' });
        } catch (saveErr) {
            console.log(saveErr);
            return res.status(500).json({ error: 'Could not update password!' });
        }
    });
};

const togglePremium = async (req, res) => {
    try {
        const doc = await Account.findById(req.session.account._id).exec();
        if (!doc) {
            return res.status(404).json({ error: 'Account not found!' });
        }

        doc.isPremium = !doc.isPremium;
        await doc.save();

        req.session.account = Account.toAPI(doc);
        return res.json({ account: req.session.account });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ error: 'Could not toggle premium status!' });
    }
};

module.exports = {
    loginPage,
    login,
    logout,
    signup,
    getAccount,
    changePassword,
    togglePremium,
};