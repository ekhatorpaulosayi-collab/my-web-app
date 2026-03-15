// ADD THIS TO YOUR AIChatWidget.tsx
// This is a simplified version that's easy to implement

// 1. Add these state variables (around line 201)
const [bubbleText, setBubbleText] = useState('Need Help?');
const [showPulse, setShowPulse] = useState(false);
const [idleTime, setIdleTime] = useState(0);

// 2. Add this useEffect for bubble text (after line 294)
useEffect(() => {
  // Determine what text to show
  const updateBubbleText = () => {
    // Check quota first (most important)
    if (quotaInfo && quotaInfo.chatLimit > 0) {
      const remaining = quotaInfo.chatLimit - (quotaInfo.chatsUsed || 0);
      if (remaining <= 10 && remaining > 0) {
        setBubbleText(`${remaining} chats left`);
        return;
      }
    }

    // Check if first visit
    const hasUsedChat = localStorage.getItem('storehouse_chat_used');
    if (!hasUsedChat) {
      setBubbleText('Need Help?');
      // Pulse animation for new users
      setTimeout(() => setShowPulse(true), 5000);
      setTimeout(() => setShowPulse(false), 10000); // Stop after 5 seconds
      return;
    }

    // Page-specific help
    const pathname = window.location.pathname;
    if (pathname.includes('/products')) {
      setBubbleText('Help with products?');
    } else if (pathname.includes('/sales')) {
      setBubbleText('Record a sale?');
    } else if (pathname.includes('/reports')) {
      setBubbleText('View reports?');
    } else if (pathname.includes('/inventory')) {
      setBubbleText('Track inventory?');
    } else if (pathname.includes('/customers')) {
      setBubbleText('Manage customers?');
    } else {
      setBubbleText('Ask AI');
    }
  };

  updateBubbleText();
}, [quotaInfo, location.pathname]);

// 3. Simple idle detection (after line 330)
useEffect(() => {
  if (!isOpen) {
    let idleTimer;

    const resetIdle = () => {
      setIdleTime(0);
    };

    const incrementIdle = () => {
      setIdleTime(prev => {
        const newTime = prev + 1;
        // Show bounce after 30 seconds idle
        if (newTime === 30) {
          setShowPulse(true);
          setTimeout(() => setShowPulse(false), 3000);
        }
        return newTime;
      });
    };

    // Reset on any activity
    window.addEventListener('mousemove', resetIdle);
    window.addEventListener('click', resetIdle);
    window.addEventListener('keypress', resetIdle);

    // Increment every second
    idleTimer = setInterval(incrementIdle, 1000);

    return () => {
      window.removeEventListener('mousemove', resetIdle);
      window.removeEventListener('click', resetIdle);
      window.removeEventListener('keypress', resetIdle);
      clearInterval(idleTimer);
    };
  }
}, [isOpen]);

// 4. Update the bubble JSX (replace the bubble around line 950)
{!isOpen && (
  <button
    onClick={() => {
      setIsOpen(true);
      localStorage.setItem('storehouse_chat_used', 'true');
    }}
    className={`chat-bubble ${showPulse ? 'pulse-animation' : ''}`}
    style={{
      position: 'fixed',
      bottom: '20px',
      right: contextType === 'storefront' ? '120px' : '20px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      border: 'none',
      borderRadius: '50px',
      padding: '12px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      cursor: 'pointer',
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      fontSize: '16px',
      fontWeight: '500',
      zIndex: 9999,
      transition: 'all 0.3s ease',
      pointerEvents: 'auto',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'scale(1.05)';
      e.currentTarget.style.boxShadow = '0 6px 25px rgba(0,0,0,0.2)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'scale(1)';
      e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)';
    }}
  >
    <span style={{ fontSize: '20px' }}>🤖</span>
    <span style={{
      fontSize: '14px',
      fontWeight: '500',
      letterSpacing: '0.3px'
    }}>
      {bubbleText}
    </span>
    {/* Show notification dot for low quota */}
    {quotaInfo && quotaInfo.chatLimit > 0 &&
     quotaInfo.chatLimit - quotaInfo.chatsUsed <= 5 && (
      <span style={{
        position: 'absolute',
        top: '-5px',
        right: '-5px',
        background: '#ff4444',
        width: '12px',
        height: '12px',
        borderRadius: '50%',
        border: '2px solid white',
      }} />
    )}
  </button>
)}

// 5. Add these CSS styles (in a separate CSS file or styled component)
const styles = `
  .chat-bubble {
    animation: subtle-entrance 0.5s ease-out;
  }

  .chat-bubble.pulse-animation {
    animation: pulse-glow 1s ease-in-out 3;
  }

  @keyframes subtle-entrance {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes pulse-glow {
    0%, 100% {
      box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3);
    }
    50% {
      box-shadow: 0 4px 30px rgba(102, 126, 234, 0.6);
      transform: scale(1.05);
    }
  }

  /* Mobile responsive */
  @media (max-width: 768px) {
    .chat-bubble span:nth-child(2) {
      display: none; /* Hide text on very small screens */
    }

    .chat-bubble {
      padding: 12px !important;
      border-radius: 50% !important;
    }
  }
`;