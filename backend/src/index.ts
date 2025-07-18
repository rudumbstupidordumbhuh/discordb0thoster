import express from 'express';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { exec } from 'child_process';
import psTree from 'ps-tree';
import supabase from './supabaseClient';

// --- Add User interface ---
interface User {
  id: string;
  username: string;
  passwordHash: string;
}

// --- Extend Express Request for custom properties ---
declare global {
  namespace Express {
    interface Request {
      bots?: Bot[];
      bot?: Bot;
    }
  }
}

const app = express();
const PORT = process.env.PORT || 5000;
app.use(express.json({ limit: '10mb' })); // Limit request size

// Bot storage file
const BOTS_FILE = path.join(__dirname, 'bots.json');
const USERS_FILE = path.join(__dirname, 'users.json');
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// Update Bot interface to remove creatorIp
interface Bot {
  id: string;
  name: string;
  token: string;
  code: string;
  running: boolean;
  language?: string;
  lastStarted?: string;
  uptime?: number;
  createdAt: string;
  updatedAt: string;
  userId?: string;
}

// In-memory bot process map and uptime tracking
const botProcesses: Record<string, any> = {};
const botStartTimes: Record<string, number> = {};

// Load bots from file
function loadBots(): Bot[] {
  try {
    if (!fs.existsSync(BOTS_FILE)) return [];
    const data = fs.readFileSync(BOTS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading bots:', error);
    return [];
  }
}

// Save bots to file
function saveBots(bots: Bot[]) {
  try {
    fs.writeFileSync(BOTS_FILE, JSON.stringify(bots, null, 2));
  } catch (error) {
    console.error('Error saving bots:', error);
  }
}

// Load users from file
function loadUsers(): User[] {
  try {
    if (!fs.existsSync(USERS_FILE)) return [];
    const data = fs.readFileSync(USERS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading users:', error);
    return [];
  }
}

// Save users to file
function saveUsers(users: User[]) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Error saving users:', error);
  }
}

