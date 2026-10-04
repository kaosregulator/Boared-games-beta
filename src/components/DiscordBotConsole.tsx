import React, { useState } from 'react';
import { GameId } from '../types';
import { sound } from '../utils/audio';
import { Send, Terminal, Bot, Sparkles, HelpCircle, Swords, Dice5, Coins, Flame } from 'lucide-react';

interface DiscordBotConsoleProps {
  onLaunchGame: (id: GameId) => void;
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  sender: string;
  avatar: string;
  isBot?: boolean;
  time: string;
  text: string;
  embed?: {
    title: string;
    description: string;
    color: string;
    fields?: { name: string; value: string }[];
  };
}

export const DiscordBotConsole: React.FC<DiscordBotConsoleProps> = ({
  onLaunchGame,
  onClose
}) => {
  const [input, setInput] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      sender: 'TabletopBot#0001',
      avatar: '🤖',
      isBot: true,
      time: 'Today at 7:40 PM',
      text: 'Welcome to the **Discord Tabletop & Casino Night**! Type `/help` or click any command below.',
      embed: {
        title: '🎮 Classic Game & Casino Catalog',
        description: 'Launch any game directly in your voice channel or canvas:',
        color: '#3b82f6',
        fields: [
          { name: '/trivia', value: 'Jackbox Trivia Party & Murder Mystery' },
          { name: '/poker', value: "Texas Hold'em Poker Lounge & Video Poker" },
          { name: '/casino', value: 'Lucky 777 Slots & Roulette Wheel' },
          { name: '/battleship', value: 'Naval Strike 3D Dual Radar' },
          { name: '/connect4', value: 'Connect Four Gravity Grid' },
          { name: '/chess', value: 'Staunton Classic Chess' },
          { name: '/checkers', value: 'Classic Draughts / Checkers' },
          { name: '/blackjack', value: 'Casino 21 / Blackjack' },
          { name: '/gofish', value: 'Classic Go Fish Card Game' },
          { name: '/pawnrush', value: '4-Player Revenge Race (Sorry/Ludo)' },
          { name: '/liarsdice', value: "Pirate's Liar's Dice (Perudo)" }
        ]
      }
    }
  ]);

  const handleSend = () => {
    if (!input.trim()) return;

    sound.playButtonClick();
    const userText = input.trim();
    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      sender: 'You',
      avatar: '🎮',
      time: 'Just now',
      text: userText
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');

    setTimeout(() => {
      handleBotResponse(userText.toLowerCase());
    }, 300);
  };

  const handleBotResponse = (cmd: string) => {
    sound.playRadarPing();
    let botMsg: ChatMessage;

    if (cmd.startsWith('/trivia') || cmd === 'trivia' || cmd === 'jackbox' || cmd === 'quiz') {
      botMsg = {
        id: `b_${Date.now()}`,
        sender: 'TabletopBot#0001',
        avatar: '🤖',
        isBot: true,
        time: 'Just now',
        text: 'Opening **Jackbox Trivia Party & Murder Mystery**! 🎙️👻🎮',
        embed: {
          title: '🎙️ Trivia Party Royale Ready',
          description: 'Hollywood Cinephile, Video Game Vault, Murder Mystery Killing Floor & AI Pack Builder ready!',
          color: '#a855f7'
        }
      };
      onLaunchGame('trivia');
    } else if (cmd.startsWith('/poker') || cmd === 'poker' || cmd === 'holdem') {
      botMsg = {
        id: `b_${Date.now()}`,
        sender: 'TabletopBot#0001',
        avatar: '🤖',
        isBot: true,
        time: 'Just now',
        text: "Pulling up seats at the **Texas Hold'em Poker Table**! ♠️♥️♦️♣️",
        embed: {
          title: "♠️ Texas Hold'em Room Ready",
          description: 'Hole cards dealt, blinds posted, AI bots ready to raise or fold.',
          color: '#f59e0b'
        }
      };
      onLaunchGame('poker');
    } else if (cmd.startsWith('/casino') || cmd === 'casino' || cmd === 'slots' || cmd === 'roulette') {
      botMsg = {
        id: `b_${Date.now()}`,
        sender: 'TabletopBot#0001',
        avatar: '🤖',
        isBot: true,
        time: 'Just now',
        text: 'Opening **Royal Casino Lounge**! 🎰🎡',
        embed: {
          title: '🎰 Royal Casino Ready',
          description: 'Spin Lucky 777 Slots, bet on European Roulette, or claim daily chips!',
          color: '#10b981'
        }
      };
      onLaunchGame('casino');
    } else if (cmd.startsWith('/battleship') || cmd === 'battleship') {
      botMsg = {
        id: `b_${Date.now()}`,
        sender: 'TabletopBot#0001',
        avatar: '🤖',
        isBot: true,
        time: 'Just now',
        text: 'Launching **Naval Strike: Battleship** for the channel! ⚓',
        embed: {
          title: '⚓ Battleship 3D Ready',
          description: 'Deploying dual radar grids and realistic naval fleet.',
          color: '#3b82f6'
        }
      };
      onLaunchGame('battleship');
    } else if (cmd.startsWith('/connect4') || cmd === 'connect4') {
      botMsg = {
        id: `b_${Date.now()}`,
        sender: 'TabletopBot#0001',
        avatar: '🤖',
        isBot: true,
        time: 'Just now',
        text: 'Unboxing **Connect Four**! 🔴🟡',
        embed: {
          title: '🔴 Connect Four Rack Ready',
          description: 'Vertical gravity rack loaded with bouncing discs.',
          color: '#f59e0b'
        }
      };
      onLaunchGame('connect4');
    } else if (cmd.startsWith('/chess') || cmd === 'chess') {
      botMsg = {
        id: `b_${Date.now()}`,
        sender: 'TabletopBot#0001',
        avatar: '🤖',
        isBot: true,
        time: 'Just now',
        text: 'Setting up **Staunton Chess**! ♟️',
        embed: {
          title: '♟️ Chess Board Deployed',
          description: 'Polished walnut board & grandmaster pieces positioned.',
          color: '#d97706'
        }
      };
      onLaunchGame('chess');
    } else if (cmd.startsWith('/checkers') || cmd === 'checkers') {
      botMsg = {
        id: `b_${Date.now()}`,
        sender: 'TabletopBot#0001',
        avatar: '🤖',
        isBot: true,
        time: 'Just now',
        text: 'Setting up **Classic Checkers**! 🔴⚫',
        embed: {
          title: '🔴 Checkers Table Ready',
          description: 'Crown your kings and prepare double jumps!',
          color: '#dc2626'
        }
      };
      onLaunchGame('checkers');
    } else if (cmd.startsWith('/blackjack') || cmd === 'blackjack' || cmd === '21') {
      botMsg = {
        id: `b_${Date.now()}`,
        sender: 'TabletopBot#0001',
        avatar: '🤖',
        isBot: true,
        time: 'Just now',
        text: 'Opening **Blackjack / 21 Table**! ♠️',
        embed: {
          title: '♠️ Blackjack Table Ready',
          description: 'Hit, Stand, Double Down and beat the Dealer.',
          color: '#10b981'
        }
      };
      onLaunchGame('blackjack');
    } else if (cmd.startsWith('/gofish') || cmd === 'gofish' || cmd === 'fish') {
      botMsg = {
        id: `b_${Date.now()}`,
        sender: 'TabletopBot#0001',
        avatar: '🤖',
        isBot: true,
        time: 'Just now',
        text: 'Dealing cards for **Go Fish**! 🎣',
        embed: {
          title: '🎣 Go Fish Pond Ready',
          description: 'Ask for ranks, collect 4-of-a-kind books, and fish from the pond!',
          color: '#06b6d4'
        }
      };
      onLaunchGame('gofish');
    } else if (cmd.startsWith('/pawnrush') || cmd === 'pawnrush' || cmd === 'sorry') {
      botMsg = {
        id: `b_${Date.now()}`,
        sender: 'TabletopBot#0001',
        avatar: '🤖',
        isBot: true,
        time: 'Just now',
        text: 'Unfolding **Pawn Rush: 4-Player Revenge Race**! 🎲',
        embed: {
          title: '🎲 4-Player Board Ready',
          description: 'Shuffling action deck: Prepare to slide and bump!',
          color: '#10b981'
        }
      };
      onLaunchGame('pawnrush');
    } else if (cmd.startsWith('/liarsdice') || cmd === 'liarsdice' || cmd === 'perudo') {
      botMsg = {
        id: `b_${Date.now()}`,
        sender: 'TabletopBot#0001',
        avatar: '🤖',
        isBot: true,
        time: 'Just now',
        text: "Distributing leather cups for **Pirate's Liar's Dice**! 🏴‍☠️",
        embed: {
          title: '🏴‍☠️ Perudo Showdown',
          description: '5 dice dealt to each pirate. Keep your rolls secret!',
          color: '#eab308'
        }
      };
      onLaunchGame('liarsdice');
    } else if (cmd.startsWith('/roll')) {
      const roll1 = Math.floor(Math.random() * 6) + 1;
      const roll2 = Math.floor(Math.random() * 6) + 1;
      botMsg = {
        id: `b_${Date.now()}`,
        sender: 'TabletopBot#0001',
        avatar: '🤖',
        isBot: true,
        time: 'Just now',
        text: `🎲 **Dice Roll Result**: [${roll1}] and [${roll2}] = **${roll1 + roll2}**!`
      };
    } else {
      botMsg = {
        id: `b_${Date.now()}`,
        sender: 'TabletopBot#0001',
        avatar: '🤖',
        isBot: true,
        time: 'Just now',
        text: 'Here are the available slash commands:',
        embed: {
          title: '🤖 Bot Commands',
          description: 'Type any of these commands to launch:',
          color: '#3b82f6',
          fields: [
            { name: '/poker', value: "Texas Hold'em Poker Room" },
            { name: '/casino', value: 'Royal Casino & Slots Lounge' },
            { name: '/battleship', value: 'Start Battleship' },
            { name: '/connect4', value: 'Start Connect Four' },
            { name: '/chess', value: 'Start Chess' },
            { name: '/checkers', value: 'Start Checkers' },
            { name: '/blackjack', value: 'Start Blackjack (21)' },
            { name: '/gofish', value: 'Start Go Fish' },
            { name: '/pawnrush', value: 'Start 4-Player Race (Sorry)' },
            { name: '/liarsdice', value: "Start Pirate's Liar's Dice" },
            { name: '/roll', value: 'Roll 2d6 dice' }
          ]
        }
      };
    }

    setMessages(prev => [...prev, botMsg]);
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[420px] bg-slate-900 text-slate-200 z-50 flex flex-col shadow-2xl border-l border-slate-800 animate-in slide-in-from-right duration-300">
      {/* Top Channel Header */}
      <div className="h-16 px-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-blue-400" />
          <span className="font-bold text-white text-xs uppercase tracking-wider"># tabletop-casino-bot</span>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors text-xs font-bold"
        >
          ✕
        </button>
      </div>

      {/* Quick Launch Pills */}
      <div className="p-3 bg-slate-950/80 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto text-[11px]">
        <button
          onClick={() => handleBotResponse('/trivia')}
          className="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 font-bold whitespace-nowrap"
        >
          🎙️ /trivia
        </button>
        <button
          onClick={() => handleBotResponse('/poker')}
          className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 font-bold whitespace-nowrap"
        >
          ♠️ /poker
        </button>
        <button
          onClick={() => handleBotResponse('/casino')}
          className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 font-bold whitespace-nowrap"
        >
          🎰 /casino
        </button>
        <button
          onClick={() => handleBotResponse('/battleship')}
          className="px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30 font-bold whitespace-nowrap"
        >
          ⚓ /battleship
        </button>
        <button
          onClick={() => handleBotResponse('/connect4')}
          className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 font-bold whitespace-nowrap"
        >
          🔴 /connect4
        </button>
        <button
          onClick={() => handleBotResponse('/chess')}
          className="px-2.5 py-1 rounded-lg bg-stone-500/20 text-stone-300 border border-stone-500/30 hover:bg-stone-500/30 font-bold whitespace-nowrap"
        >
          ♟️ /chess
        </button>
        <button
          onClick={() => handleBotResponse('/blackjack')}
          className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 font-bold whitespace-nowrap"
        >
          🃏 /blackjack
        </button>
      </div>

      {/* Message History Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-sans">
        {messages.map(msg => (
          <div key={msg.id} className="flex gap-3 items-start group">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-base shrink-0">
              {msg.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-xs">{msg.sender}</span>
                {msg.isBot && (
                  <span className="bg-blue-600 text-white text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase">
                    BOT
                  </span>
                )}
                <span className="text-[10px] text-slate-500">{msg.time}</span>
              </div>
              <p className="text-slate-300 text-xs mt-0.5 leading-relaxed break-words">{msg.text}</p>

              {msg.embed && (
                <div
                  className="mt-2.5 p-3.5 rounded-xl bg-slate-950 border border-slate-800 shadow-md text-xs space-y-2 border-l-4"
                  style={{ borderLeftColor: msg.embed.color }}
                >
                  <h4 className="font-bold text-white text-xs">{msg.embed.title}</h4>
                  <p className="text-[11px] text-slate-400">{msg.embed.description}</p>
                  {msg.embed.fields && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
                      {msg.embed.fields.map((f, i) => (
                        <div key={i} className="bg-slate-900/60 p-2 rounded border border-slate-800">
                          <span className="font-mono text-blue-400 font-bold block">{f.name}</span>
                          <span className="text-[10px] text-slate-300">{f.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Message Input Box */}
      <div className="p-3 bg-slate-950 border-t border-slate-800">
        <div className="flex items-center bg-slate-900 rounded-xl px-3 py-2 border border-slate-800 focus-within:border-blue-500 transition-colors">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Type /poker, /casino, /battleship, /connect4..."
            className="flex-1 bg-transparent text-white text-xs outline-none placeholder:text-slate-500 font-mono"
          />
          <button
            onClick={handleSend}
            className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
