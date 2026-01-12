
(function() {
  // Atlas Chat Widget v7.1 (Optimized)
  console.log("Atlas Chat Widget v7.1 Loaded");

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

  // 2. Logic
  function initWidget() {
    if (document.getElementById('atlas-widget-root')) return;

    const style = document.createElement('style');
    style.innerHTML = `
      .atlas-no-scrollbar::-webkit-scrollbar { display: none; }
      .atlas-no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      @keyframes atlas-fade-in-up { 0% { opacity: 0; transform: translateY(10px) scale(0.98); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
      .animate-fade-in-up { animation: atlas-fade-in-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards !important; }
      @keyframes atlas-bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-25%); } }
      .animate-bounce { animation: atlas-bounce 1s infinite !important; }
      .atlas-spring { transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1) !important; }
      .atlas-link-user { color: #93C5FD; text-decoration: underline; }
      .atlas-link-user:hover { color: #BFDBFE; }
      .atlas-link-bot { color: #2563EB; text-decoration: underline; }
      .atlas-link-bot:hover { color: #1E40AF; }
    `;
    document.head.appendChild(style);

    const widgetContainer = document.createElement('div');
    widgetContainer.id = 'atlas-widget-root';
    document.body.appendChild(widgetContainer);

    let isOpen = false;
    let hasStarted = false;
    const sessionId = localStorage.getItem('chat_session_id') || `sess_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('chat_session_id', sessionId);

    let messages = [{ id: '1', sender: 'bot', text: 'Cześć, jestem Atlas, jak mogę ci dzisiaj pomóc?' }];

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

    const logoUrl = 'https://static.wixstatic.com/shapes/d25ad0_80658c34187f4d3e802abc8225fc5bff.svg';
    const zyneLogo = 'https://static.wixstatic.com/shapes/d25ad0_9984db4a72dd458790e546ab1b714ebd.svg';

    const render = (shouldFocusInput = false) => {
      widgetContainer.innerHTML = `
        <button id="atlas-launcher" class="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-onyx text-white shadow-lg flex items-center justify-center hover:scale-105 hover:bg-onyx-light z-[99999] transition-all duration-500 atlas-spring ${isOpen ? 'opacity-0 scale-0 pointer-events-none rotate-90' : 'opacity-100 scale-100 pointer-events-auto rotate-0'}">
          <img src="${logoUrl}" alt="Chat" class="w-7 h-7 object-contain" />
        </button>

        <div id="atlas-window" class="fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 sm:w-[400px] h-[100dvh] sm:h-[calc(100vh-2rem)] sm:max-h-[700px] bg-gray-50 sm:rounded-[32px] shadow-2xl overflow-hidden z-[99999] flex flex-col font-sans border border-gray-100 transition-all duration-500 atlas-spring origin-bottom-right ${isOpen ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto visible' : 'opacity-0 scale-95 translate-y-12 sm:translate-y-10 pointer-events-none invisible'}">
          <div class="absolute top-0 left-0 right-0 z-20 pt-4 px-4 pb-8 sm:rounded-t-[32px]" style="background: linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 100%);">
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-3">
                  <div class="relative">
                    <div class="w-10 h-10 rounded-full bg-onyx flex items-center justify-center"><img src="${logoUrl}" class="w-6 h-6 object-contain" /></div>
                    <span class="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></span>
                  </div>
                  <div class="flex flex-col"><span class="font-bold text-gray-900 text-sm">Atlas – Asystent AI</span><span class="text-xs text-gray-500">Jestem dostępny</span></div>
                </div>
                <button id="atlas-close" class="p-2 hover:bg-gray-100/50 rounded-full text-gray-400 hover:text-onyx transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
          </div>
          <div id="atlas-messages" class="flex-1 overflow-y-auto px-4 pb-4 pt-24 atlas-no-scrollbar bg-gray-50/50">
            ${messages.map(msg => `
              <div class="flex w-full mb-4 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up">
                ${msg.sender === 'bot' ? `<div class="flex-shrink-0 mr-2 mt-auto pb-1"><div class="w-8 h-8 rounded-full bg-onyx flex items-center justify-center shadow-sm"><img src="${logoUrl}" class="w-5 h-5 object-contain" /></div></div>` : ''}
                <div class="relative max-w-[85%] sm:max-w-[80%] px-4 py-3 sm:px-5 sm:py-3.5 text-[15px] sm:text-sm leading-relaxed break-words shadow-sm ${msg.sender === 'user' ? 'bg-onyx text-white rounded-2xl rounded-br-none' : 'bg-white text-gray-800 rounded-2xl rounded-bl-none border border-gray-100'}">
                  <p class="whitespace-pre-wrap">${linkify(msg.text, msg.sender === 'user')}</p>
                </div>
              </div>
            `).join('')}
            <div id="atlas-typing" class="hidden flex w-full mb-4 justify-start animate-fade-in-up">
               <div class="flex-shrink-0 mr-2 mt-auto pb-1"><div class="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm border border-gray-100"><div class="flex space-x-0.5"><div class="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></div><div class="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 150ms"></div><div class="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 300ms"></div></div></div></div>
            </div>
            <div id="atlas-bottom"></div>
          </div>
          <div class="p-4 bg-gray-50 border-t border-gray-100 relative z-30">
            ${!hasStarted ? `
              <button id="atlas-start-btn" class="w-full bg-onyx hover:bg-onyx-light text-white font-semibold py-4 rounded-xl transition-all duration-200 hover:scale-[1.02] shadow-lg text-sm">Porozmawiajmy</button>
            ` : `
              <div class="relative flex items-center bg-white rounded-xl shadow-sm border border-gray-200 focus-within:ring-2 focus-within:ring-gray-200 transition-all">
                <input id="atlas-input" type="text" placeholder="Napisz wiadomość..." autocomplete="off" class="w-full py-3.5 pl-4 pr-12 bg-transparent outline-none text-gray-800 placeholder-gray-400 text-base sm:text-sm" />
                <button id="atlas-send" class="absolute right-3 p-2 text-onyx hover:bg-gray-100 rounded-lg transition-colors"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6"><path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" /></svg></button>
              </div>
            `}
            <div class="mt-3 flex justify-center"><a href="https://www.zyne.chat" target="_blank" class="opacity-50 hover:opacity-80 transition-opacity duration-300"><img src="${zyneLogo}" class="h-4 w-auto" alt="Powered by Zyne.chat" /></a></div>
          </div>
        </div>
      `;
      bindEvents(shouldFocusInput);
    };

    const bindEvents = (shouldFocusInput) => {
      const launcher = document.getElementById('atlas-launcher');
      if (launcher) launcher.onclick = () => { isOpen = true; render(true); setTimeout(scrollToBottom, 100); };
      const closeBtn = document.getElementById('atlas-close');
      if (closeBtn) closeBtn.onclick = () => { isOpen = false; render(); };
      const startBtn = document.getElementById('atlas-start-btn');
      if (startBtn) startBtn.onclick = () => { hasStarted = true; render(true); };
      const input = document.getElementById('atlas-input');
      const sendBtn = document.getElementById('atlas-send');
      if (input) {
        if (shouldFocusInput && isOpen) setTimeout(() => input.focus(), 50);
        input.onkeydown = (e) => { if (e.key === 'Enter') sendMessage(); };
        if (sendBtn) sendBtn.onclick = sendMessage;
      }
    };

    const scrollToBottom = () => {
      const el = document.getElementById('atlas-bottom');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    };

    const sendMessage = async () => {
      const input = document.getElementById('atlas-input');
      if (!input || !input.value.trim()) return;
      const text = input.value.trim();
      messages.push({ id: Date.now(), sender: 'user', text });
      render(true);
      setTimeout(scrollToBottom, 50);

      const typingEl = document.getElementById('atlas-typing');
      if(typingEl) typingEl.classList.remove('hidden');
      scrollToBottom();

      try {
        const payload = { message: text, chatInput: text, input: text, question: text, sessionId: sessionId };
        const res = await fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error(`Server error ${res.status}`);
        const data = await res.json();
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
        messages.push({ id: Date.now(), sender: 'bot', text: reply });
      } catch (e) {
        console.error('Connection error:', e);
        messages.push({ id: Date.now(), sender: 'bot', text: 'Przepraszamy, wystąpił problem z połączeniem.' });
      }
      render(true); 
      setTimeout(scrollToBottom, 50);
    };
    render();
  }
})();
