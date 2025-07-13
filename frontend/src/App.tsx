import React, { useEffect, useState } from 'react';
import './App.css';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';

interface Bot {
  id: string;
  name: string;
  running: boolean;
  language?: string;
  lastStarted?: string;
  uptime?: number;
  token?: string;
  code?: string;
}

// Helper: get default code template
const getDefaultCode = (language: string) => {
  const templates: Record<string, string> = {
    javascript: `// Discord Bot Example (JavaScript)
const { Client, GatewayIntentBits } = require('discord.js');
const client = new Client({ 
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] 
});

client.on('ready', () => {
  console.log(\`Logged in as \${client.user.tag}!\`);
});

client.on('messageCreate', message => {
  if (message.content === '!ping') {
    message.reply('Pong! 🏓');
  }
});

// Your bot token will be automatically inserted here
client.login('place ur bot token here');`,
    python: `# Discord Bot Example (Python)
import discord
from discord.ext import commands

intents = discord.Intents.default()
intents.message_content = True
bot = commands.Bot(command_prefix='!', intents=intents)

@bot.event
async def on_ready():
    print(f'Logged in as {bot.user}!')

@bot.command()
async def ping(ctx):
    await ctx.send('Pong! 🏓')

# Your bot token will be automatically inserted here
bot.run('place ur bot token here')`,
    typescript: `// Discord Bot Example (TypeScript)
import { Client, GatewayIntentBits, Message } from 'discord.js';

const client = new Client({ 
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] 
});

client.on('ready', () => {
  console.log(\`Logged in as \${client.user?.tag}!\`);
});

client.on('messageCreate', (message: Message) => {
  if (message.content === '!ping') {
    message.reply('Pong! 🏓');
  }
});

// Your bot token will be automatically inserted here
client.login('place ur bot token here');`,
    java: `// Discord Bot Example (Java)
import net.dv8tion.jda.api.JDABuilder;
import net.dv8tion.jda.api.entities.Message;
import net.dv8tion.jda.api.events.message.MessageReceivedEvent;
import net.dv8tion.jda.api.hooks.ListenerAdapter;
import net.dv8tion.jda.api.requests.GatewayIntent;

public class Bot extends ListenerAdapter {
    public static void main(String[] args) throws Exception {
        JDABuilder builder = JDABuilder.createDefault(
            "YOUR_BOT_TOKEN" // Replace with your bot token
        );
        builder.addEventListeners(new Bot());
        builder.build();
        System.out.println("Bot is ready!");
    }

    @Override
    public void onMessageReceived(MessageReceivedEvent event) {
        if (event.getMessage().getContentRaw().equals("!ping")) {
            event.getMessage().reply("Pong! 🏓").queue();
        }
    }
}`,
    csharp: `// Discord Bot Example (C#)
using Discord;
using Discord.Commands;
using Discord.WebSocket;
using System;
using System.Threading.Tasks;

class Program
{
    static void Main(string[] args)
    {
        new Bot().RunBotAsync().GetAwaiter().GetResult();
    }
}

class Bot
{
    private DiscordSocketClient _client;
    private CommandService _commands;

    public Bot()
    {
        _client = new DiscordSocketClient();
        _commands = new CommandService();

        _client.Log += Log;
        _client.Ready += OnReady;
        _client.MessageReceived += OnMessageReceived;

        _client.LoginAsync(TokenType.Bot, "YOUR_BOT_TOKEN").Wait(); // Replace with your bot token
        _client.StartAsync().Wait();
    }

    private Task Log(LogMessage msg)
    {
        Console.WriteLine(msg.ToString());
        return Task.CompletedTask;
    }

    private async Task OnReady()
    {
        Console.WriteLine($"Logged in as {_client.CurrentUser.Username}!");
    }

    private async Task OnMessageReceived(SocketMessage arg)
    {
        var message = arg as SocketUserMessage;
        if (message == null) return;

        int argPos = 0;
        if (!message.HasStringPrefix("!", ref argPos)) return;

        var context = new SocketCommandContext(_client, message);
        await _commands.ExecuteAsync(context, argPos, _serviceProvider);
    }
}`,
    go: `// Discord Bot Example (Go)
package main

import (
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/bwmarrin/discordgo"
)

func main() {
	dg, err := discordgo.New("YOUR_BOT_TOKEN") // Replace with your bot token
	if err != nil {
		log.Fatalf("Error creating Discord session: %s", err)
	}

	dg.AddHandler(func(s *discordgo.Session, i *discordgo.InteractionCreate) {
		if i.Type == discordgo.InteractionApplicationCommand || i.Type == discordgo.InteractionMessageComponent {
			if i.Data.Name == "ping" {
				s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
					Type: discordgo.InteractionResponseChannelMessageWithSource,
					Data: &discordgo.InteractionResponseData{
						Content: "Pong! 🏓",
					},
				})
			}
		}
	})

	dg.Identify.Intents = discordgo.IntentGuildMessages

	err = dg.Open()
	if err != nil {
		log.Fatalf("Error opening connection to Discord: %s", err)
	}
	fmt.Println("Bot is now running. Press CTRL-C to exit.")

	sc := make(chan os.Signal, 1)
	signal.Notify(sc, syscall.SIGINT, syscall.SIGTERM, os.Interrupt)
	<-sc

	dg.Close()
}`,
    ruby: `# Discord Bot Example (Ruby)
require 'discordrb'

bot = Discordrb::Commands::CommandBot.new(
  token: 'YOUR_BOT_TOKEN', # Replace with your bot token
  client_id: 'YOUR_CLIENT_ID', # Replace with your bot's client ID
  prefix: '!'
)

bot.command(:ping) do |event|
  event.respond('Pong! 🏓')
end

bot.run

# Your bot token will be automatically inserted here
bot.run('place ur bot token here')`,
    php: `// Discord Bot Example (PHP)
<?php

$discord = new Discord\Discord([
    'token' => 'YOUR_BOT_TOKEN', // Replace with your bot token
]);

$discord->on('ready', function ($discord) {
    echo "Logged in as " . $discord->user->username . "!\n";
});

$discord->on('message', function ($message) {
    if ($message->content === '!ping') {
        $message->channel->sendMessage('Pong! 🏓');
    }
});

// Your bot token will be automatically inserted here
$discord->run('place ur bot token here');

?>`,
    bash: `# Discord Bot Example (Bash)
#!/bin/bash

TOKEN="YOUR_BOT_TOKEN" # Replace with your bot token

echo "Bot is starting..."

while true; do
    if ! pgrep -f "node" > /dev/null; then
        echo "Discord bot not running, attempting to start..."
        node index.js "$TOKEN"
        echo "Discord bot started."
    fi
    sleep 10
done`
  };
  return templates[language] || templates.javascript;
};

