"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
app.use(express_1.default.json({ limit: '10mb' })); // Limit request size
// Bot storage file
const BOTS_FILE = path_1.default.join(__dirname, 'bots.json');
const USERS_FILE = path_1.default.join(__dirname, 'users.json');
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';
// In-memory bot process map and uptime tracking
const botProcesses = {};
const botStartTimes = {};
// Load bots from file
function loadBots() {
    try {
        if (!fs_1.default.existsSync(BOTS_FILE))
            return [];
        const data = fs_1.default.readFileSync(BOTS_FILE, 'utf-8');
        return JSON.parse(data);
    }
    catch (error) {
        console.error('Error loading bots:', error);
        return [];
    }
}
// Save bots to file
function saveBots(bots) {
    try {
        fs_1.default.writeFileSync(BOTS_FILE, JSON.stringify(bots, null, 2));
    }
    catch (error) {
        console.error('Error saving bots:', error);
    }
}
// Load users from file
function loadUsers() {
    try {
        if (!fs_1.default.existsSync(USERS_FILE))
            return [];
        const data = fs_1.default.readFileSync(USERS_FILE, 'utf-8');
        return JSON.parse(data);
    }
    catch (error) {
        console.error('Error loading users:', error);
        return [];
    }
}
// Save users to file
function saveUsers(users) {
    try {
        fs_1.default.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    }
    catch (error) {
        console.error('Error saving users:', error);
    }
}
// Update bot uptime
function updateBotUptime(botId) {
    if (botStartTimes[botId]) {
        const uptime = Math.floor((Date.now() - botStartTimes[botId]) / 1000);
        const bots = loadBots();
        const bot = bots.find(b => b.id === botId);
        if (bot) {
            bot.uptime = uptime;
            saveBots(bots);
        }
    }
}
// Check if bot process is actually running
function checkBotProcess(botId) {
    const process = botProcesses[botId];
    if (!process)
        return false;
    // Check if process is still alive
    try {
        process.kill(0); // Send signal 0 to check if process exists
        return true;
    }
    catch (error) {
        // Process is dead, clean up
        delete botProcesses[botId];
        delete botStartTimes[botId];
        // Update bot status
        const bots = loadBots();
        const bot = bots.find(b => b.id === botId);
        if (bot && bot.running) {
            bot.running = false;
            saveBots(bots);
            console.log(`Bot ${bot.name} (${botId}) process died, status updated`);
        }
        return false;
    }
}
// Periodic status check
function startStatusCheck() {
    setInterval(() => {
        const bots = loadBots();
        let updated = false;
        bots.forEach(bot => {
            if (bot.running) {
                const isActuallyRunning = checkBotProcess(bot.id);
                if (!isActuallyRunning && bot.running) {
                    bot.running = false;
                    updated = true;
                    console.log(`Bot ${bot.name} (${bot.id}) status corrected - not actually running`);
                }
                else if (isActuallyRunning) {
                    // Update uptime for running bots
                    updateBotUptime(bot.id);
                }
            }
        });
        if (updated) {
            saveBots(bots);
        }
    }, 10000); // Check every 10 seconds
}
// Validate bot token format
function validateToken(token) {
    // Accept any string with at least 3 dot-separated parts and reasonable length
    return typeof token === 'string' && token.split('.').length === 3 && token.length > 30;
}
// Sanitize code to prevent malicious execution
function sanitizeCode(code) {
    // Remove potential dangerous patterns
    const dangerousPatterns = [
        /require\s*\(\s*['"]fs['"]\s*\)/g,
        /require\s*\(\s*['"]child_process['"]\s*\)/g,
        /require\s*\(\s*['"]path['"]\s*\)/g,
        /process\.exit/g,
        /process\.kill/g,
    ];
    let sanitized = code;
    dangerousPatterns.forEach(pattern => {
        sanitized = sanitized.replace(pattern, '// BLOCKED: ' + pattern.source);
    });
    return sanitized;
}
// Register endpoint
app.post('/auth/register', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }
        const users = loadUsers();
        if (users.find(u => u.username === username)) {
            return res.status(400).json({ error: 'Username already exists' });
        }
        const passwordHash = yield bcryptjs_1.default.hash(password, 10);
        const id = (0, uuid_1.v4)();
        const newUser = { id, username, passwordHash };
        users.push(newUser);
        saveUsers(users);
        res.status(201).json({ success: true });
    }
    catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'Failed to register user' });
    }
}));
// Login endpoint
app.post('/auth/login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }
        const users = loadUsers();
        const user = users.find(u => u.username === username);
        if (!user) {
            return res.status(400).json({ error: 'Invalid username or password' });
        }
        const valid = yield bcryptjs_1.default.compare(password, user.passwordHash);
        if (!valid) {
            return res.status(400).json({ error: 'Invalid username or password' });
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token });
    }
    catch (error) {
        console.error('Error logging in:', error);
        res.status(500).json({ error: 'Failed to login' });
    }
}));
// Auth middleware
function requireAuth(req, res, next) {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = auth.slice(7);
    try {
        const payload = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.user = payload;
        next();
    }
    catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}
