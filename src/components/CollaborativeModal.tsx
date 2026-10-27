import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  X, 
  Share2, 
  Copy, 
  Check, 
  Plus, 
  ArrowRight, 
  RefreshCw, 
  GitMerge, 
  Layers, 
  MessageSquare, 
  Send, 
  ShieldCheck, 
  Sparkles,
  FileText,
  UserCheck
} from 'lucide-react';
import { Flashcard, CollaborativeRoomState, CollaborativePeer } from '../types';

interface CollaborativeModalProps {
  isOpen: boolean;
  onClose: () => void;
  localNotes: string;
  localTitle: string;
  localCards: Flashcard[];
  onApplyMergedDeck: (mergedNotes: string, mergedCards: Flashcard[], newTitle: string) => void;
}

export const CollaborativeModal: React.FC<CollaborativeModalProps> = ({
  isOpen,
  onClose,
  localNotes,
  localTitle,
  localCards,
  onApplyMergedDeck
}) => {
  const [userName, setUserName] = useState<string>(() => {
    try {
      return localStorage.getItem('noetic_username') || `Scholar_${Math.floor(100 + Math.random() * 900)}`;
    } catch {
      return 'Scholar_401';
    }
  });

  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [activeRoom, setActiveRoom] = useState<CollaborativeRoomState | null>(null);
  const [availableRooms, setAvailableRooms] = useState<Array<any>>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [newCardFront, setNewCardFront] = useState('');
  const [newCardBack, setNewCardBack] = useState('');
  const [chatMessage, setChatMessage] = useState('');
  const [chatLog, setChatLog] = useState<Array<{ user: string; text: string; timestamp: number }>>([]);
  const [mergeFeedback, setMergeFeedback] = useState<string | null>(null);
  const [isMerging, setIsMerging] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'cards' | 'merge' | 'chat'>('overview');

  const wsRef = useRef<WebSocket | null>(null);
  const peerIdRef = useRef<string>(`peer-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);

  // Load available rooms on open
  useEffect(() => {
    if (isOpen) {
      const token = localStorage.getItem('noetic_auth_token');
      if (!token) {
        setAvailableRooms([]);
        return;
      }
      fetch('/api/collab/rooms', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(r => r.json())
        .then(data => {
          if (data.rooms) setAvailableRooms(data.rooms);
        })
        .catch(err => console.warn('Could not fetch collab rooms:', err));
    }
  }, [isOpen]);

  // Connect WebSocket when room is selected
  useEffect(() => {
    if (!isOpen || !activeRoom) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      // Send join message
      ws.send(JSON.stringify({
        type: 'join_room',
        roomCode: activeRoom.roomCode,
        peer: {
          id: peerIdRef.current,
          name: userName,
          color: getRandomColor(userName)
        }
      }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'room_state') {
          setActiveRoom(msg.room);
        } else if (msg.type === 'peer_joined') {
          setActiveRoom(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              activeUsers: msg.activeUsers,
              activityLog: msg.activity ? [...prev.activityLog, msg.activity] : prev.activityLog
            };
          });
        } else if (msg.type === 'peer_left') {
          setActiveRoom(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              activeUsers: msg.activeUsers,
              activityLog: msg.activity ? [...prev.activityLog, msg.activity] : prev.activityLog
            };
          });
        } else if (msg.type === 'card_added') {
          setActiveRoom(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              cards: msg.cards,
              activityLog: msg.activity ? [...prev.activityLog, msg.activity] : prev.activityLog
            };
          });
        } else if (msg.type === 'card_deleted') {
          setActiveRoom(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              cards: msg.cards,
              activityLog: msg.activity ? [...prev.activityLog, msg.activity] : prev.activityLog
            };
          });
        } else if (msg.type === 'deck_updated') {
          setActiveRoom(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              deckTitle: msg.deckTitle,
              notes: msg.notes,
              lastEditedBy: msg.lastEditedBy,
              updatedAt: msg.updatedAt
            };
          });
        } else if (msg.type === 'chat_message') {
          setChatLog(prev => [...prev, { user: msg.user, text: msg.text, timestamp: msg.timestamp }]);
        }
      } catch (err) {
        console.error('Error handling websocket message:', err);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [isOpen, activeRoom?.roomCode, userName]);

  const getRandomColor = (name: string) => {
    const colors = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#e11d48'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
    return colors[Math.abs(hash) % colors.length];
  };

  const handleJoinByCode = async (codeToJoin?: string) => {
    const code = (codeToJoin || roomCodeInput).toUpperCase().trim();
    if (!code) return;

    try {
      const res = await fetch(`/api/collab/${code}`);
      if (!res.ok) {
        // Room doesn't exist, create it with local deck
        handleCreateRoom(code);
        return;
      }
      const data = await res.json();
      setActiveRoom(data.room);
      setRoomCodeInput('');
      try {
        localStorage.setItem('noetic_username', userName);
      } catch {}
    } catch (err) {
      console.error('Error joining room:', err);
    }
  };

  const handleCreateRoom = async (customCode?: string) => {
    try {
      const res = await fetch('/api/collab/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deckTitle: localTitle || 'Study Group Deck',
          notes: localNotes,
          cards: localCards,
          userName
        })
      });
      const data = await res.json();
      if (data.room) {
        setActiveRoom(data.room);
        setRoomCodeInput('');
      }
    } catch (err) {
      console.error('Failed to create room:', err);
    }
  };

  const handleCopyCode = () => {
    if (activeRoom) {
      navigator.clipboard.writeText(activeRoom.roomCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleAddCardToRoom = () => {
    if (!newCardFront.trim() || !newCardBack.trim() || !activeRoom) return;

    const newCard: Flashcard = {
      id: `collab-card-${Date.now()}`,
      front: newCardFront.trim(),
      back: newCardBack.trim(),
      category: 'Peer Contribution'
    };

    if (wsRef.current && isConnected) {
      wsRef.current.send(JSON.stringify({
        type: 'add_card',
        card: newCard,
        userName
      }));
    }

    setActiveRoom(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        cards: [...prev.cards, newCard]
      };
    });

    setNewCardFront('');
    setNewCardBack('');
  };

  const handleDeleteCardFromRoom = (cardId: string) => {
    if (!activeRoom) return;
    if (wsRef.current && isConnected) {
      wsRef.current.send(JSON.stringify({
        type: 'delete_card',
        cardId,
        userName
      }));
    }
    setActiveRoom(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        cards: prev.cards.filter(c => c.id !== cardId)
      };
    });
  };

  const handleSendChat = () => {
    if (!chatMessage.trim() || !activeRoom) return;
    const msg = {
      user: userName,
      text: chatMessage.trim(),
      timestamp: Date.now()
    };
    if (wsRef.current && isConnected) {
      wsRef.current.send(JSON.stringify({
        type: 'chat_message',
        ...msg
      }));
    }
    setChatLog(prev => [...prev, msg]);
    setChatMessage('');
  };

  // Async Merging Execution
  const handlePerformSmartMerge = async () => {
    if (!activeRoom) return;
    setIsMerging(true);
    setMergeFeedback(null);

    try {
      const res = await fetch('/api/collab/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode: activeRoom.roomCode,
          localDeck: {
            cards: localCards,
            notes: localNotes,
            userName
          },
          mergeMode: 'smart'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Merge failed.');

      // Apply to active local deck
      onApplyMergedDeck(data.mergedNotes, data.mergedCards, activeRoom.deckTitle);
      setMergeFeedback(`Success: ${data.message} Deck updated!`);
    } catch (err: any) {
      setMergeFeedback(`Error merging: ${err.message}`);
    } finally {
      setIsMerging(false);
    }
  };

  const handlePushLocalToRoom = async () => {
    if (!activeRoom) return;
    setIsMerging(true);
    setMergeFeedback(null);

    try {
      const res = await fetch('/api/collab/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode: activeRoom.roomCode,
          localDeck: {
            cards: localCards,
            notes: localNotes,
            userName
          },
          mergeMode: 'push_local'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Push failed.');

      setActiveRoom(data.room);
      setMergeFeedback('Pushed your local deck and notes to the collaborative group.');
    } catch (err: any) {
      setMergeFeedback(`Error pushing: ${err.message}`);
    } finally {
      setIsMerging(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl theme-bg-surface theme-border border shadow-2xl overflow-hidden animate-scaleIn transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 border-b theme-border flex items-center justify-between theme-bg-elevated/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold theme-text-primary">Collaborative Study Groups</h2>
                {activeRoom && (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                    isConnected ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30' : 'bg-amber-500/10 text-amber-500'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                    {isConnected ? 'LIVE SYNC' : 'CONNECTING'}
                  </span>
                )}
              </div>
              <p className="text-xs theme-text-secondary">
                {activeRoom 
                  ? `Room ${activeRoom.roomCode} · ${activeRoom.deckTitle}` 
                  : 'Real-time peer synchronization & async deck merging for study groups'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeRoom && (
              <button
                onClick={handleCopyCode}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg theme-bg-surface theme-border border text-xs font-semibold theme-text-primary hover:theme-bg-hover transition-colors cursor-pointer"
                title="Copy Room Code to share with peers"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5 text-indigo-500" />}
                <span>{copiedCode ? 'Copied Code!' : activeRoom.roomCode}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-lg theme-text-muted hover:theme-text-primary hover:theme-bg-elevated transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* User Identity Banner */}
        <div className="px-5 py-2.5 bg-indigo-500/5 border-b theme-border flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="theme-text-secondary">Your Scholar Identity:</span>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Your Name"
              className="px-2 py-1 rounded bg-transparent theme-border border text-xs font-semibold theme-text-primary focus:outline-none focus:border-indigo-500 w-36"
            />
          </div>
          <span className="theme-text-muted text-[11px] hidden sm:inline">
            All card edits &amp; activity will be credited to this name
          </span>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {!activeRoom ? (
            /* Lobby & Room Selection */
            <div className="space-y-6">
              {/* Join or Create Bar */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Join Existing Room */}
                <div className="p-4 rounded-xl theme-bg-elevated theme-border border">
                  <span className="block text-xs font-semibold uppercase theme-text-muted tracking-wider mb-2">
                    Join with Room Code
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={roomCodeInput}
                      onChange={(e) => setRoomCodeInput(e.target.value)}
                      placeholder="e.g. BIO-402, CALC-99"
                      className="flex-1 theme-bg-input theme-border border rounded-lg px-3 py-2 text-sm theme-text-primary uppercase font-mono tracking-wider focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      onClick={() => handleJoinByCode()}
                      disabled={!roomCodeInput.trim()}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Join Room
                    </button>
                  </div>
                  <span className="block text-[11px] theme-text-muted mt-2">
                    Enter the code shared by your study partner or classmates.
                  </span>
                </div>

                {/* Create New Room from Active Deck */}
                <div className="p-4 rounded-xl theme-bg-elevated theme-border border flex flex-col justify-between">
                  <div>
                    <span className="block text-xs font-semibold uppercase theme-text-muted tracking-wider mb-1">
                      Start Collaborative Session
                    </span>
                    <p className="text-xs theme-text-secondary mb-3">
                      Share your current deck ({localCards.length} flashcards, notes) in a live collaborative workspace.
                    </p>
                  </div>
                  <button
                    onClick={() => handleCreateRoom()}
                    className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create New Study Room</span>
                  </button>
                </div>
              </div>

              {/* Open Study Groups Demo List */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  <h3 className="text-xs font-semibold uppercase theme-text-muted tracking-wider">
                    Available Live Study Rooms
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {availableRooms.map((room) => (
                    <div 
                      key={room.roomCode}
                      className="p-4 rounded-xl theme-bg-elevated theme-border border hover:border-indigo-500/60 transition-all flex flex-col justify-between gap-3 group"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-xs font-bold text-indigo-500">
                            {room.roomCode}
                          </span>
                          <span className="text-[10px] theme-text-muted">
                            By {room.lastEditedBy}
                          </span>
                        </div>
                        <h4 className="text-sm font-semibold theme-text-primary group-hover:text-indigo-400 transition-colors">
                          {room.deckTitle}
                        </h4>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t theme-border text-xs">
                        <span className="theme-text-muted">
                          {room.cardCount} cards · {room.userCount || 1} peer(s)
                        </span>
                        <button
                          onClick={() => handleJoinByCode(room.roomCode)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-500 hover:text-indigo-400 cursor-pointer"
                        >
                          <span>Connect</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Active Connected Room Workspace */
            <div className="space-y-5">
              {/* Navigation Tabs inside Room */}
              <div className="flex items-center justify-between border-b theme-border pb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  {(['overview', 'cards', 'merge', 'chat'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer capitalize ${
                        activeTab === tab 
                          ? 'bg-indigo-600 text-white' 
                          : 'theme-bg-elevated theme-text-secondary hover:theme-text-primary'
                      }`}
                    >
                      {tab === 'merge' ? 'Async Merging' : tab}
                      {tab === 'cards' && ` (${activeRoom.cards.length})`}
                      {tab === 'chat' && chatLog.length > 0 && ` (${chatLog.length})`}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setActiveRoom(null)}
                  className="text-xs theme-text-muted hover:text-rose-500 transition-colors cursor-pointer"
                >
                  Leave Room
                </button>
              </div>

              {/* TAB 1: OVERVIEW & ACTIVE PEERS */}
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  {/* Active Peers Presence */}
                  <div className="p-4 rounded-xl theme-bg-elevated theme-border border">
                    <span className="block text-xs font-semibold uppercase theme-text-muted tracking-wider mb-2">
                      Connected Study Group Members
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-xs font-medium text-indigo-400">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>{userName} (You)</span>
                      </div>

                      {activeRoom.activeUsers
                        ?.filter(u => u.name !== userName)
                        .map(peer => (
                          <div 
                            key={peer.id}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full theme-bg-surface theme-border border text-xs font-medium theme-text-primary"
                          >
                            <span 
                              className="w-2.5 h-2.5 rounded-full" 
                              style={{ backgroundColor: peer.color || '#6366f1' }} 
                            />
                            <span>{peer.name}</span>
                            {peer.isHost && (
                              <span className="text-[9px] uppercase px-1 rounded bg-indigo-500/20 text-indigo-400">Host</span>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Room Deck Summary */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 rounded-xl theme-bg-elevated theme-border border">
                      <span className="text-xs theme-text-muted block mb-1">Shared Flashcards</span>
                      <span className="text-2xl font-bold theme-text-primary tabular-nums">
                        {activeRoom.cards.length}
                      </span>
                    </div>

                    <div className="p-4 rounded-xl theme-bg-elevated theme-border border">
                      <span className="text-xs theme-text-muted block mb-1">Source Notes</span>
                      <span className="text-2xl font-bold theme-text-primary tabular-nums">
                        {activeRoom.notes ? `${activeRoom.notes.length.toLocaleString()} chars` : 'Empty'}
                      </span>
                    </div>

                    <div className="p-4 rounded-xl theme-bg-elevated theme-border border">
                      <span className="text-xs theme-text-muted block mb-1">Last Update</span>
                      <span className="text-xs font-medium theme-text-primary block mt-2">
                        {activeRoom.lastEditedBy ? `By ${activeRoom.lastEditedBy}` : 'Just now'}
                      </span>
                    </div>
                  </div>

                  {/* Activity Log */}
                  <div className="p-4 rounded-xl theme-bg-elevated theme-border border">
                    <span className="block text-xs font-semibold uppercase theme-text-muted tracking-wider mb-2">
                      Recent Group Activity
                    </span>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto text-xs">
                      {activeRoom.activityLog?.slice(-6).reverse().map((act) => (
                        <div key={act.id} className="flex items-center justify-between text-xs theme-text-secondary py-1 border-b theme-border last:border-0">
                          <span className="font-medium theme-text-primary">
                            <span className="text-indigo-400">{act.user}</span>: {act.action}
                          </span>
                          <span className="text-[10px] theme-text-muted">
                            {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: FLASHCARDS LIST & LIVE ADDITION */}
              {activeTab === 'cards' && (
                <div className="space-y-4">
                  {/* Add New Card Bar */}
                  <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30">
                    <span className="block text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">
                      Contribute a Card to the Group
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      <input
                        type="text"
                        value={newCardFront}
                        onChange={(e) => setNewCardFront(e.target.value)}
                        placeholder="Front / Prompt (e.g. Definition or Question)"
                        className="theme-bg-input theme-border border rounded-lg px-3 py-2 text-xs theme-text-primary focus:outline-none focus:border-indigo-500"
                      />
                      <input
                        type="text"
                        value={newCardBack}
                        onChange={(e) => setNewCardBack(e.target.value)}
                        placeholder="Back / Answer"
                        className="theme-bg-input theme-border border rounded-lg px-3 py-2 text-xs theme-text-primary focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <button
                      onClick={handleAddCardToRoom}
                      disabled={!newCardFront.trim() || !newCardBack.trim()}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Broadcast Card to Peers
                    </button>
                  </div>

                  {/* Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto">
                    {activeRoom.cards.map((card, idx) => (
                      <div 
                        key={card.id || idx}
                        className="p-3 rounded-xl theme-bg-elevated theme-border border relative group text-xs"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-[10px] text-indigo-400 font-semibold">
                            CARD #{idx + 1}
                          </span>
                          <button
                            onClick={() => handleDeleteCardFromRoom(card.id)}
                            className="opacity-0 group-hover:opacity-100 text-rose-500 hover:text-rose-400 transition-opacity"
                            title="Remove card"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="font-semibold theme-text-primary mb-1">{card.front}</p>
                        <p className="theme-text-secondary">{card.back}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: ASYNC MERGING */}
              {activeTab === 'merge' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl theme-bg-elevated theme-border border">
                    <div className="flex items-center gap-2 mb-2">
                      <GitMerge className="w-4 h-4 text-indigo-500" />
                      <h4 className="text-sm font-bold theme-text-primary">
                        Async Deck Merging &amp; Conflict Resolution
                      </h4>
                    </div>
                    <p className="text-xs theme-text-secondary mb-4">
                      Merge your individual flashcards and notes with the group deck without overwriting your personal retention scores or duplicates.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <div className="p-3 rounded-lg theme-bg-surface theme-border border text-xs">
                        <span className="font-bold theme-text-primary block mb-1">Your Local Workspace</span>
                        <span className="theme-text-secondary block">Title: {localTitle || 'Untitled'}</span>
                        <span className="theme-text-secondary block">{localCards.length} flashcards</span>
                        <span className="theme-text-secondary block">{localNotes.length} notes characters</span>
                      </div>

                      <div className="p-3 rounded-lg theme-bg-surface theme-border border text-xs">
                        <span className="font-bold text-indigo-400 block mb-1">Group Study Deck</span>
                        <span className="theme-text-secondary block">Title: {activeRoom.deckTitle}</span>
                        <span className="theme-text-secondary block">{activeRoom.cards.length} flashcards</span>
                        <span className="theme-text-secondary block">{activeRoom.notes.length} notes characters</span>
                      </div>
                    </div>

                    {mergeFeedback && (
                      <div className="mb-4 p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-xs text-indigo-400 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 shrink-0" />
                        <span>{mergeFeedback}</span>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={handlePerformSmartMerge}
                        disabled={isMerging}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <GitMerge className="w-4 h-4" />
                        <span>Smart Merge: Combine Unique Cards into My Deck</span>
                      </button>

                      <button
                        onClick={handlePushLocalToRoom}
                        disabled={isMerging}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg theme-bg-surface theme-border border text-xs font-semibold theme-text-primary hover:theme-bg-hover transition-colors cursor-pointer"
                      >
                        <span>Push My Cards to Study Group</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: GROUP CHAT & PINGS */}
              {activeTab === 'chat' && (
                <div className="space-y-3">
                  <div className="h-60 overflow-y-auto p-3 rounded-xl theme-bg-elevated theme-border border space-y-2">
                    {chatLog.length === 0 ? (
                      <p className="text-xs theme-text-muted text-center py-10">
                        No messages yet. Send a question or note to your study group!
                      </p>
                    ) : (
                      chatLog.map((c, i) => (
                        <div key={i} className="text-xs">
                          <span className="font-bold text-indigo-400">{c.user}: </span>
                          <span className="theme-text-primary">{c.text}</span>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                      placeholder="Type a note to your study group..."
                      className="flex-1 theme-bg-input theme-border border rounded-lg px-3 py-2 text-xs theme-text-primary focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      onClick={handleSendChat}
                      className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t theme-border theme-bg-elevated/40 flex items-center justify-between text-xs">
          <span className="theme-text-muted">
            {activeRoom 
              ? `Connected to ${activeRoom.roomCode} · Changes broadcast instantaneously via WebSockets` 
              : 'End-to-end synchronized study groups with async merge conflict resolution'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg theme-bg-elevated theme-border border hover:theme-bg-hover theme-text-primary font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
