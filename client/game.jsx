const helper = require('./helper.js');
const React = require('react');
const { useState, useEffect } = React;
const { createRoot } = require('react-dom/client');

// Component 1: Proof-of-concept Ad Banner (hidden for Premium accounts)
const AdBanner = ({ isPremium, onGoAccount }) => {
    if (isPremium) {
        return null;
    }

    return (
        <div className="adBanner">
            <div>
                <span className="adTag">Sponsored</span>{' '}
                <strong>DeepSea Gear Co.</strong> — Explore the unknown with 20% off sonar flashlights.
            </div>
            <button type="button" className="btnSecondary" onClick={onGoAccount}>
                Remove Ads (Demo)
            </button>
        </div>
    );
};

// Component 2: Selectable list of Public & Private Prompts
const PromptList = ({ prompts, selectedPrompt, onSelect }) => {
    if (prompts.length === 0) {
        return (
            <div className="card">
                <h3>Available Prompts</h3>
                <p>Loading prompts...</p>
            </div>
        );
    }

    return (
        <div className="card">
            <h3>Choose a Prompt ({prompts.length})</h3>
            <p style={{ marginBottom: '0.8rem', fontSize: '0.9rem', color: '#bcccdc' }}>
                Pick any prompt below to submit an answer.
            </p>
            {prompts.map((prompt) => {
                const isSelected = selectedPrompt && selectedPrompt._id === prompt._id;
                return (
                    <div
                        key={prompt._id}
                        className={`promptItem ${isSelected ? 'selected' : ''}`}
                        onClick={() => onSelect(prompt)}
                    >
                        <div style={{ marginBottom: '0.35rem' }}>
                            <span className="badge">{prompt.category}</span>
                            {prompt.isPrivate && <span className="badge badgePrivate">Private</span>}
                            <span className="badge">{prompt.answerCount} possible answers</span>
                        </div>
                        <strong>{prompt.question}</strong>
                    </div>
                );
            })}
        </div>
    );
};

// Component 3: Active Rarity Trivia Game Board
const GameBoard = ({ prompt, onScored }) => {
    const [answer, setAnswer] = useState('');
    const [result, setResult] = useState(null);

    useEffect(() => {
        setAnswer('');
        setResult(null);
    }, [prompt ? prompt._id : null]);

    if (!prompt) {
        return (
            <div className="card">
                <h3>Select a prompt on the left to start playing!</h3>
            </div>
        );
    }

    const handleSubmit = (e) => {
        e.preventDefault();
        helper.hideError();

        if (!answer.trim()) {
            helper.handleError('Enter an answer before submitting!');
            return;
        }

        helper.sendPost('/submitAnswer', { promptId: prompt._id, answer }, (data) => {
            if (!data.error) {
                setResult(data);
                setAnswer('');
                if (data.valid && onScored) {
                    onScored(data.account);
                }
            }
        });
    };

    return (
        <div className="card">
            <div style={{ marginBottom: '0.5rem' }}>
                <span className="badge">{prompt.category}</span>
                {prompt.isPrivate && <span className="badge badgePrivate">Private Prompt</span>}
            </div>
            <h2 style={{ marginBottom: '1rem' }}>{prompt.question}</h2>

            <form onSubmit={handleSubmit} className="stackForm">
                <label htmlFor="answerInput">Your Answer (aim for rare but valid!):</label>
                <input
                    id="answerInput"
                    type="text"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Type your answer..."
                />
                <button type="submit" className="btnPrimary">Submit Answer</button>
            </form>

            {result && result.valid && (
                <div className="resultBox">
                    <h4>Matched: {result.matchedAnswer}</h4>
                    <p>
                        Rarity Rank: <strong>#{result.rank} of {result.totalOptions}</strong>{' '}
                        (<span className="tierPill">{result.tier} Tier</span>)
                    </p>
                    <p>Points Earned: <strong>+{result.points} pts</strong></p>
                </div>
            )}

            {result && !result.valid && (
                <div className="resultBox miss">
                    <h4>Not on the list!</h4>
                    <p>{result.message}</p>
                </div>
            )}
        </div>
    );
};