// Helper to get request IP
function getRequestIp(req) {
    var _a, _b;
    return ((_b = (_a = req.headers['x-forwarded-for']) === null || _a === void 0 ? void 0 : _a.split(',')[0]) === null || _b === void 0 ? void 0 : _b.trim()) || req.socket.remoteAddress;
}
// List all bots (only bots from this IP)
app.get('/bots', (req, res) => {
    try {
        const ip = getRequestIp(req);
        const bots = loadBots()
            .filter((bot) => bot.creatorIp === ip)
            .map((_a) => {
            var { token } = _a, rest = __rest(_a, ["token"]);
            // Verify running status and update uptime for running bots
            if (rest.running) {
                const isActuallyRunning = checkBotProcess(rest.id);
                if (!isActuallyRunning && rest.running) {
                    rest.running = false;
                    console.log(`Bot ${rest.name} (${rest.id}) status corrected in GET request`);
                }
                else if (isActuallyRunning && botStartTimes[rest.id]) {
                    rest.uptime = Math.floor((Date.now() - botStartTimes[rest.id]) / 1000);
                }
            }
            return rest;
        });
        res.json(bots);
    }
    catch (error) {
        console.error('Error fetching bots:', error);
        res.status(500).json({ error: 'Failed to fetch bots' });
    }
});
// Create a new bot (associate with IP)
app.post('/bots', (req, res) => {
    try {
        const { name, token, code, language } = req.body;
        const ip = getRequestIp(req);
        // Validation
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Bot name is required' });
        }
        if (!token || !validateToken(token)) {
            return res.status(400).json({ error: 'Valid Discord bot token is required' });
        }
        if (!code || !code.trim()) {
            return res.status(400).json({ error: 'Bot code is required' });
        }
        const bots = loadBots();
        const id = (0, uuid_1.v4)();
        const now = new Date().toISOString();
        const newBot = {
            id,
            name: name.trim(),
            token,
            code: sanitizeCode(code),
            running: false,
            language: language || 'javascript',
            createdAt: now,
            updatedAt: now,
            creatorIp: ip
        };
        bots.push(newBot);
        saveBots(bots);
        console.log(`Bot created: ${name} (${id}) by IP ${ip}`);
        res.status(201).json({
            id,
            name: newBot.name,
            running: false,
            language: newBot.language,
            createdAt: newBot.createdAt
        });
    }
    catch (error) {
        console.error('Error creating bot:', error);
        res.status(500).json({ error: 'Failed to create bot' });
    }
});
// Middleware to check bot ownership by IP
function requireBotOwnerByIp(req, res, next) {
    const ip = getRequestIp(req);
    const { id } = req.params;
    const bots = loadBots();
    const bot = bots.find((b) => b.id === id);
    if (!bot) {
        return res.status(404).json({ error: 'Bot not found' });
    }
    if (bot.creatorIp !== ip) {
        return res.status(403).json({ error: 'Forbidden: Not your bot' });
    }
    req.bot = bot;
    req.bots = bots;
    next();
}
// Update bot (only if owner)
app.put('/bots/:id', requireBotOwnerByIp, (req, res) => {
    try {
        const { id } = req.params;
        const { name, token, code, language } = req.body;
        const bots = req.bots;
        const bot = req.bot;
        // Validation
        if (name && !name.trim()) {
            return res.status(400).json({ error: 'Bot name cannot be empty' });
        }
        if (token && !validateToken(token)) {
            return res.status(400).json({ error: 'Invalid Discord bot token' });
        }
        if (code && !code.trim()) {
            return res.status(400).json({ error: 'Bot code cannot be empty' });
        }
        // Update fields
        if (name)
            bot.name = name.trim();
        if (token)
            bot.token = token;
        if (code)
            bot.code = sanitizeCode(code);
        if (language)
            bot.language = language;
        bot.updatedAt = new Date().toISOString();
        saveBots(bots);
        console.log(`Bot updated: ${bot.name} (${id}) by IP ${bot.creatorIp}`);
        res.json({
            id,
            name: bot.name,
            running: bot.running,
            language: bot.language,
            updatedAt: bot.updatedAt
        });
    }
    catch (error) {
        console.error('Error updating bot:', error);
        res.status(500).json({ error: 'Failed to update bot' });
    }
});
// Delete bot (only if owner)
app.delete('/bots/:id', requireBotOwnerByIp, (req, res) => {
    try {
        const { id } = req.params;
        let bots = req.bots;
        const bot = req.bot;
        if (bot.running) {
            return res.status(400).json({ error: 'Stop the bot before deleting' });
        }
        // Clean up files
        const lang = bot.language || 'javascript';
        const extMap = {
            javascript: 'js', typescript: 'ts', python: 'py', java: 'java',
            csharp: 'cs', go: 'go', ruby: 'rb', php: 'php', bash: 'sh'
        };
        const ext = extMap[lang] || 'js';
        const botFile = path_1.default.join(__dirname, `bot_${id}.${ext}`);
        if (fs_1.default.existsSync(botFile)) {
            fs_1.default.unlinkSync(botFile);
        }
        // Remove from memory
        delete botProcesses[id];
        delete botStartTimes[id];
        bots = bots.filter((b) => b.id !== id);
        saveBots(bots);
        console.log(`Bot deleted: ${bot.name} (${id}) by IP ${bot.creatorIp}`);
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error deleting bot:', error);
        res.status(500).json({ error: 'Failed to delete bot' });
    }
});
// Start bot (only if owner)
app.post('/bots/:id/start', requireBotOwnerByIp, (req, res) => {
    try {
        const { id } = req.params;
        const bots = loadBots();
        const bot = bots.find((b) => b.id === id);
        if (!bot) {
            return res.status(404).json({ error: 'Bot not found' });
        }
        if (bot.running) {
            return res.status(400).json({ error: 'Bot is already running' });
        }
        // Determine file extension and interpreter
        const lang = bot.language || 'javascript';
        const extMap = {
            javascript: 'js', typescript: 'ts', python: 'py', java: 'java',
            csharp: 'cs', go: 'go', ruby: 'rb', php: 'php', bash: 'sh'
        };
        const interpreterMap = {
            javascript: ['node'],
            typescript: ['npx', 'ts-node'],
            python: ['python'],
            java: ['java'],
            csharp: ['dotnet', 'run'],
            go: ['go', 'run'],
            ruby: ['ruby'],
            php: ['php'],
            bash: ['bash'],
        };
        const ext = extMap[lang] || 'js';
        const botFile = path_1.default.join(__dirname, `bot_${id}.${ext}`);
        // Replace token placeholders with actual token
        let codeWithToken = bot.code;
        // Common token placeholder patterns
        const tokenPatterns = [
            /process\.env\.BOT_TOKEN/g,
            /['"]?place ur bot token['"]?/gi,
            /['"]?put ur bot token here['"]?/gi,
            /['"]?YOUR_BOT_TOKEN['"]?/gi,
            /['"]?<BOT_TOKEN>['"]?/gi,
            /['"]?BOT_TOKEN['"]?/gi,
            /['"]?your_token_here['"]?/gi,
            /['"]?your-bot-token['"]?/gi,
        ];
        // Replace all token placeholders
        tokenPatterns.forEach(pattern => {
            codeWithToken = codeWithToken.replace(pattern, `'${bot.token}'`);
        });
        // Language-specific token replacement
        if (lang === 'python') {
            // Python-specific patterns
            codeWithToken = codeWithToken.replace(/bot\.run\(['\"](.*?)['\"]\)/g, `bot.run('${bot.token}')`);
            codeWithToken = codeWithToken.replace(/client\.run\(['\"](.*?)['\"]\)/g, `client.run('${bot.token}')`);
            codeWithToken = codeWithToken.replace(/TOKEN\s*=\s*['\"](.*?)['\"]/g, `TOKEN = '${bot.token}'`);
        }
        else if (lang === 'javascript' || lang === 'typescript') {
            // JavaScript/TypeScript patterns
            codeWithToken = codeWithToken.replace(/client\.login\(['\"](.*?)['\"]\)/g, `client.login('${bot.token}')`);
            codeWithToken = codeWithToken.replace(/bot\.login\(['\"](.*?)['\"]\)/g, `bot.login('${bot.token}')`);
        }
        // Write the code with replaced token to file
        fs_1.default.writeFileSync(botFile, codeWithToken);
        // Debug: Log the code that will be run (with token inserted)
        console.log('--- Bot code to be executed for', bot.name, '(' + id + ') ---');
        console.log(codeWithToken);
        console.log('--- End of bot code ---');
        // Start bot process with proper error handling
        let child;
        const startProcess = () => {
            if (lang === 'java') {
                // For Java, compile first then run
                const compile = (0, child_process_1.spawn)('javac', [botFile]);
                compile.on('close', (code) => {
                    if (code === 0) {
                        const run = (0, child_process_1.spawn)('java', [`bot_${id}`], {
                            stdio: ['pipe', 'pipe', 'pipe'],
                            cwd: __dirname
                        });
                        botProcesses[id] = run;
                        botStartTimes[id] = Date.now();
                        // Handle process events
                        run.on('error', (err) => {
                            console.error(`Bot ${bot.name} process error:`, err);
                            bot.running = false;
                            saveBots(bots);
                        });
                        run.on('exit', (code) => {
                            console.log(`Bot ${bot.name} exited with code ${code}`);
                            bot.running = false;
                            delete botProcesses[id];
                            delete botStartTimes[id];
                            saveBots(bots);
                        });
                    }
                    else {
                        console.error(`Failed to compile Java bot ${bot.name}`);
                        bot.running = false;
                        saveBots(bots);
                    }
                });
                child = compile;
            }
            else if (lang === 'csharp') {
                child = (0, child_process_1.spawn)('dotnet', ['run', botFile], {
                    stdio: ['pipe', 'pipe', 'pipe'],
                    cwd: __dirname
                });
            }
            else {
                const interpreter = interpreterMap[lang] || ['node'];
                child = (0, child_process_1.spawn)(interpreter[0], interpreter.slice(1).concat([botFile]), {
                    stdio: ['pipe', 'pipe', 'pipe'],
                    cwd: __dirname
                });
            }
            if (child) {
                botProcesses[id] = child;
                botStartTimes[id] = Date.now();
                // Handle process events
                child.on('error', (err) => {
                    console.error(`Bot ${bot.name} process error:`, err);
                    bot.running = false;
                    saveBots(bots);
                });
                child.on('exit', (code) => {
                    console.log(`Bot ${bot.name} exited with code ${code}`);
                    bot.running = false;
                    delete botProcesses[id];
                    delete botStartTimes[id];
                    saveBots(bots);
                });
                // Log stdout and stderr for debugging
                if (child.stdout) {
                    child.stdout.on('data', (data) => {
                        console.log(`Bot ${bot.name} stdout:`, data.toString());
                    });
                }
                if (child.stderr) {
                    child.stderr.on('data', (data) => {
                        console.error(`Bot ${bot.name} stderr:`, data.toString());
                    });
                }
            }
        };
        startProcess();
        res.json({ success: true, message: 'Bot started', bot: { id, name: bot.name, running: true } });
    }
    catch (error) {
        console.error('Error starting bot:', error);
        res.status(500).json({ error: 'Failed to start bot' });
    }
});
// Stop bot (only if owner)
app.post('/bots/:id/stop', requireBotOwnerByIp, (req, res) => {
    try {
        const { id } = req.params;
        const bots = loadBots();
        const bot = bots.find((b) => b.id === id);
        if (!bot) {
            return res.status(404).json({ error: 'Bot not found' });
        }
        if (!bot.running) {
            return res.status(400).json({ error: 'Bot is not running' });
        }
        // Kill the process
        const process = botProcesses[id];
        if (process) {
            process.kill();
            delete botProcesses[id];
            delete botStartTimes[id];
            bot.running = false;
            bot.updatedAt = new Date().toISOString();
            saveBots(bots);
            console.log(`Bot ${bot.name} (${id}) stopped by IP ${bot.creatorIp}`);
            res.json({ success: true, message: 'Bot stopped' });
        }
        else {
            res.status(500).json({ error: 'Bot process not found' });
        }
    }
    catch (error) {
        console.error('Error stopping bot:', error);
        res.status(500).json({ error: 'Failed to stop bot' });
    }
});
// Fix unterminated template literal (remove stray backtick)
// Find and remove any console.error(` ... ) with a stray backtick
app.listen(PORT, () => {
    console.log(`🚀 Discord Bot Hoster backend running on port ${PORT}`);
});
