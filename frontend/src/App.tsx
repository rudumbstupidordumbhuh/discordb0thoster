import React, { useEffect, useState } from 'react';
import MonacoEditor from '@monaco-editor/react';
import './App.css';

interface Bot {
  id: string;
  name: string;
  running: boolean;
}

function App() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState('');
  const [addToken, setAddToken] = useState('');
  const [addCode, setAddCode] = useState('// Example: require("discord.js")\nconst { Client, GatewayIntentBits } = require("discord.js");\nconst client = new Client({ intents: [GatewayIntentBits.Guilds] });\nclient.on("ready", () => {\n  console.log(`Logged in as ${client.user.tag}!`);\n});\nclient.login(process.env.BOT_TOKEN);');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  // Edit modal state
  const [editBot, setEditBot] = useState<Bot | null>(null);
  const [editName, setEditName] = useState('');
  const [editToken, setEditToken] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Remove confirmation
  const [removeBotId, setRemoveBotId] = useState<string | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);
  const [removeError, setRemoveError] = useState('');

  const fetchBots = () => {
    setLoading(true);
    fetch('/bots')
      .then(res => res.json())
      .then(data => {
        setBots(data);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchBots();
  }, []);

  const handleAddBot = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLoading(true);
    setAddError('');
    const res = await fetch('/bots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: addName, token: addToken, code: addCode })
    });
    if (res.ok) {
      fetchBots();
      setShowAddModal(false);
      setAddName('');
      setAddToken('');
      setAddCode('');
    } else {
      const err = await res.json();
      setAddError(err.error || 'Failed to add bot');
    }
    setAddLoading(false);
  };

  const handleRunBot = async (id: string) => {
    await fetch(`/bots/${id}/start`, { method: 'POST' });
    fetchBots();
  };

  const handleStopBot = async (id: string) => {
    await fetch(`/bots/${id}/stop`, { method: 'POST' });
    fetchBots();
  };

  const handleEditBot = (bot: Bot) => {
    setEditBot(bot);
    setEditName(bot.name);
    setEditToken(''); // Don't show token
    setEditCode(''); // Will fetch code
    fetch(`/bots`) // Get all bots, find code by id (token never sent)
      .then(res => res.json())
      .then(data => {
        const found = data.find((b: any) => b.id === bot.id);
        if (found) setEditCode(found.code || '');
      });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editBot) return;
    setEditLoading(true);
    setEditError('');
    const res = await fetch(`/bots/${editBot.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName, token: editToken || undefined, code: editCode })
    });
    if (res.ok) {
      fetchBots();
      setEditBot(null);
    } else {
      const err = await res.json();
      setEditError(err.error || 'Failed to update bot');
    }
    setEditLoading(false);
  };

  const handleRemoveBot = async () => {
    if (!removeBotId) return;
    setRemoveLoading(true);
    setRemoveError('');
    const res = await fetch(`/bots/${removeBotId}`, { method: 'DELETE' });
    if (res.ok) {
      fetchBots();
      setRemoveBotId(null);
    } else {
      const err = await res.json();
      setRemoveError(err.error || 'Failed to remove bot');
    }
    setRemoveLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-blue-600 text-white p-4 text-2xl font-bold shadow">
        Discord Bot Hoster
      </header>
      <main className="max-w-3xl mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Your Bots</h2>
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            onClick={() => setShowAddModal(true)}
          >
            + Add Bot
          </button>
        </div>
        {loading ? (
          <div>Loading...</div>
        ) : bots.length === 0 ? (
          <div className="text-gray-500">No bots yet. Click "+ Add Bot" to get started!</div>
        ) : (
          <ul className="space-y-4">
            {bots.map(bot => (
              <li key={bot.id} className="bg-white p-4 rounded shadow flex justify-between items-center">
                <div>
                  <div className="font-semibold">{bot.name}</div>
                  <div className={`text-sm ${bot.running ? 'text-green-600' : 'text-gray-400'}`}>{bot.running ? 'Running' : 'Stopped'}</div>
                </div>
                <div className="space-x-2">
                  <button
                    className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded"
                    onClick={() => handleRunBot(bot.id)}
                    disabled={bot.running}
                  >Run</button>
                  <button
                    className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded"
                    onClick={() => handleStopBot(bot.id)}
                    disabled={!bot.running}
                  >Stop</button>
                  <button
                    className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded"
                    onClick={() => handleEditBot(bot)}
                  >Edit</button>
                  <button
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                    onClick={() => setRemoveBotId(bot.id)}
                  >Remove</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Add New Bot</h3>
            <form onSubmit={handleAddBot}>
              <label className="block mb-2 font-medium">Bot Name</label>
              <input
                className="w-full border rounded px-3 py-2 mb-4"
                value={addName}
                onChange={e => setAddName(e.target.value)}
                required
              />
              <label className="block mb-2 font-medium">Bot Token</label>
              <input
                className="w-full border rounded px-3 py-2 mb-4"
                value={addToken}
                onChange={e => setAddToken(e.target.value)}
                required
                type="password"
              />
              <label className="block mb-2 font-medium">Bot Code</label>
              <div className="mb-4 h-48">
                <MonacoEditor
                  height="100%"
                  defaultLanguage="javascript"
                  value={addCode}
                  onChange={v => setAddCode(v || '')}
                  options={{ minimap: { enabled: false } }}
                />
              </div>
              {addError && <div className="text-red-600 mb-2">{addError}</div>}
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  className="px-4 py-2 bg-gray-300 rounded"
                  onClick={() => setShowAddModal(false)}
                  disabled={addLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded"
                  disabled={addLoading}
                >
                  {addLoading ? 'Adding...' : 'Add Bot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit Modal */}
      {editBot && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Edit Bot</h3>
            <form onSubmit={handleEditSubmit}>
              <label className="block mb-2 font-medium">Bot Name</label>
              <input
                className="w-full border rounded px-3 py-2 mb-4"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                required
              />
              <label className="block mb-2 font-medium">Bot Token (leave blank to keep unchanged)</label>
              <input
                className="w-full border rounded px-3 py-2 mb-4"
                value={editToken}
                onChange={e => setEditToken(e.target.value)}
                type="password"
              />
              <label className="block mb-2 font-medium">Bot Code</label>
              <div className="mb-4 h-48">
                <MonacoEditor
                  height="100%"
                  defaultLanguage="javascript"
                  value={editCode}
                  onChange={v => setEditCode(v || '')}
                  options={{ minimap: { enabled: false } }}
                />
              </div>
              {editError && <div className="text-red-600 mb-2">{editError}</div>}
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  className="px-4 py-2 bg-gray-300 rounded"
                  onClick={() => setEditBot(null)}
                  disabled={editLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded"
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
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Remove Bot</h3>
            <p>Are you sure you want to remove this bot?</p>
            {removeError && <div className="text-red-600 mb-2">{removeError}</div>}
            <div className="flex justify-end space-x-2 mt-4">
              <button
                className="px-4 py-2 bg-gray-300 rounded"
                onClick={() => setRemoveBotId(null)}
                disabled={removeLoading}
              >Cancel</button>
              <button
                className="px-4 py-2 bg-red-600 text-white rounded"
                onClick={handleRemoveBot}
                disabled={removeLoading}
              >{removeLoading ? 'Removing...' : 'Remove'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