// Component 4: Custom Prompt Creator (Public or Private)
const PromptCreator = ({ onCreated }) => {
    const [question, setQuestion] = useState('');
    const [category, setCategory] = useState('General');
    const [answersText, setAnswersText] = useState('');
    const [isPrivate, setIsPrivate] = useState(false);

    const handleCreate = (e) => {
        e.preventDefault();
        helper.hideError();

        helper.sendPost(
            '/createPrompt',
            { question, category, answersText, isPrivate },
            (data) => {
                if (!data.error) {
                    setQuestion('');
                    setAnswersText('');
                    setIsPrivate(false);
                    onCreated();
                }
            },
        );
    };

    return (
        <div className="card">
            <h2 style={{ marginBottom: '0.5rem' }}>Create a Custom Prompt</h2>
            <p style={{ marginBottom: '1rem', color: '#bcccdc', fontSize: '0.9rem' }}>
                List valid answers separated by commas from <strong>most common</strong> to{' '}
                <strong>rarest</strong>. Private prompts are only visible to your account.
            </p>
            <form onSubmit={handleCreate} className="stackForm">
                <label htmlFor="promptQuestion">Prompt Question:</label>
                <input
                    id="promptQuestion"
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="e.g., Name an original 151 Starter Pokemon"
                />

                <label htmlFor="promptCategory">Category:</label>
                <input
                    id="promptCategory"
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g., Gaming, Science, Geography"
                />

                <label htmlFor="promptAnswers">Valid Answers (Comma-Separated, Common to Rare):</label>
                <input
                    id="promptAnswers"
                    type="text"
                    value={answersText}
                    onChange={(e) => setAnswersText(e.target.value)}
                    placeholder="e.g., Pikachu, Charmander, Squirtle, Bulbasaur"
                />

                <label className="checkboxRow">
                    <input
                        type="checkbox"
                        checked={isPrivate}
                        onChange={(e) => setIsPrivate(e.target.checked)}
                    />
                    Make this prompt Private (visible only to me)
                </label>

                <button type="submit" className="btnPrimary">Publish Prompt</button>
            </form>
        </div>
    );
};

