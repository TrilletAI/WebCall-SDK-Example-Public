import React, { useEffect, useState, useRef } from 'react';
import { TrilletAgent } from '@trillet-ai/web-sdk';
import { TRILLET_CONFIG } from '../config';
import './TrilletCall.css';

interface Transcript {
  role: "user" | "assistant";
  text: string;
  isFinal: boolean;
  timestamp: Date;
  participantId?: string;
  toolUsed?: {
    name: string;
    args?: any;
    status?: "pending" | "success" | "error";
  };
}

// Voice Call Component - Center of Page
const VoiceCall: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isAssistantSpeaking, setIsAssistantSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioStatus, setAudioStatus] = useState<string>('');
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const agentRef = useRef<TrilletAgent | null>(null);

  useEffect(() => {
    if (!TRILLET_CONFIG.WORKSPACE_ID || !TRILLET_CONFIG.AGENT_ID) {
      setError('Workspace ID or Agent ID is missing. Please check your .env file');
      return;
    }

    agentRef.current = new TrilletAgent({
      workspaceId: TRILLET_CONFIG.WORKSPACE_ID,
      agentId: TRILLET_CONFIG.AGENT_ID,
      mode: "voice"
    });
    
    agentRef.current.on('connected', () => {
      setIsConnected(true);
      setError(null);
      setAudioStatus('Connected and ready');
    });

    agentRef.current.on('disconnected', () => {
      setIsConnected(false);
      setAudioStatus('');
    });

    agentRef.current.on('error', (err: Error) => {
      setError(err.message || 'An error occurred');
      setAudioStatus('');
    });

    agentRef.current.on('assistantStartedSpeaking', () => {
      setIsAssistantSpeaking(true);
    });

    agentRef.current.on('assistantStoppedSpeaking', () => {
      setIsAssistantSpeaking(false);
    });

    agentRef.current.on('message', (message: { text: string }) => {
      console.log('Agent First Message:', message.text);
    });

    agentRef.current.on('transcriptUpdate', (updatedTranscripts: Transcript[]) => {
      console.log('Transcript Update:', updatedTranscripts);
      setTranscripts([...updatedTranscripts]);
    });

    agentRef.current.on('assistantStartedSpeaking', () => {
      console.log('🎙️ Agent started speaking');
    });

    agentRef.current.on('assistantStoppedSpeaking', () => {
      console.log('🎙️ Agent stopped speaking');
    });

    return () => {
      if (agentRef.current) {
        agentRef.current.endCall();
      }
    };
  }, []);

  const handleConnect = async () => {
    try {
      setError(null);
      setAudioStatus('Connecting...');
      await agentRef.current?.startPublicCall();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to connect');
      setAudioStatus('');
    }
  };

  const handleDisconnect = () => {
    console.log('Ending private call...');
    agentRef.current?.endCall();
  };

  const toggleMute = () => {
    const newMuteState = !isMuted;
    console.log(`${newMuteState ? 'Muting' : 'Unmuting'} microphone`);
    agentRef.current?.toggleMicrophone(!newMuteState);
    setIsMuted(newMuteState);
  };

  return (
    <div className="voice-call-container">
      <h1 className="voice-call-title">Voice Assistant</h1>
      <p className="voice-call-subtitle">Click to start talking with your AI assistant</p>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className={`voice-status ${isConnected ? 'connected' : error ? 'error' : ''}`}>
        <div className={`status-dot ${isConnected ? 'connected' : error ? 'error' : 'disconnected'}`} />
        {isConnected ? 'Connected' : error ? 'Error' : 'Ready to connect'}
      </div>

      {audioStatus && (
        <div className="audio-status">
          🎤 {audioStatus}
        </div>
      )}

      {isAssistantSpeaking && (
        <div className="assistant-speaking">
          🎙️ Assistant is speaking...
        </div>
      )}

      <button 
        onClick={isConnected ? handleDisconnect : handleConnect}
        className={`call-button ${isConnected ? 'connected' : ''}`}
        disabled={!!error}
      >
        {isConnected ? '📴' : '📞'}
      </button>

      {isConnected && (
        <div className="voice-controls">
          <button onClick={toggleMute} className={`mute-btn ${isMuted ? 'muted' : ''}`}>
            <span>{isMuted ? '🔇' : '🎙️'}</span>
            {isMuted ? 'Unmute' : 'Mute'}
          </button>
        </div>
      )}

      {/* Transcript Display */}
      {transcripts.length > 0 && (
        <div className="transcript-container">
          <h3 className="transcript-title">Conversation</h3>
          <div className="transcript-messages">
            {transcripts.map((transcript, index) => (
              <div key={index} className={`transcript-message ${transcript.role}`}>
                <div className="transcript-role">
                  {transcript.role === 'assistant' ? '🤖 Agent' : '👤 User'}
                </div>
                <div className="transcript-text">{transcript.text}</div>
                <div className="transcript-time">
                  {transcript.timestamp.toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Chat Widget Component - Bottom Right
const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [inputValue, setInputValue] = useState('');
  const agentRef = useRef<TrilletAgent | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [transcripts]);

  useEffect(() => {
    if (!TRILLET_CONFIG.WORKSPACE_ID || !TRILLET_CONFIG.AGENT_ID) {
      setError('Configuration missing');
      return;
    }

    agentRef.current = new TrilletAgent({
      workspaceId: TRILLET_CONFIG.WORKSPACE_ID,
      agentId: TRILLET_CONFIG.AGENT_ID,
      mode: 'text',
    });

    agentRef.current.on('connected', () => {
      setIsConnected(true);
      setError(null);
    });

    agentRef.current.on('disconnected', () => {
      setIsConnected(false);
    });

    agentRef.current.on('error', (err: Error) => {
      setError(err.message || 'An error occurred');
    });

    agentRef.current.on('message', (message: { text: string }) => {
      console.log('🤖 Agent Message:', message.text);
    });

    agentRef.current.on('transcriptUpdate', (updatedTranscripts: Transcript[]) => {
      if (updatedTranscripts.length > transcripts.length) {
        const latestTranscript = updatedTranscripts[updatedTranscripts.length - 1];
        if (latestTranscript && latestTranscript.isFinal) {
          const label = latestTranscript.role === 'assistant' ? '🤖 Agent' : '👤 User';
          console.log(`${label} Message:`, latestTranscript.text);
        }
      }
      setTranscripts([...updatedTranscripts]);
    });

    return () => {
      if (agentRef.current) {
        agentRef.current.endCall();
      }
    };
  }, []);

  const handleConnect = async () => {
    try {
      setError(null);
      await agentRef.current?.startPublicCall();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to connect');
    }
  };

  const handleDisconnect = () => {
    agentRef.current?.endCall();
    setTranscripts([]);
  };

  const handleSendMessage = () => {
    if (inputValue.trim() && isConnected) {
      agentRef.current?.sendTextMessage(inputValue);
      setInputValue('');
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="chat-widget">
      <button 
        className="chat-toggle"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? '✕' : '💬'}
      </button>
      
      <div className={`chat-container ${isOpen ? 'open' : ''}`}>
        <div className="chat-header">
          <div className="chat-title">Chat Assistant</div>
          <button className="chat-close" onClick={() => setIsOpen(false)}>
            ✕
          </button>
        </div>
        
        <div className="chat-status">
          <div className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`} />
          {isConnected ? 'Connected' : 'Disconnected'}
        </div>

        <div className="chat-messages">
          {!isConnected && !error && (
            <div className="message assistant">
              <div>Hi! Click "Start Chat" to begin our conversation.</div>
            </div>
          )}
          
          {transcripts.map((transcript, index) => (
            <div key={index} className={`message ${transcript.role}`}>
              <div>{transcript.text}</div>
              <div className="message-time">
                {new Date(transcript.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-area">
          {!isConnected ? (
            <button 
              onClick={handleConnect} 
              className="send-btn"
              style={{ width: '100%', borderRadius: '20px', height: '40px' }}
              disabled={!!error}
            >
              Start Chat
            </button>
          ) : (
            <>
              <div className="chat-input-container">
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  className="chat-input"
                  rows={1}
                />
                <button 
                  onClick={handleSendMessage} 
                  className="send-btn"
                  disabled={!inputValue.trim()}
                >
                  ➤
                </button>
              </div>
              <button 
                onClick={handleDisconnect}
                style={{ 
                  marginTop: '0.5rem', 
                  padding: '0.5rem 1rem', 
                  background: 'transparent', 
                  border: '1px solid var(--trillet-border)', 
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  color: 'var(--trillet-text-secondary)'
                }}
              >
                End Chat
              </button>
            </>
          )}
        </div>
        
        {error && <div className="error-message">{error}</div>}
      </div>
    </div>
  );
};

// Main component
const TrilletCall: React.FC = () => {
  return (
    <div className="trillet-call">
      <VoiceCall />
      <ChatWidget />
    </div>
  );
};

export default TrilletCall; 