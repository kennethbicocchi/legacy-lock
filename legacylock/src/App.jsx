import { useState, useEffect, useRef } from 'react';
import CryptoJS from 'crypto-js';
// Import the crypto-js source code as a raw string to embed in the standalone HTML
import cryptoJsSource from 'crypto-js/crypto-js.js?raw';

export default function App() {
  // Constants
  const STORAGE_KEY = 'legacyNote';
  const DURATION_KEY = 'legacyDuration';

  // State Management
  const [masterPassword, setMasterPassword] = useState('');
  const [secretNote, setSecretNote] = useState('');
  
  // Check-in Frequency (Initialize from localStorage or default to 30s)
  const [selectedDuration, setSelectedDuration] = useState(() => {
    const saved = localStorage.getItem(DURATION_KEY);
    return saved ? parseInt(saved, 10) : 30;
  });
  
  const [timeLeft, setTimeLeft] = useState(selectedDuration);
  
  // Ref for the hidden file input
  const fileInputRef = useRef(null);

  // Attempt decryption on initial load
  useEffect(() => {
    const encryptedData = localStorage.getItem(STORAGE_KEY);
    if (encryptedData) {
      try {
        const bytes = CryptoJS.AES.decrypt(encryptedData, '');
        const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
        if (decryptedText) {
          setSecretNote(decryptedText);
        }
      } catch (error) {
        // Expected if protected by a real password
      }
    }
  }, []);

  // Countdown timer effect
  useEffect(() => {
    if (timeLeft <= 0) return;

    const timerId = setInterval(() => {
      setTimeLeft((prevTime) => prevTime - 1);
    }, 1000);

    return () => clearInterval(timerId);
  }, [timeLeft]);

  // Global Interaction Handler for the Dead Man's Switch
  const handleInteraction = () => {
    // Only reset if we've lost at least 1 second to prevent excessive re-renders
    setTimeLeft(prev => (prev < selectedDuration ? selectedDuration : prev));
  };

  // Handler for duration changes
  const handleDurationChange = (e) => {
    const newDuration = parseInt(e.target.value, 10);
    setSelectedDuration(newDuration);
    localStorage.setItem(DURATION_KEY, newDuration.toString());
    setTimeLeft(newDuration); // Immediately reset timer to new duration
  };

  // Handler for master password changes
  const handlePasswordChange = (e) => {
    const pwd = e.target.value;
    setMasterPassword(pwd);
    
    const encryptedData = localStorage.getItem(STORAGE_KEY);
    if (encryptedData) {
      try {
        const bytes = CryptoJS.AES.decrypt(encryptedData, pwd);
        const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
        if (decryptedText) {
          setSecretNote(decryptedText);
        } else {
          setSecretNote('');
        }
      } catch (error) {
        setSecretNote(''); 
      }
    }
  };

  // Handler for text area changes
  const handleNoteChange = (e) => {
    const newText = e.target.value;
    setSecretNote(newText);
    
    // Encrypt before saving
    const encryptedText = CryptoJS.AES.encrypt(newText, masterPassword).toString();
    localStorage.setItem(STORAGE_KEY, encryptedText);
  };

  // Format seconds into a readable string
  const formatTime = (totalSeconds) => {
    if (totalSeconds < 60) return `00:${totalSeconds.toString().padStart(2, '0')}`;
    
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (days > 0) {
      return `${days}d ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Export Vault to JSON
  const handleExportJSON = () => {
    const encryptedData = localStorage.getItem(STORAGE_KEY) || '';
    const data = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      payload: encryptedData,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `legacy-vault-${new Date().getTime()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import Vault from JSON
  const handleImportJSON = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        if (json.payload !== undefined) {
          localStorage.setItem(STORAGE_KEY, json.payload);
          try {
            const bytes = CryptoJS.AES.decrypt(json.payload, masterPassword);
            const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
            setSecretNote(decryptedText || '');
          } catch (err) {
            setSecretNote('');
          }
        } else {
          alert('Invalid vault file format.');
        }
      } catch (err) {
        alert('Error parsing the file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Export as Standalone HTML
  const handleExportHTML = () => {
    const encryptedData = localStorage.getItem(STORAGE_KEY) || '';
    const safeCryptoJsSource = cryptoJsSource.replace(/<\/script>/gi, '<\\/script>');
    const lastUpdated = new Date().toLocaleString();

    const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Legacy Lock - Offline Vault</title>
    <style>
        body {
            background-color: #09090b;
            color: #34d399;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
            margin: 0;
            padding: 2rem;
            display: flex;
            flex-direction: column;
            align-items: center;
            min-height: 100vh;
        }
        .container {
            width: 100%;
            max-width: 800px;
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
            flex: 1;
        }
        h1 {
            color: #6ee7b7;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            margin-bottom: 0;
        }
        p { color: #059669; }
        .input-group {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }
        label {
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: #047857;
        }
        input, textarea {
            background-color: rgba(0, 0, 0, 0.5);
            border: 1px solid rgba(6, 78, 59, 0.5);
            border-radius: 0.25rem;
            padding: 0.75rem;
            color: #6ee7b7;
            font-family: inherit;
        }
        input:focus, textarea:focus {
            outline: none;
            border-color: rgba(16, 185, 129, 0.5);
        }
        textarea {
            height: 300px;
            resize: none;
            line-height: 1.5;
        }
        button {
            background-color: transparent;
            border: 1px solid rgba(5, 150, 105, 0.5);
            color: #10b981;
            padding: 0.5rem 1rem;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            cursor: pointer;
            transition: all 0.2s;
        }
        button:hover { background-color: rgba(6, 78, 59, 0.3); }
        .error { color: #ef4444; font-size: 0.875rem; display: none; }
        .footer {
            margin-top: auto;
            padding-top: 2rem;
            font-size: 0.7rem;
            color: #047857;
            text-align: center;
            text-transform: uppercase;
            letter-spacing: 0.1em;
        }
    </style>
</head>
<body>
    <div class="container">
        <div>
            <h1>Legacy Lock - Offline Vault</h1>
            <p>Enter the master password to unlock the payload.</p>
        </div>
        
        <div class="input-group">
            <label for="password">Encryption Key / Master Password</label>
            <div style="display: flex; gap: 1rem;">
                <input type="password" id="password" style="flex: 1;" placeholder="Enter password...">
                <button id="decryptBtn">Unlock Payload</button>
            </div>
            <span id="errorMsg" class="error">Decryption failed. Incorrect password or corrupted data.</span>
        </div>

        <div class="input-group">
            <label>Recovered Payload</label>
            <textarea id="output" readonly placeholder="Waiting for decryption..."></textarea>
        </div>
        
        <div class="footer">
            Vault Last Updated: ${lastUpdated}
        </div>
    </div>

    <!-- Embedded CryptoJS library -->
    <script>
      ${safeCryptoJsSource}
    </script>
    
    <!-- Offline Decryption Logic -->
    <script>
        const encryptedPayload = "${encryptedData}";
        
        document.getElementById('decryptBtn').addEventListener('click', () => {
            const pwd = document.getElementById('password').value;
            const errorMsg = document.getElementById('errorMsg');
            const output = document.getElementById('output');
            
            try {
                const bytes = CryptoJS.AES.decrypt(encryptedPayload, pwd);
                const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
                
                if (decryptedText) {
                    output.value = decryptedText;
                    errorMsg.style.display = 'none';
                    output.style.borderColor = 'rgba(16, 185, 129, 0.8)';
                } else {
                    throw new Error('Empty');
                }
            } catch (err) {
                output.value = '';
                errorMsg.style.display = 'block';
                output.style.borderColor = 'rgba(239, 68, 68, 0.5)';
            }
        });
    </script>
</body>
</html>`;

    const blob = new Blob([htmlTemplate], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `offline-vault-${new Date().getTime()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Emergency Trigger View
  if (timeLeft === 0) {
    return (
      <div className="min-h-screen bg-zinc-950 text-emerald-500 font-mono flex flex-col items-center justify-center p-6">
        <div className="max-w-2xl w-full border border-red-500/30 bg-red-950/20 p-8 rounded-lg shadow-[0_0_50px_rgba(239,68,68,0.15)] text-center animate-pulse-slow">
          <h1 className="text-4xl font-bold text-red-500 mb-4 tracking-widest uppercase">Data Released</h1>
          <p className="text-red-400 mb-8 border-b border-red-500/20 pb-6">
            In a real scenario, this data would now be sent to your emergency contact.
          </p>
          
          <div className="text-left bg-black/50 p-6 rounded border border-zinc-800 h-64 overflow-y-auto">
            <h2 className="text-xs text-zinc-500 uppercase tracking-widest mb-4">Recovered Payload (Decrypted)</h2>
            <div className="whitespace-pre-wrap text-emerald-400/80">
              {secretNote || '[NO DATA ENTERED OR ENCRYPTED WITH UNKNOWN KEY]'}
            </div>
          </div>
          
          <button 
            onClick={() => setTimeLeft(selectedDuration)}
            className="mt-8 px-6 py-2 border border-emerald-600/50 text-emerald-500 hover:bg-emerald-950/30 transition-colors uppercase tracking-widest text-sm"
          >
            System Reset
          </button>
        </div>
      </div>
    );
  }

  // The Vault UI (wrapped in interaction handlers for dead man's switch)
  return (
    <div 
      className="min-h-screen bg-zinc-950 text-emerald-400 font-mono flex flex-col items-center py-12 px-4 sm:px-6"
      onMouseMove={handleInteraction}
      onKeyDown={handleInteraction}
      onClick={handleInteraction}
    >
      <div className="w-full max-w-4xl flex flex-col gap-6">
        
        {/* Header Section */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-emerald-900/50 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-widest uppercase text-emerald-300">Legacy Lock</h1>
            <p className="text-emerald-600/70 text-sm mt-1">Secure Digital Vault</p>
          </div>
          
          {/* Visual Countdown Timer */}
          <div className="mt-4 sm:mt-0 flex items-center gap-4 bg-black/40 px-6 py-3 rounded border border-emerald-900/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-widest text-emerald-600">Signal Loss In</span>
              
              {/* Check-in Frequency Selector */}
              <select 
                value={selectedDuration} 
                onChange={handleDurationChange}
                className="mt-1 bg-zinc-900 border border-emerald-800 text-emerald-400 text-xs rounded px-1 py-0.5 outline-none focus:border-emerald-500"
              >
                <option value={30}>30 Seconds (Test)</option>
                <option value={86400}>24 Hours</option>
                <option value={604800}>7 Days</option>
                <option value={2592000}>30 Days</option>
              </select>
            </div>
            
            <span className={`text-3xl font-bold w-32 text-right ${timeLeft <= 60 && selectedDuration > 60 || timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-emerald-400'}`}>
              {formatTime(timeLeft)}
            </span>
          </div>
        </header>

        {/* Master Password Field */}
        <section className="flex flex-col gap-2">
          <label htmlFor="masterPassword" className="text-xs uppercase tracking-widest text-emerald-700">
            Encryption Key / Master Password
          </label>
          <input
            id="masterPassword"
            type="password"
            value={masterPassword}
            onChange={handlePasswordChange}
            placeholder="Enter password to decrypt or encrypt..."
            className="w-full bg-black/50 border border-emerald-900/50 rounded p-3 text-emerald-300 placeholder:text-emerald-800/50 focus:outline-none focus:border-emerald-500/50 transition-colors"
          />
        </section>

        {/* Editor Section */}
        <main className="flex-1 flex flex-col mt-2">
          <div className="relative flex-1 group">
            <div className="absolute -inset-0.5 bg-emerald-900/20 rounded-lg blur opacity-50 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
            <textarea
              value={secretNote}
              onChange={handleNoteChange}
              placeholder="Enter your Digital Legacy here... (System is monitoring interactions)"
              className="relative w-full h-[50vh] bg-zinc-900/80 border border-emerald-900/50 rounded-lg p-6 text-emerald-100 placeholder:text-emerald-800/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 resize-none leading-relaxed transition-all"
              spellCheck="false"
            />
          </div>
          <div className="flex justify-between items-center mt-4 text-xs text-emerald-700 uppercase tracking-widest">
            <span>Status: Connected</span>
            <span>Encryption: {masterPassword ? 'AES-256 Active' : 'None (No Key Provided)'}</span>
          </div>
        </main>

        {/* Maintenance / Backup Section */}
        <section className="mt-8 border-t border-emerald-900/50 pt-8">
          <h2 className="text-xs uppercase tracking-widest text-emerald-700 mb-4">Vault Maintenance & Backup</h2>
          
          <div className="flex flex-wrap gap-4">
            <button 
              onClick={handleExportJSON}
              className="px-4 py-2 border border-emerald-800 text-emerald-500 hover:bg-emerald-900/30 transition-colors text-sm uppercase tracking-wider"
            >
              Export Vault (.json)
            </button>
            
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 border border-emerald-800 text-emerald-500 hover:bg-emerald-900/30 transition-colors text-sm uppercase tracking-wider"
            >
              Import Vault (.json)
            </button>
            <input 
              type="file" 
              accept=".json" 
              ref={fileInputRef} 
              onChange={handleImportJSON} 
              className="hidden" 
            />

            <button 
              onClick={handleExportHTML}
              className="px-4 py-2 bg-emerald-900/40 border border-emerald-700 text-emerald-400 hover:bg-emerald-800/50 transition-colors text-sm uppercase tracking-wider ml-auto"
            >
              Export Standalone HTML
            </button>
          </div>
          <p className="text-emerald-800/70 text-xs mt-4">
            * Standalone HTML contains the decryption logic and your encrypted payload. It can be safely stored on a USB drive and opened without internet access.
          </p>
        </section>

      </div>
    </div>
  );
}