// Component 5: Public Leaderboard & Personal Recent Finds
const Leaderboard = ({ refreshKey }) => {
    const [topPlayers, setTopPlayers] = useState([]);
    const [recentFinds, setRecentFinds] = useState([]);

    useEffect(() => {
        const fetchBoard = async () => {
            const response = await fetch('/getLeaderboard');
            const data = await response.json();
            if (!data.error) {
                setTopPlayers(data.topPlayers || []);
                setRecentFinds(data.recentFinds || []);
            }
        };
        fetchBoard();
    }, [refreshKey]);

    return (
        <div className="gridTwo">
            <div className="card">
                <h3 style={{ marginBottom: '0.8rem' }}>Global Depth Leaderboard</h3>
                {topPlayers.map((player, idx) => (
                    <div key={player._id} className="scoreRow">
                        <span>
                            <strong>#{idx + 1} {player.username}</strong>{' '}
                            {player.isPremium && <span className="badge">PRO</span>}
                        </span>
                        <span>{player.totalScore} pts ({player.gamesPlayed} plays)</span>
                    </div>
                ))}
            </div>

            <div className="card">
                <h3 style={{ marginBottom: '0.8rem' }}>Your Recent Submissions</h3>
                {recentFinds.length === 0 ? (
                    <p>No submissions yet—play a round to record your first score!</p>
                ) : (
                    recentFinds.map((item) => (
                        <div key={item._id} className="scoreRow">
                            <span>
                                <strong>{item.submittedAnswer}</strong> ({item.tier})
                            </span>
                            <span>+{item.points} pts</span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

// Component 6: Account Stats, Premium Ad-Free Toggle & Password Change
const AccountPanel = ({ account, onAccountUpdated }) => {
    const [currentPass, setCurrentPass] = useState('');
    const [newPass, setNewPass] = useState('');
    const [newPass2, setNewPass2] = useState('');
    const [statusMsg, setStatusMsg] = useState('');

    const handleTogglePremium = () => {
        helper.hideError();
        helper.sendPost('/togglePremium', {}, (data) => {
            if (data.account) {
                onAccountUpdated(data.account);
            }
        });
    };

    const handlePasswordSubmit = (e) => {
        e.preventDefault();
        helper.hideError();
        setStatusMsg('');

        helper.sendPost('/changePassword', { currentPass, newPass, newPass2 }, (data) => {
            if (data.message) {
                setStatusMsg(data.message);
                setCurrentPass('');
                setNewPass('');
                setNewPass2('');
            }
        });
    };

    return (
        <div className="gridTwo">
            <div className="card">
                <h3 style={{ marginBottom: '0.6rem' }}>Player Profile: {account.username}</h3>
                <p style={{ marginBottom: '0.4rem' }}>Total Depth Score: <strong>{account.totalScore} pts</strong></p>
                <p style={{ marginBottom: '1rem' }}>Rounds Played: <strong>{account.gamesPlayed}</strong></p>

                <hr style={{ borderColor: '#3a506b', margin: '1rem 0' }} />

                <h4 style={{ marginBottom: '0.4rem' }}>Membership & Ads (Profit Model Demo)</h4>
                <p style={{ fontSize: '0.9rem', color: '#bcccdc', marginBottom: '0.8rem' }}>
                    Current Plan: <strong>{account.isPremium ? 'DepthRank Premium (Ad-Free)' : 'Free Tier (Ad-Supported)'}</strong>
                </p>
                <button type="button" className="btnPrimary" onClick={handleTogglePremium}>
                    {account.isPremium ? 'Switch Back to Free Tier' : 'Upgrade to Premium (Demo)'}
                </button>
            </div>

            <div className="card">
                <h3 style={{ marginBottom: '0.8rem' }}>Change Password</h3>
                <form onSubmit={handlePasswordSubmit} className="stackForm">
                    <label htmlFor="currentPass">Current Password:</label>
                    <input
                        id="currentPass"
                        type="password"
                        value={currentPass}
                        onChange={(e) => setCurrentPass(e.target.value)}
                    />
                    <label htmlFor="newPass">New Password:</label>
                    <input
                        id="newPass"
                        type="password"
                        value={newPass}
                        onChange={(e) => setNewPass(e.target.value)}
                    />
                    <label htmlFor="newPass2">Confirm New Password:</label>
                    <input
                        id="newPass2"
                        type="password"
                        value={newPass2}
                        onChange={(e) => setNewPass2(e.target.value)}
                    />
                    <button type="submit" className="btnPrimary">Update Password</button>
                </form>
                {statusMsg && <p style={{ marginTop: '0.75rem', color: '#6fffe9' }}>{statusMsg}</p>}
            </div>
        </div>
    );
};

const App = () => {
    const [activeTab, setActiveTab] = useState('play');
    const [account, setAccount] = useState({ username: '', isPremium: false, totalScore: 0, gamesPlayed: 0 });
    const [prompts, setPrompts] = useState([]);
    const [selectedPrompt, setSelectedPrompt] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);

    const loadAccount = async () => {
        const res = await fetch('/getAccount');
        const data = await res.json();
        if (data.account) {
            setAccount(data.account);
        }
    };

    const loadPrompts = async () => {
        const res = await fetch('/getPrompts');
        const data = await res.json();
        if (data.prompts) {
            setPrompts(data.prompts);
            if (data.prompts.length > 0 && !selectedPrompt) {
                setSelectedPrompt(data.prompts[0]);
            }
        }
    };

    useEffect(() => {
        loadAccount();
        loadPrompts();
    }, []);

    return (
        <div>
            <AdBanner isPremium={account.isPremium} onGoAccount={() => setActiveTab('account')} />

            <div className="tabBar">
                <button
                    type="button"
                    className={`tabBtn ${activeTab === 'play' ? 'active' : ''}`}
                    onClick={() => setActiveTab('play')}
                >
                    Play Trivia
                </button>
                <button
                    type="button"
                    className={`tabBtn ${activeTab === 'create' ? 'active' : ''}`}
                    onClick={() => setActiveTab('create')}
                >
                    Create Prompt
                </button>
                <button
                    type="button"
                    className={`tabBtn ${activeTab === 'leaderboard' ? 'active' : ''}`}
                    onClick={() => {
                        setRefreshKey((prev) => prev + 1);
                        setActiveTab('leaderboard');
                    }}
                >
                    Leaderboard
                </button>
                <button
                    type="button"
                    className={`tabBtn ${activeTab === 'account' ? 'active' : ''}`}
                    onClick={() => setActiveTab('account')}
                >
                    Account ({account.username})
                </button>
            </div>

            {activeTab === 'play' && (
                <div className="gridTwo">
                    <PromptList
                        prompts={prompts}
                        selectedPrompt={selectedPrompt}
                        onSelect={(p) => setSelectedPrompt(p)}
                    />
                    <GameBoard
                        prompt={selectedPrompt}
                        onScored={(updatedAcc) => {
                            if (updatedAcc) {
                                setAccount(updatedAcc);
                            }
                            setRefreshKey((prev) => prev + 1);
                        }}
                    />
                </div>
            )}

            {activeTab === 'create' && (
                <PromptCreator
                    onCreated={() => {
                        loadPrompts();
                        setActiveTab('play');
                    }}
                />
            )}

            {activeTab === 'leaderboard' && <Leaderboard refreshKey={refreshKey} />}

            {activeTab === 'account' && (
                <AccountPanel
                    account={account}
                    onAccountUpdated={(updatedAcc) => setAccount(updatedAcc)}
                />
            )}
        </div>
    );
};

const init = () => {
    const root = createRoot(document.getElementById('app'));
    root.render(<App />);
};

window.onload = init;