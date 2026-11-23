const controllers = require('./controllers');
const mid = require('./middleware');

const router = (app) => {
    // Authentication & Account management
    app.get('/login', mid.requiresSecure, mid.requiresLogout, controllers.Account.loginPage);
    app.post('/login', mid.requiresSecure, mid.requiresLogout, controllers.Account.login);
    app.post('/signup', mid.requiresSecure, mid.requiresLogout, controllers.Account.signup);
    app.get('/logout', mid.requiresLogin, controllers.Account.logout);
    app.get('/getAccount', mid.requiresLogin, controllers.Account.getAccount);
    app.post('/changePassword', mid.requiresLogin, controllers.Account.changePassword);
    app.post('/togglePremium', mid.requiresLogin, controllers.Account.togglePremium);

    // Rarity Trivia Game & Prompts
    app.get('/game', mid.requiresLogin, controllers.Game.gamePage);
    app.get('/getPrompts', mid.requiresLogin, controllers.Game.getPrompts);
    app.post('/createPrompt', mid.requiresLogin, controllers.Game.createPrompt);
    app.post('/submitAnswer', mid.requiresLogin, controllers.Game.submitAnswer);
    app.get('/getLeaderboard', mid.requiresLogin, controllers.Game.getLeaderboard);

    // Root & 404 handler
    app.get('/', mid.requiresSecure, mid.requiresLogout, controllers.Account.loginPage);
    app.use((req, res) => res.status(404).render('notFound', { url: req.originalUrl }));
};

module.exports = router;