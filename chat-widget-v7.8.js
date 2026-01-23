
(function() {
  // Atlas Chat Widget v7.8 (History Feature, 350px Width, Semibold Title)
  console.log("Atlas Chat Widget v7.8 Loaded");

  const config = window.AtlasChatConfig || {};
  const WEBHOOK_URL = config.webhookUrl || 'https://n8n.srv1248886.hstgr.cloud/webhook/4091fa09-fb9a-4039-9411-7104d213f601/chat';

  if (!WEBHOOK_URL) return console.error('Atlas Chat: Brak Webhook URL!');

  // 1. Dependencies
  if (!document.getElementById('atlas-font')) {
    const link = document.createElement('link');
    link.id = 'atlas-font';
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }

  if (!document.getElementById('atlas-tailwind')) {
    const script = document.createElement('script');
    script.id = 'atlas-tailwind';
    script.src = 'https://cdn.tailwindcss.com';
    script.onload = () => {
      window.tailwind.config = {
        theme: {
          extend: {
            fontFamily: { sans: ['Inter', 'sans-serif'] },
            colors: { onyx: { DEFAULT: '#111111', light: '#353535' } },
            boxShadow: { 'soft': '0 4px 20px rgba(0, 0, 0, 0.08)' }
          }
        }
      };
      initWidget();
    };
    document.head.appendChild(script);
  } else {
    initWidget();
  }

  // 2. Widget Logic
  function initWidget() {
    if (document.getElementById('atlas-widget-root')) return;

    // A. CSS
    const style = document.createElement('style');
    style.innerHTML = `
      .atlas-no-scrollbar::-webkit-scrollbar { display: none; }
      .atlas-no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      @keyframes atlas-fade-in-up { 
        0% { opacity: 0; transform: translateY(10px) scale(0.98); } 
        100% { opacity: 1; transform: translateY(0) scale(1); } 
      }
      .animate-fade-in-up { animation: atlas-fade-in-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards !important; }
      @keyframes atlas-bounce { 
        0%, 100% { transform: translateY(0); } 
        50% { transform: translateY(-25%); } 
      }
      .animate-bounce { animation: atlas-bounce 1s infinite !important; }
      .atlas-spring { transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1) !important; }
      .atlas-link-user { color: #93C5FD; text-decoration: underline; }
      .atlas-link-user:hover { color: #BFDBFE; }
      .atlas-link-bot { color: #2563EB; text-decoration: underline; }
      .atlas-link-bot:hover { color: #1E40AF; }
      .atlas-history-item:hover .atlas-delete-btn { opacity: 1; }
    `;
    document.head.appendChild(style);

    // B. State Management
    const STORAGE_KEY_SESSIONS = 'atlas_chat_sessions';
    const STORAGE_KEY_OPEN = 'atlas_chat_is_open';
    const STORAGE_KEY_STARTED = 'atlas_chat_started'; // Persist started state per session logically, but globally for UI simplicity

    let isOpen = localStorage.getItem(STORAGE_KEY_OPEN) === 'true';
    let hasStarted = localStorage.getItem(STORAGE_KEY_STARTED) === 'true';
    let currentView = 'chat'; // 'chat' or 'history'
    let sessions = [];
    let currentSessionId = null;
    let isDisclaimerClosed = false;

    // Migration / Loading Logic
    const loadSessions = () => {
        const saved = localStorage.getItem(STORAGE_KEY_SESSIONS);
        if (saved) {
            sessions = JSON.parse(saved);
            // Default to most recent
            if (sessions.length > 0 && !currentSessionId) {
                currentSessionId = sessions[0].id;
            }
        } else {
            // Check for legacy single-session data
            const legacyMsgs = localStorage.getItem('atlas_chat_messages');
            if (legacyMsgs) {
                const msgs = JSON.parse(legacyMsgs);
                const id = localStorage.getItem('chat_session_id') || Date.now().toString();
                const newSession = {
                    id: id,
                    messages: msgs,
                    timestamp: Date.now(),
                    preview: msgs[msgs.length - 1]?.text || 'Rozmowa'
                };
                sessions = [newSession];
                currentSessionId = id;
                localStorage.removeItem('atlas_chat_messages');
                saveSessions();
            } else {
                createNewSession();
            }
        }
    };

    const saveSessions = () => {
        localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions));
    };

    const persistUiState = () => {
        localStorage.setItem(STORAGE_KEY_OPEN, isOpen);
        localStorage.setItem(STORAGE_KEY_STARTED, hasStarted);
    };

    const createNewSession = () => {
        const newId = Date.now().toString();
        const welcomeMsg = [{ id: '1', sender: 'bot', text: 'Cześć, jestem Atlas - Asystent AI, jak mogę ci dzisiaj pomóc?' }];
        const newSession = {
            id: newId,
            messages: welcomeMsg,
            timestamp: Date.now(),
            preview: 'Nowa rozmowa'
        };
        sessions.unshift(newSession); // Add to top
        currentSessionId = newId;
        hasStarted = false; // Reset start for new chat
        currentView = 'chat';
        saveSessions();
        persistUiState();
        return newSession;
    };

    const getCurrentSession = () => sessions.find(s => s.id === currentSessionId);
    
    const updateCurrentSession = (newMsgs) => {
        const idx = sessions.findIndex(s => s.id === currentSessionId);
        if (idx !== -1) {
            sessions[idx].messages = newMsgs;
            sessions[idx].timestamp = Date.now();
            sessions[idx].preview = newMsgs[newMsgs.length - 1]?.text || sessions[idx].preview;
            // Move to top
            const updated = sessions.splice(idx, 1)[0];
            sessions.unshift(updated);
            saveSessions();
        }
    };

    // Load Data
    loadSessions();

    // C. Constants
    const logoUrl = 'https://static.wixstatic.com/shapes/d25ad0_163bb95953dc485e968697298fc64caf.svg';
    const zyneLogo = 'https://static.wixstatic.com/shapes/d25ad0_9984db4a72dd458790e546ab1b714ebd.svg';

    // D. Helper Functions
    const linkify = (text, isUser) => {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const linkClass = isUser ? 'atlas-link-user' : 'atlas-link-bot';
        return text.replace(urlRegex, (url) => {
            let cleanUrl = url;
            let suffix = '';
            const trailingChars = ['.', ',', '!', '?', ')', ']', ';', ':'];
            while (cleanUrl.length > 0 && trailingChars.includes(cleanUrl[cleanUrl.length - 1])) {
                suffix = cleanUrl[cleanUrl.length - 1] + suffix;
                cleanUrl = cleanUrl.slice(0, -1);
            }
            return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="${linkClass} break-all">${cleanUrl}</a>${suffix}`;
        });
    };

    const scrollToBottom = () => {
        const container = document.getElementById('atlas-messages-container');
        if (container) {
            container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
        }
    };

    // E. Initial HTML Structure
    const launcherStyles = isOpen 
        ? 'opacity: 0; transform: scale(0) rotate(90deg); pointer-events: none;' 
        : 'opacity: 1; transform: scale(1) rotate(0deg); pointer-events: auto;';
    
    const windowStyles = isOpen
        ? 'opacity: 1; visibility: visible; transform: translateY(0) scale(1); pointer-events: auto;'
        : 'opacity: 0; visibility: hidden; transform: translateY(12px) scale(0.95); pointer-events: none;';

    const widgetContainer = document.createElement('div');
    widgetContainer.id = 'atlas-widget-root';
    widgetContainer.innerHTML = `
        <!-- Launcher -->
        <button id="atlas-launcher" style="${launcherStyles}" class="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-t from-[#0E1013] to-[#2A2A32] text-white shadow-lg flex items-center justify-center hover:scale-105 hover:bg-onyx-light z-[99999] transition-all duration-500 atlas-spring">
          <img src="${logoUrl}" alt="Chat" class="w-6 h-6 object-contain transition-transform duration-500 brightness-0 invert" id="atlas-launcher-icon" />
        </button>

        <!-- Main Window -->
        <div id="atlas-window" style="${windowStyles}" class="fixed left-0 right-0 bottom-0 top-[20px] sm:inset-auto sm:bottom-6 sm:right-6 sm:w-[350px] sm:h-[calc(100vh-2rem)] sm:max-h-[700px] bg-gray-50 rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden z-[99999] flex flex-col font-sans border border-gray-100 transition-all duration-500 atlas-spring origin-bottom-right">
          
          <!-- Header -->
          <div id="atlas-header" class="flex items-center justify-between p-4 bg-white border-b border-gray-100 sm:rounded-t-[32px] sticky top-0 z-20">
              <!-- Header content injected dynamically -->
          </div>

          <!-- Content Wrapper -->
          <div id="atlas-content-wrapper" class="flex-1 overflow-hidden relative flex flex-col bg-gray-50/50">
             <!-- Chat View -->
             <div id="atlas-chat-view" class="flex-1 flex flex-col absolute inset-0 transition-transform duration-300 transform translate-x-0">
                <div class="flex-1 relative flex flex-col overflow-hidden bg-gray-50/50">
                    <div id="atlas-messages-container" class="flex-1 overflow-y-auto px-4 py-4 atlas-no-scrollbar">
                        <div id="atlas-messages-list"></div>
                        <div id="atlas-typing" class="hidden flex w-full mb-4 justify-start animate-fade-in-up">
                            <div class="flex-shrink-0 mr-2 mt-auto pb-1">
                                <div class="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm border border-gray-100">
                                    <div class="flex space-x-0.5">
                                    <div class="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></div>
                                    <div class="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 150ms"></div>
                                    <div class="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 300ms"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <!-- Spacer for disclaimer -->
                        <div id="atlas-disclaimer-spacer" class="hidden h-14 w-full flex-shrink-0"></div>
                    </div>

                    <!-- Disclaimer -->
                    <div id="atlas-disclaimer" class="hidden absolute bottom-2 left-3 right-3 sm:left-4 sm:right-4 z-10 animate-fade-in-up">
                        <div class="bg-white p-[10px] rounded-3xl shadow-lg border border-gray-100 relative">
                             <div class="pr-5 text-[10px] text-gray-500 leading-snug text-center">
                                Korzystając z czatu, akceptujesz przetwarzanie i monitorowanie przebiegu rozmowy oraz Twoich danych przez nas i naszych partnerów, zgodnie z <a href="https://www.zyne.chat/documents/privacy-policy" target="_blank" rel="noopener noreferrer" class="underline hover:text-gray-700 font-medium">Polityką Prywatności</a>
                             </div>
                             <button id="atlas-disclaimer-close" class="absolute right-1 top-1 p-1.5 hover:bg-gray-50 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-3 h-3"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                             </button>
                        </div>
                    </div>
                </div>
                
                <!-- Footer -->
                <div id="atlas-footer" class="p-4 bg-gray-50 border-t border-gray-100 relative z-30">
                    <div id="atlas-footer-start" class="block">
                        <button id="atlas-start-btn" class="w-full bg-gradient-to-t from-[#0E1013] to-[#2A2A32] hover:bg-onyx-light text-white font-medium py-4 rounded-xl transition-all duration-200 hover:scale-[1.02] shadow-lg text-sm">Porozmawiajmy</button>
                    </div>
                    <div id="atlas-footer-input" class="hidden">
                        <div class="relative flex items-center bg-white rounded-full shadow-sm border border-gray-200 focus-within:ring-2 focus-within:ring-gray-200 transition-all">
                            <input id="atlas-input" type="text" placeholder="Napisz wiadomość..." autocomplete="off" class="w-full py-3.5 pl-4 pr-12 bg-transparent outline-none text-gray-800 placeholder-gray-400 text-base sm:text-sm rounded-full" />
                            <button id="atlas-send" class="absolute right-3 p-2 text-onyx hover:bg-gray-100 rounded-full transition-colors"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6"><path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" /></svg></button>
                        </div>
                    </div>
                    <div class="mt-3 flex justify-center"><a href="https://www.zyne.chat" target="_blank" class="opacity-50 hover:opacity-80 transition-opacity duration-300"><img src="${zyneLogo}" class="h-4 w-auto" alt="Powered by Zyne.chat" /></a></div>
                </div>
             </div>

             <!-- History View -->
             <div id="atlas-history-view" class="flex-1 flex flex-col absolute inset-0 bg-gray-50/50 overflow-y-auto atlas-no-scrollbar p-4 transition-transform duration-300 transform translate-x-full">
                <div id="atlas-history-list" class="space-y-3"></div>
             </div>
          </div>
        </div>
    `;
    document.body.appendChild(widgetContainer);

    // F. Logic
    const els = {
        launcher: document.getElementById('atlas-launcher'),
        window: document.getElementById('atlas-window'),
        header: document.getElementById('atlas-header'),
        chatView: document.getElementById('atlas-chat-view'),
        historyView: document.getElementById('atlas-history-view'),
        historyList: document.getElementById('atlas-history-list'),
        msgList: document.getElementById('atlas-messages-list'),
        typing: document.getElementById('atlas-typing'),
        input: document.getElementById('atlas-input'),
        sendBtn: document.getElementById('atlas-send'),
        startBtn: document.getElementById('atlas-start-btn'),
        footerStart: document.getElementById('atlas-footer-start'),
        footerInput: document.getElementById('atlas-footer-input')
    };

    // Icons SVGs
    const icons = {
        close: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>`,
        history: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`,
        back: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>`,
        trash: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>`,
        plus: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>`
    };

    const renderHeader = () => {
        const isChat = currentView === 'chat';
        const leftContent = isChat 
            ? `<div class="relative"><div class="w-10 h-10 rounded-full bg-gradient-to-t from-[#0E1013] to-[#2A2A32] flex items-center justify-center"><img src="${logoUrl}" class="w-5 h-5 object-contain brightness-0 invert" /></div><span class="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></span></div>`
            : `<button id="atlas-back-btn" class="p-1 hover:bg-gray-100 rounded-full text-onyx transition-colors">${icons.back}</button>`;
        
        const titleText = isChat ? 'Atlas – Asystent AI' : 'Historia';
        
        // Only show subtitle in history mode
        const subtitleHtml = isChat ? '' : '<span class="text-xs text-gray-500 leading-tight">Twoje rozmowy</span>';
        
        // Styles: Semibold and larger for Chat, Bold and normal for History
        const titleClasses = isChat 
            ? 'font-semibold text-lg sm:text-base text-gray-900 leading-tight' 
            : 'font-bold text-gray-900 text-sm leading-tight';

        const historyBtn = isChat 
            ? `<button id="atlas-history-btn" class="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-onyx transition-colors">${icons.history}</button>` 
            : `<button id="atlas-new-chat-btn" class="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-onyx transition-colors">${icons.plus}</button>`;

        els.header.innerHTML = `
            <div class="flex items-center space-x-3">
                ${leftContent}
                <div class="flex flex-col justify-center min-h-[40px]">
                    <span class="${titleClasses}">${titleText}</span>
                    ${subtitleHtml}
                </div>
            </div>
            <div class="flex items-center space-x-1">
                ${historyBtn}
                <button id="atlas-close" class="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-onyx transition-colors">${icons.close}</button>
            </div>
        `;

        // Bind Events
        document.getElementById('atlas-close').onclick = toggleOpen;
        if (document.getElementById('atlas-history-btn')) document.getElementById('atlas-history-btn').onclick = () => switchView('history');
        if (document.getElementById('atlas-back-btn')) document.getElementById('atlas-back-btn').onclick = () => switchView('chat');
        if (document.getElementById('atlas-new-chat-btn')) document.getElementById('atlas-new-chat-btn').onclick = () => {
             createNewSession();
             switchView('chat');
             renderMessages();
             updateFooter();
        };
    };

    const switchView = (view) => {
        currentView = view;
        renderHeader();
        if (view === 'history') {
            renderHistory();
            els.chatView.classList.remove('translate-x-0');
            els.chatView.classList.add('-translate-x-full');
            els.historyView.classList.remove('translate-x-full');
            els.historyView.classList.add('translate-x-0');
        } else {
            els.chatView.classList.remove('-translate-x-full');
            els.chatView.classList.add('translate-x-0');
            els.historyView.classList.remove('translate-x-0');
            els.historyView.classList.add('translate-x-full');
            setTimeout(scrollToBottom, 100);
        }
    };

    const renderHistory = () => {
        if (sessions.length === 0) {
            els.historyList.innerHTML = '<div class="text-center text-gray-400 mt-10 text-sm">Brak historii rozmów.</div>';
            return;
        }
        els.historyList.innerHTML = '';
        sessions.forEach(session => {
            const date = new Date(session.timestamp);
            const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            const isActive = session.id === currentSessionId;
            
            const item = document.createElement('div');
            item.className = `atlas-history-item group relative p-4 rounded-2xl cursor-pointer border transition-all duration-200 ${isActive ? 'bg-white border-gray-200 shadow-sm' : 'bg-gray-100/50 border-transparent hover:bg-white hover:shadow-sm'}`;
            item.innerHTML = `
                <div class="pr-10">
                    <p class="font-semibold text-gray-800 text-sm mb-1">${dateStr}</p>
                    <p class="text-xs text-gray-500 truncate text-ellipsis overflow-hidden whitespace-nowrap">${session.preview}</p>
                </div>
                <button class="atlas-delete-btn absolute right-3 top-1/2 -translate-y-1/2 opacity-0 transition-opacity duration-200 bg-gray-100 p-2 rounded-lg hover:scale-105 text-red-500">
                    ${icons.trash}
                </button>
            `;
            
            item.onclick = () => {
                currentSessionId = session.id;
                switchView('chat');
                renderMessages();
            };
            
            item.querySelector('.atlas-delete-btn').onclick = (e) => {
                e.stopPropagation();
                const idx = sessions.findIndex(s => s.id === session.id);
                if (idx > -1) {
                    sessions.splice(idx, 1);
                    if (session.id === currentSessionId) {
                         if (sessions.length > 0) currentSessionId = sessions[0].id;
                         else createNewSession();
                    }
                    saveSessions();
                    renderHistory();
                }
            };

            els.historyList.appendChild(item);
        });
    };

    const renderMessages = () => {
        els.msgList.innerHTML = '';
        const session = getCurrentSession();
        if (!session) return;
        
        const renderedIds = new Set();
        session.messages.forEach(msg => {
            if (renderedIds.has(msg.id)) return;
            const div = document.createElement('div');
            div.className = `flex w-full mb-4 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`;
            const avatarHtml = msg.sender === 'bot' 
                ? `<div class="flex-shrink-0 mr-2"><div class="w-8 h-8 rounded-full bg-gradient-to-t from-[#0E1013] to-[#2A2A32] flex items-center justify-center shadow-sm"><img src="${logoUrl}" class="w-4 h-4 object-contain brightness-0 invert" /></div></div>` 
                : '';
            const bubbleClass = msg.sender === 'user' 
                ? 'bg-gradient-to-t from-[#0E1013] to-[#2A2A32] text-white rounded-3xl rounded-br-none' 
                : 'bg-white text-gray-800 rounded-3xl rounded-tl-none border border-gray-100';

            div.innerHTML = `
                ${avatarHtml}
                <div class="relative max-w-[85%] sm:max-w-[80%] px-4 py-3 sm:px-5 sm:py-3.5 text-[15px] sm:text-sm leading-relaxed break-words shadow-sm ${bubbleClass}">
                  <p class="whitespace-pre-wrap">${linkify(msg.text, msg.sender === 'user')}</p>
                </div>
            `;
            els.msgList.appendChild(div);
            renderedIds.add(msg.id);
        });
        scrollToBottom();
    };

    const updateFooter = () => {
       if (hasStarted) {
           els.footerStart.classList.add('hidden');
           els.footerStart.classList.remove('block');
           els.footerInput.classList.add('block');
           els.footerInput.classList.remove('hidden');
           if (!isDisclaimerClosed) {
               document.getElementById('atlas-disclaimer').classList.remove('hidden');
               document.getElementById('atlas-disclaimer-spacer').classList.remove('hidden');
           }
           if (isOpen) setTimeout(() => els.input.focus(), 100);
       } else {
           els.footerStart.classList.add('block');
           els.footerStart.classList.remove('hidden');
           els.footerInput.classList.add('hidden');
           els.footerInput.classList.remove('block');
           document.getElementById('atlas-disclaimer').classList.add('hidden');
           document.getElementById('atlas-disclaimer-spacer').classList.add('hidden');
       }
    };

    const toggleOpen = () => {
        isOpen = !isOpen;
        persistUiState();
        if (isOpen) {
            els.launcher.style.opacity = '0';
            els.launcher.style.transform = 'scale(0) rotate(90deg)';
            els.launcher.style.pointerEvents = 'none';

            els.window.style.opacity = '1';
            els.window.style.visibility = 'visible';
            els.window.style.transform = 'translateY(0) scale(1)';
            els.window.style.pointerEvents = 'auto';
            setTimeout(scrollToBottom, 100);
        } else {
            els.launcher.style.opacity = '1';
            els.launcher.style.transform = 'scale(1) rotate(0deg)';
            els.launcher.style.pointerEvents = 'auto';

            els.window.style.opacity = '0';
            els.window.style.visibility = 'hidden';
            els.window.style.transform = 'translateY(12px) scale(0.95)';
            els.window.style.pointerEvents = 'none';
        }
    };

    const sendMessage = async () => {
        const text = els.input.value.trim();
        if (!text) return;
        
        els.input.value = '';
        const userMsg = { id: Date.now(), sender: 'user', text };
        
        const session = getCurrentSession();
        updateCurrentSession([...session.messages, userMsg]);
        renderMessages();
        
        els.typing.classList.remove('hidden');
        scrollToBottom();

        try {
            const payload = { message: text, chatInput: text, input: text, question: text, sessionId: currentSessionId };
            const res = await fetch(WEBHOOK_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
              body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error(`Status ${res.status}`);
            const data = await res.json();
            
            // Text finder
            const findText = (d) => {
                if (!d) return null;
                if (typeof d === 'string') return d;
                if (Array.isArray(d)) return d.length > 0 ? findText(d[0]) : null;
                if (typeof d === 'object') {
                    const keys = ['output', 'text', 'message', 'answer', 'response', 'reply', 'content', 'result'];
                    for (const k of keys) if (d[k] && typeof d[k] === 'string') return d[k];
                    if (d.data) return findText(d.data);
                    if (d.json) return findText(d.json);
                    const objKeys = Object.keys(d);
                    if (objKeys.length === 1 && typeof d[objKeys[0]] === 'string') return d[objKeys[0]];
                    for (const k of objKeys) { if (typeof d[k] === 'object') { const found = findText(d[k]); if (found) return found; } }
                }
                return null;
            };

            let reply = findText(data);
            if (reply === 'Error in workflow') { console.error('n8n error'); reply = 'Przepraszamy, wystąpił problem po stronie serwera.'; }
            if (!reply) reply = 'Przepraszam, ale nie otrzymałem poprawnej odpowiedzi.';
            
            updateCurrentSession([...getCurrentSession().messages, { id: Date.now() + 1, sender: 'bot', text: reply }]);
        } catch (e) {
            console.error(e);
            updateCurrentSession([...getCurrentSession().messages, { id: Date.now() + 1, sender: 'bot', text: 'Przepraszamy, wystąpił problem z połączeniem.' }]);
        }
        
        els.typing.classList.add('hidden');
        renderMessages();
    };

    // Events
    els.launcher.onclick = toggleOpen;
    els.startBtn.onclick = () => { hasStarted = true; persistUiState(); updateFooter(); };
    els.input.onkeydown = (e) => { if (e.key === 'Enter') sendMessage(); };
    els.sendBtn.onclick = sendMessage;
    
    // Bind disclaimer close
    const disclaimerClose = document.getElementById('atlas-disclaimer-close');
    if (disclaimerClose) {
        disclaimerClose.onclick = () => {
            isDisclaimerClosed = true;
            document.getElementById('atlas-disclaimer').classList.add('hidden');
            document.getElementById('atlas-disclaimer-spacer').classList.add('hidden');
        };
    }

    // Init
    renderHeader();
    renderMessages();
    updateFooter();
    if (isOpen) {
        toggleOpen(); // Re-trigger open logic to apply styles without waiting for click
        isOpen = !isOpen; // Toggle flips it, so revert bool to true
        toggleOpen(); 
    }
  }
})();