// Helper: format uptime
const formatUptime = (seconds?: number) => {
  if (!seconds) return 'N/A';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
};

function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('token', data.token);
        onLogin();
      } else {
        const err = await res.json();
        setError(err.error || 'Login failed');
      }
    } catch (e) {
      setError('Network error');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#101c2c]">
      <div className="card max-w-md w-full">
        <h2 className="text-2xl font-bold text-white mb-6">Login</h2>
        <form onSubmit={handleLogin}>
          <label className="block mb-2 font-medium text-gray-300">Username</label>
          <input className="input-field mb-4" value={username} onChange={e => setUsername(e.target.value)} required />
          <label className="block mb-2 font-medium text-gray-300">Password</label>
          <input className="input-field mb-4" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          {error && <div className="text-red-400 mb-4">{error}</div>}
          <button className="btn-primary w-full mb-2" type="submit">Login</button>
        </form>
        <div className="text-gray-400 text-sm mt-2 text-center">
          Don&apos;t have an account?{' '}
          <button className="underline" onClick={() => navigate('/signup')}>Sign up</button>
        </div>
      </div>
    </div>
  );
}

function SignupPage({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    try {
      const res = await fetch('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (res.ok) {
        // Auto-login after signup
        const loginRes = await fetch('/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        if (loginRes.ok) {
          const data = await loginRes.json();
          localStorage.setItem('token', data.token);
          onLogin();
        } else {
          setSuccess(true);
          setTimeout(() => navigate('/login'), 1500);
        }
      } else {
        const err = await res.json();
        setError(err.error || 'Signup failed');
      }
    } catch (e) {
      setError('Network error');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#101c2c]">
      <div className="card max-w-md w-full">
        <h2 className="text-2xl font-bold text-white mb-6">Sign Up</h2>
        <form onSubmit={handleSignup}>
          <label className="block mb-2 font-medium text-gray-300">Username</label>
          <input className="input-field mb-4" value={username} onChange={e => setUsername(e.target.value)} required />
          <label className="block mb-2 font-medium text-gray-300">Password</label>
          <input className="input-field mb-4" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          {error && <div className="text-red-400 mb-4">{error}</div>}
          {success && <div className="text-green-400 mb-4">Account created! Redirecting...</div>}
          <button className="btn-primary w-full mb-2" type="submit">Sign Up</button>
        </form>
        <div className="text-gray-400 text-sm mt-2 text-center">
          Already have an account?{' '}
          <button className="underline" onClick={() => navigate('/login')}>Login</button>
        </div>
      </div>
    </div>
  );
}

// Auth check
function isLoggedIn() {
  return !!localStorage.getItem('token');
}

function App() {
  // --- All hooks at the top ---
  const [authed, setAuthed] = useState(isLoggedIn());
  const navigate = useNavigate();
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState('');
  const [addToken, setAddToken] = useState('');
  const [addCode, setAddCode] = useState(getDefaultCode('javascript'));
  const [addLanguage, setAddLanguage] = useState('javascript');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  // Edit modal state
  const [editBot, setEditBot] = useState<Bot | null>(null);
  const [editName, setEditName] = useState('');
  const [editToken, setEditToken] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editLanguage, setEditLanguage] = useState('javascript');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  // Remove confirmation
  const [removeBotId, setRemoveBotId] = useState<string | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);
  const [removeError, setRemoveError] = useState('');
  // Action states
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  // Fetch bots
  const fetchBots = async () => {
    setLoading(true);
    try {
      const res = await fetch('/bots');
      if (res.ok) {
        const data: Bot[] = await res.json();
        setBots(data);
      } else {
        throw new Error('Failed to fetch bots');
      }
    } catch (e) {
      console.error('Error fetching bots:', e);
      setBots([]);
    } finally {
      setLoading(false);
    }
  };

  // Intercept fetch to add token
  useEffect(() => {
    const origFetch = window.fetch;
    window.fetch = async (input, init = {}) => {
      const token = localStorage.getItem('token');
      if (token) {
        init.headers = {
          ...(init.headers || {}),
          Authorization: `Bearer ${token}`
        };
      }
      return origFetch(input, init);
    };
    return () => { window.fetch = origFetch; };
  }, []);

  // Fetch bots on mount (only if authed)
  useEffect(() => {
    if (authed) {
      fetchBots();
    }
    // eslint-disable-next-line
  }, [authed]);

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem('token');
    setAuthed(false);
    navigate('/login');
  };

  // If not authed, redirect to login
  if (!authed) {
    return (
      <Routes>
        <Route path="/signup" element={<SignupPage onLogin={() => setAuthed(true)} />} />
        <Route path="*" element={<LoginPage onLogin={() => setAuthed(true)} />} />
      </Routes>
    );
  }

  // Add bot
  const handleAddBot = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    setAddLoading(true);
    try {
      const res = await fetch('/bots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addName,
          language: addLanguage,
          token: addToken,
          code: addCode
        })
      });
      if (res.ok) {
        const data = await res.json();
        setBots(prev => [...prev, data]);
        setShowAddModal(false);
      } else {
        const err = await res.json();
        setAddError(err.error || 'Failed to create bot');
      }
    } catch (e) {
      setAddError('Network error');
    } finally {
      setAddLoading(false);
    }
  };

  // Edit bot
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError('');
    setEditLoading(true);
    try {
      const res = await fetch(`/bots/${editBot?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          language: editLanguage,
          token: editToken || undefined, // Only send if not empty
          code: editCode
        })
      });
      if (res.ok) {
        const data = await res.json();
        setBots(prev => prev.map(b => b.id === data.id ? data : b));
        setEditBot(null);
      } else {
        const err = await res.json();
        setEditError(err.error || 'Failed to save changes');
      }
    } catch (e) {
      setEditError('Network error');
    } finally {
      setEditLoading(false);
    }
  };

  // Remove bot
  const handleRemoveBot = async () => {
    setRemoveError('');
    setRemoveLoading(true);
    try {
      // Always try to stop the bot before deleting (in case backend missed it)
      if (removeBotId) {
        await fetch(`/bots/${removeBotId}/stop`, { method: 'POST' });
      }
      const res = await fetch(`/bots/${removeBotId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setBots(prev => prev.filter(b => b.id !== removeBotId));
        // If the deleted bot was being edited, clear the edit modal
        if (editBot && editBot.id === removeBotId) {
          setEditBot(null);
          setEditName('');
          setEditToken('');
          setEditCode('');
          setEditLanguage('javascript');
        }
        setRemoveBotId(null);
      } else {
        const err = await res.json();
        setRemoveError(err.error || 'Failed to remove bot');
      }
    } catch (e) {
      setRemoveError('Network error');
    } finally {
      setRemoveLoading(false);
    }
  };

  // Run bot
  const handleRunBot = async (id: string) => {
    setActionLoading(prev => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/bots/${id}/start`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setBots(prev => prev.map(b => b.id === id ? { ...b, running: true, lastStarted: data.lastStarted } : b));
      } else {
        const err = await res.json();
        console.error('Error running bot:', err);
      }
    } catch (e) {
      console.error('Network error running bot:', e);
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  // Stop bot
  const handleStopBot = async (id: string) => {
    setActionLoading(prev => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/bots/${id}/stop`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        // Always refresh the bot list after stopping
        setTimeout(fetchBots, 1500); // Wait 1.5 seconds before refreshing
        // Optionally show a message if needed
        if (data.message && data.message.includes('No process found')) {
          alert('Bot process was already stopped, but status updated.');
        }
      } else {
        const err = await res.json();
        if (err.error && err.error.includes('No process found')) {
          alert('Bot process was already stopped, but status updated.');
        } else {
          console.error('Error stopping bot:', err);
        }
        // Always refresh the bot list after error
        setTimeout(fetchBots, 1500); // Wait 1.5 seconds before refreshing
      }
    } catch (e) {
      console.error('Network error stopping bot:', e);
      setTimeout(fetchBots, 1500); // Wait 1.5 seconds before refreshing
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  // Edit bot modal
  const handleEditBot = async (bot: Bot) => {
    try {
      const res = await fetch(`/bots/${bot.id}`);
      if (res.ok) {
        const fullBot = await res.json();
        setEditBot(fullBot);
        setEditName(fullBot.name);
        setEditToken(fullBot.token || '');
        setEditCode(fullBot.code || '');
        setEditLanguage(fullBot.language || 'javascript');
      } else {
        // fallback to what we have if fetch fails
        setEditBot(bot);
        setEditName(bot.name);
        setEditToken('');
        setEditCode('');
        setEditLanguage(bot.language || 'javascript');
      }
    } catch (e) {
      setEditBot(bot);
      setEditName(bot.name);
      setEditToken('');
      setEditCode('');
      setEditLanguage(bot.language || 'javascript');
    }
  };

  // Language change for add modal
  const handleLanguageChange = (lang: string) => {
    setAddLanguage(lang);
    setAddCode(getDefaultCode(lang));
  };

  // Language change for edit modal
  const handleEditLanguageChange = (lang: string) => {
    setEditLanguage(lang);
    setEditCode(getDefaultCode(lang));
  };

  // Main app UI (existing code)
  return (
    <Routes>
      <Route path="/*" element={
        <div className="min-h-screen bg-[#101c2c]">
          <button className="absolute top-4 right-4 btn-secondary" onClick={handleLogout}>Logout</button>
          {/* Existing app code below here */}
          <header className="bg-gray-800 border-b border-gray-700 text-white p-6 text-3xl font-bold shadow-lg">
            <div className="max-w-6xl mx-auto flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 flex items-center justify-center">
                  <span className="text-white font-bold text-xl">💀</span>
                </div>
                <div>
                  <span className="text-2xl">Discord Bot Hoster</span>
                  <div className="text-sm text-gray-400 font-normal">Manage your Discord bots with ease</div>
                </div>
              </div>
              <div className="text-sm text-gray-400">
                {bots.filter(b => b.running).length} / {bots.length} bots running
              </div>
            </div>
          </header>
          
          <main className="max-w-7xl mx-auto py-8 px-4">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">Your Bots</h2>
                <p className="text-gray-400">Create, manage, and monitor your Discord bots</p>
              </div>
              <button
                className="btn-primary flex items-center space-x-2 text-lg px-6 py-3"
                onClick={() => setShowAddModal(true)}
              >
                <span className="text-xl">+</span>
                <span>Add New Bot</span>
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
                <span className="ml-4 text-gray-400 text-lg">Loading your bots...</span>
              </div>
            ) : bots.length === 0 ? (
              <div className="card text-center py-16">
                <div className="text-8xl mb-6">🤖</div>
                <h3 className="text-2xl font-semibold text-white mb-3">No bots yet</h3>
                <p className="text-gray-400 mb-8 text-lg">Get started by creating your first Discord bot</p>
                <button
                  className="btn-primary text-lg px-8 py-4"
                  onClick={() => setShowAddModal(true)}
                >
                  + Create Your First Bot
                </button>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {bots.map(bot => (
                  <div key={bot.id} className="card hover:border-gray-600 transition-all duration-300 hover:shadow-xl">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-white mb-2">{bot.name}</h3>
                        <div className="flex items-center space-x-3 mb-3">
                          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            bot.running 
                              ? 'bg-green-900 text-green-300 border border-green-700' 
                              : 'bg-gray-800 text-gray-400 border border-gray-600'
                          }`}>
                            <div className={`w-2 h-2 rounded-full mr-2 ${
                              bot.running ? 'bg-green-400 animate-pulse' : 'bg-gray-500'
                            }`}></div>
                            {bot.running ? 'Running' : 'Stopped'}
                          </div>
                          <span className="text-xs text-gray-500 uppercase tracking-wide">
                            {bot.language || 'javascript'}
                          </span>
                        </div>
                        {bot.running && (
                          <div className="text-xs text-gray-500">
                            Uptime: {formatUptime(bot.uptime)}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      <button
                        className={`btn-success text-sm flex items-center space-x-1 ${
                          actionLoading[bot.id] || bot.running ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        onClick={() => handleRunBot(bot.id)}
                        disabled={bot.running || actionLoading[bot.id]}
                      >
                        {actionLoading[bot.id] ? (
                          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                        ) : (
                          <span>▶</span>
                        )}
                        <span>Run</span>
                      </button>
                      
                      <button
                        className={`btn-warning text-sm flex items-center space-x-1 ${
                          actionLoading[bot.id] || !bot.running ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        onClick={() => handleStopBot(bot.id)}
                        disabled={!bot.running || actionLoading[bot.id]}
                      >
                        {actionLoading[bot.id] ? (
                          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                        ) : (
                          <span>⏹</span>
                        )}
                        <span>Stop</span>
                      </button>
                      
                      <button
                        className="btn-secondary text-sm flex items-center space-x-1"
                        onClick={() => handleEditBot(bot)}
                      >
                        <span>✏</span>
                        <span>Edit</span>
                      </button>
                      
                      <button
                        className="btn-danger text-sm flex items-center space-x-1"
                        onClick={() => setRemoveBotId(bot.id)}
                      >
                        <span>🗑</span>
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>

          {/* Add Modal */}
          {showAddModal && (
            <div className="modal-overlay">
              <div className="modal-content p-6 max-w-2xl">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-white">Create New Bot</h3>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="text-gray-400 hover:text-white transition-colors text-xl"
                  >
                    ✕
                  </button>
                </div>
                <form onSubmit={handleAddBot} autoComplete="off">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block mb-2 font-medium text-gray-300">Bot Name</label>
                      <input
                        className="input-field"
                        value={addName}
                        onChange={e => setAddName(e.target.value)}
                        placeholder="My Awesome Bot"
                        required
                      />
                    </div>
                    <div>
                      <label className="block mb-2 font-medium text-gray-300">Language</label>
                      <select
                        className="input-field"
                        value={addLanguage}
                        onChange={e => handleLanguageChange(e.target.value)}
                      >
                        <option value="javascript">JavaScript (Node.js)</option>
                        <option value="python">Python</option>
                        <option value="typescript">TypeScript (Node.js)</option>
                        <option value="java">Java</option>
                        <option value="csharp">C#</option>
                        <option value="go">Go</option>
                        <option value="ruby">Ruby</option>
                        <option value="php">PHP</option>
                        <option value="bash">Bash</option>
                      </select>
                    </div>
                  </div>
                  
                  <label className="block mb-2 font-medium text-gray-300">Bot Token</label>
                  <input
                    className="input-field"
                    value={addToken}
                    onChange={e => setAddToken(e.target.value)}
                    placeholder="MTM5MzYzMzc0Mzc5NjY5OTEzNg.G2kyZv..."
                    required
                    type="password"
                    autoComplete="new-password"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Get your bot token from the Discord Developer Portal
                  </div>
                  
                  <label className="block mb-2 font-medium text-gray-300 mt-4">Bot Code</label>
                  <textarea
                    className="input-field h-64 resize-none font-mono text-sm"
                    value={addCode}
                    onChange={e => setAddCode(e.target.value)}
                    placeholder="Enter your Discord bot code here..."
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Your bot token will be automatically inserted where needed
                  </div>
                  
                  {addError && (
                    <div className="text-red-400 mt-4 p-3 bg-red-900/20 border border-red-700 rounded-lg">
                      {addError}
                    </div>
                  )}
                  
                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setShowAddModal(false)}
                      disabled={addLoading}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={addLoading}
                    >
                      {addLoading ? 'Creating...' : 'Create Bot'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Edit Modal */}
          {editBot && (
            <div className="modal-overlay">
              <div className="modal-content p-6 max-w-2xl">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-white">Edit Bot</h3>
                  <button
                    onClick={() => setEditBot(null)}
                    className="text-gray-400 hover:text-white transition-colors text-xl"
                  >
                    ✕
                  </button>
                </div>
                <form onSubmit={handleEditSubmit} autoComplete="off">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block mb-2 font-medium text-gray-300">Bot Name</label>
                      <input
                        className="input-field"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        placeholder="Enter bot name"
                        required
                      />
                    </div>
                    <div>
                      <label className="block mb-2 font-medium text-gray-300">Language</label>
                      <select
                        className="input-field"
                        value={editLanguage}
                        onChange={e => handleEditLanguageChange(e.target.value)}
                      >
                        <option value="javascript">JavaScript (Node.js)</option>
                        <option value="python">Python</option>
                        <option value="typescript">TypeScript (Node.js)</option>
                        <option value="java">Java</option>
                        <option value="csharp">C#</option>
                        <option value="go">Go</option>
                        <option value="ruby">Ruby</option>
                        <option value="php">PHP</option>
                        <option value="bash">Bash</option>
                      </select>
                    </div>
                  </div>
                  
                  <label className="block mb-2 font-medium text-gray-300">Bot Token (leave blank to keep unchanged)</label>
                  <input
                    className="input-field"
                    value={editToken}
                    onChange={e => setEditToken(e.target.value)}
                    placeholder="Enter new token or leave blank"
                    type="password"
                    autoComplete="new-password"
                  />
                  
                  <label className="block mb-2 font-medium text-gray-300 mt-4">Bot Code</label>
                  <textarea
                    className="input-field h-64 resize-none font-mono text-sm"
                    value={editCode}
                    onChange={e => setEditCode(e.target.value)}
                    placeholder="Enter your Discord bot code here..."
                  />
                  
                  {editError && (
                    <div className="text-red-400 mt-4 p-3 bg-red-900/20 border border-red-700 rounded-lg">
                      {editError}
                    </div>
                  )}
                  
                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setEditBot(null)}
                      disabled={editLoading}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={editLoading}
                    >
                      {editLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Remove Confirmation Modal */}
          {removeBotId && (
            <div className="modal-overlay">
              <div className="modal-content p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-white">Remove Bot</h3>
                  <button
                    onClick={() => setRemoveBotId(null)}
                    className="text-gray-400 hover:text-white transition-colors text-xl"
                  >
                    ✕
                  </button>
                </div>
                <div className="mb-6">
                  <div className="flex items-center justify-center w-20 h-20 bg-red-900/20 border border-red-700 rounded-full mx-auto mb-4">
                    <span className="text-red-400 text-3xl">⚠</span>
                  </div>
                  <p className="text-gray-300 text-center text-lg">Are you sure you want to remove this bot?</p>
                  <p className="text-gray-500 text-center mt-2">This action cannot be undone and will stop the bot if it's running.</p>
                </div>
                {removeError && (
                  <div className="text-red-400 mb-4 p-3 bg-red-900/20 border border-red-700 rounded-lg">
                    {removeError}
                  </div>
                )}
                <div className="flex justify-end space-x-3">
                  <button
                    className="btn-secondary"
                    onClick={() => setRemoveBotId(null)}
                    disabled={removeLoading}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn-danger"
                    onClick={handleRemoveBot}
                    disabled={removeLoading}
                  >
                    {removeLoading ? 'Removing...' : 'Remove Bot'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      } />
    </Routes>
  );
}

export default App;