// Update bot uptime
function updateBotUptime(botId: string) {
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
function checkBotProcess(botId: string): boolean {
  const process = botProcesses[botId];
  if (!process) return false;
  
  // Check if process is still alive
  try {
    process.kill(0); // Send signal 0 to check if process exists
    return true;
  } catch (error) {
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
        } else if (isActuallyRunning) {
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
function validateToken(token: string): boolean {
  // Accept any string with at least 3 dot-separated parts and reasonable length
  return typeof token === 'string' && token.split('.').length === 3 && token.length > 30;
}

// Sanitize code to prevent malicious execution
function sanitizeCode(code: string): string {
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

// Helper: Remove or comment out the first part of the code file (e.g., first 5 lines)
function disableBotCodeFile(botFile: string) {
  if (fs.existsSync(botFile)) {
    const lines = fs.readFileSync(botFile, 'utf-8').split('\n');
    // Comment out the first 5 lines (or all if less than 5)
    const toComment = Math.min(5, lines.length);
    for (let i = 0; i < toComment; i++) {
      if (!lines[i].startsWith('#') && !lines[i].startsWith('//')) {
        lines[i] = '// DISABLED: ' + lines[i];
      }
    }
    fs.writeFileSync(botFile, lines.join('\n'));
  }
}

// Register endpoint (Supabase)
app.post('/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const { data, error } = await supabase
      .from('users')
      .insert([{ username, password_hash: passwordHash }])
      .select('id')
      .single();
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    res.status(201).json({ success: true, userId: data.id });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Login endpoint (Supabase)
app.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, password_hash')
      .eq('username', username)
      .single();
    if (error || !user) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }
    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Auth middleware
function requireAuth(req: any, res: any, next: any) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = auth.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Clean up bots.json on server start to remove bots without a userId
function cleanBotsFile() {
  const bots = loadBots();
  const filtered = bots.filter(b => b.userId && typeof b.userId === 'string');
  if (filtered.length !== bots.length) {
    saveBots(filtered);
    console.log(`[CLEANUP] Removed ${bots.length - filtered.length} bots without userId from bots.json`);
  }
}

cleanBotsFile();

// Start status check
startStatusCheck();

// Bot management endpoints
app.get('/bots', requireAuth, (req, res) => {
  try {
    const bots = loadBots();
    // Only return bots belonging to the authenticated user
    const userBots = bots.filter(bot => bot.userId === req.user.userId);
    res.json(userBots);
  } catch (error) {
    console.error('Error fetching bots:', error);
    res.status(500).json({ error: 'Failed to fetch bots' });
  }
});

app.get('/bots/:id', requireAuth, (req, res) => {
  try {
    const bots = loadBots();
    const bot = bots.find(b => b.id === req.params.id && b.userId === req.user.userId);
    if (!bot) {
      return res.status(404).json({ error: 'Bot not found' });
    }
    res.json(bot);
  } catch (error) {
    console.error('Error fetching bot:', error);
    res.status(500).json({ error: 'Failed to fetch bot' });
  }
});

// Create bot endpoint (Supabase)
app.post('/bots', requireAuth, async (req, res) => {
  try {
    const { name, token, code, language } = req.body;
    if (!name || !token || !code) {
      return res.status(400).json({ error: 'Name, token, and code are required' });
    }
    // Insert bot into Supabase
    const { data, error } = await supabase
      .from('bots')
      .insert([{
        name,
        token, // stored securely in DB
        code,
        language: language || 'javascript',
        user_id: req.user.userId
      }])
      .select('*')
      .single();
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating bot:', error);
    res.status(500).json({ error: 'Failed to create bot' });
  }
});

app.put('/bots/:id', requireAuth, (req, res) => {
  try {
    const { name, token, code, language } = req.body;
    const bots = loadBots();
    const botIndex = bots.findIndex(b => b.id === req.params.id && b.userId === req.user.userId);
    
    if (botIndex === -1) {
      return res.status(404).json({ error: 'Bot not found' });
    }
    
    if (bots[botIndex].running) {
      return res.status(400).json({ error: 'Cannot edit running bot. Stop it first.' });
    }
    
    if (name) bots[botIndex].name = name;
    if (token) {
      if (!validateToken(token)) {
        return res.status(400).json({ error: 'Invalid bot token format' });
      }
      bots[botIndex].token = token;
    }
    if (code) bots[botIndex].code = sanitizeCode(code);
    if (language) bots[botIndex].language = language;
    
    bots[botIndex].updatedAt = new Date().toISOString();
    saveBots(bots);
    res.json(bots[botIndex]);
  } catch (error) {
    console.error('Error updating bot:', error);
    res.status(500).json({ error: 'Failed to update bot' });
  }
});

app.delete('/bots/:id', requireAuth, (req, res) => {
  try {
    const bots = loadBots();
    const botIndex = bots.findIndex(b => b.id === req.params.id && b.userId === req.user.userId);
    
    if (botIndex === -1) {
      return res.status(404).json({ error: 'Bot not found' });
    }
    
    const bot = bots[botIndex];
    
    // Stop the bot if it's running
    if (bot.running) {
      const process = botProcesses[bot.id];
      if (process) {
        try {
          process.kill('SIGTERM');
        } catch (error) {
          console.error('Error killing bot process:', error);
        }
        delete botProcesses[bot.id];
        delete botStartTimes[bot.id];
      }
    }
    
    // Remove bot file if it exists
    const botFile = path.join(__dirname, `${bot.id}.py`);
    if (fs.existsSync(botFile)) {
      fs.unlinkSync(botFile);
    }
    
    bots.splice(botIndex, 1);
    saveBots(bots);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting bot:', error);
    res.status(500).json({ error: 'Failed to delete bot' });
  }
});

app.post('/bots/:id/run', requireAuth, (req, res) => {
  try {
    const bots = loadBots();
    const bot = bots.find(b => b.id === req.params.id && b.userId === req.user.userId);
    
    if (!bot) {
      return res.status(404).json({ error: 'Bot not found' });
    }
    
    if (bot.running) {
      return res.status(400).json({ error: 'Bot is already running' });
    }
    
    // Check if process is actually running
    if (checkBotProcess(bot.id)) {
      bot.running = true;
      saveBots(bots);
      return res.json({ success: true, message: 'Bot is already running' });
    }
    
    // Create bot file
    const botFile = path.join(__dirname, `${bot.id}.py`);
    const botCode = bot.code.replace('place ur bot token here', bot.token);
    fs.writeFileSync(botFile, botCode);
    
    // Start bot process
    const process = spawn('python', [botFile], {
      detached: false,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    botProcesses[bot.id] = process;
    botStartTimes[bot.id] = Date.now();
    
    process.stdout.on('data', (data) => {
      console.log(`Bot ${bot.name} (${bot.id}) stdout:`, data.toString());
    });
    
    process.stderr.on('data', (data) => {
      console.error(`Bot ${bot.name} (${bot.id}) stderr:`, data.toString());
    });
    
    process.on('close', (code) => {
      console.log(`Bot ${bot.name} (${bot.id}) process exited with code ${code}`);
      delete botProcesses[bot.id];
      delete botStartTimes[bot.id];
      
      // Update bot status
      const updatedBots = loadBots();
      const updatedBot = updatedBots.find(b => b.id === bot.id);
      if (updatedBot && updatedBot.running) {
        updatedBot.running = false;
        saveBots(updatedBots);
      }
    });
    
    // Update bot status
    bot.running = true;
    bot.lastStarted = new Date().toISOString();
    bot.uptime = 0;
    saveBots(bots);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error running bot:', error);
    res.status(500).json({ error: 'Failed to run bot' });
  }
});

app.post('/bots/:id/stop', requireAuth, async (req, res) => {
  try {
    const bots = loadBots();
    const bot = bots.find(b => b.id === req.params.id && b.userId === req.user.userId);

    if (!bot) {
      return res.status(404).json({ error: 'Bot not found' });
    }

    // Create a stop file as a signal
    const stopFile = path.join(__dirname, `${bot.id}.stop`);
    fs.writeFileSync(stopFile, 'stop');

    // Mark as stopping (optional)
    bot.running = false;
    saveBots(bots);

    res.json({ success: true, message: 'Stop signal sent to bot.' });
  } catch (error) {
    console.error('Error stopping bot (stop file method):', error);
    res.status(500).json({ error: 'Failed to stop bot (stop file method)' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});