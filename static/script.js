(() => {
  const chatWindow = document.getElementById("chatWindow");
  const chatForm = document.getElementById("chatForm");
  const messageInput = document.getElementById("messageInput");
  const suggestionRow = document.getElementById("suggestionRow");
  const darkToggle = document.getElementById("darkToggle");
  const micBtn = document.getElementById("micBtn");
  const downloadBtn = document.getElementById("downloadBtn");
  const historyToggle = document.getElementById("historyToggle");
  const historyPanel = document.getElementById("historyPanel");
  const closeHistory = document.getElementById("closeHistory");
  const historyList = document.getElementById("historyList");
  const newChatBtn = document.getElementById("newChatBtn");

  const userTpl = document.getElementById("userMsgTemplate");
  const botTpl = document.getElementById("botMsgTemplate");
  const typingTpl = document.getElementById("typingTemplate");

  const STORAGE_KEY = "campusbot_conversations";
  const THEME_KEY = "campusbot_theme";

  let currentConversation = { id: Date.now().toString(), messages: [] };

  // ---------- Theme ----------
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    darkToggle.textContent = theme === "dark" ? "◑" : "◐";
  }
  const savedTheme = localStorage.getItem(THEME_KEY) || "light";
  applyTheme(savedTheme);
  darkToggle.addEventListener("click", () => {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  });

  // ---------- Rendering messages ----------
  function scrollToBottom() {
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }

  function addUserMessage(text) {
    const node = userTpl.content.cloneNode(true);
    node.querySelector("p").textContent = text;
    chatWindow.appendChild(node);
    scrollToBottom();
  }

  function addBotMessage(text) {
    const node = botTpl.content.cloneNode(true);
    const row = node.querySelector(".msg-row");
    node.querySelector("p").textContent = "";
    chatWindow.appendChild(node);
    const appended = chatWindow.lastElementChild;
    const p = appended.querySelector("p");
    typeWriter(p, text);

    appended.querySelectorAll(".feedback-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        appended.querySelectorAll(".feedback-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
      });
    });
    scrollToBottom();
  }

  function typeWriter(el, text, speed = 14) {
    let i = 0;
    const interval = setInterval(() => {
      el.textContent += text.charAt(i);
      i++;
      scrollToBottom();
      if (i >= text.length) clearInterval(interval);
    }, speed);
  }

  function showTyping() {
    const node = typingTpl.content.cloneNode(true);
    chatWindow.appendChild(node);
    scrollToBottom();
    return chatWindow.lastElementChild;
  }

  // ---------- Suggestions ----------
  async function loadSuggestions() {
    try {
      const res = await fetch("/api/suggestions");
      const data = await res.json();
      suggestionRow.innerHTML = "";
      (data.suggestions || []).forEach((q) => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "suggestion-chip";
        chip.textContent = q;
        chip.addEventListener("click", () => {
          messageInput.value = q;
          chatForm.requestSubmit();
        });
        suggestionRow.appendChild(chip);
      });
    } catch (e) {
      suggestionRow.innerHTML = "";
    }
  }

  // ---------- Send message ----------
  async function sendMessage(text) {
    addUserMessage(text);
    currentConversation.messages.push({ role: "user", text });
    saveConversation();

    messageInput.value = "";
    messageInput.disabled = true;
    const submitBtn = chatForm.querySelector(".send-btn");
    submitBtn.disabled = true;

    const typingEl = showTyping();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      typingEl.remove();

      const answer = data.answer || "I couldn't find that information. Please contact the college office.";
      addBotMessage(answer);
      currentConversation.messages.push({ role: "bot", text: answer });
      saveConversation();
    } catch (err) {
      typingEl.remove();
      addBotMessage("Something went wrong reaching the server. Please try again in a moment.");
    } finally {
      messageInput.disabled = false;
      submitBtn.disabled = false;
      messageInput.focus();
    }
  }

  chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = messageInput.value.trim();
    if (!text) return;
    sendMessage(text);
  });

  // ---------- Voice input ----------
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;

    let listening = false;
    micBtn.addEventListener("click", () => {
      if (listening) {
        recognition.stop();
        return;
      }
      recognition.start();
    });
    recognition.onstart = () => {
      listening = true;
      micBtn.classList.add("listening");
    };
    recognition.onend = () => {
      listening = false;
      micBtn.classList.remove("listening");
    };
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      messageInput.value = transcript;
    };
    recognition.onerror = () => {
      listening = false;
      micBtn.classList.remove("listening");
    };
  } else {
    micBtn.style.display = "none";
  }

  // ---------- Download as PDF ----------
  downloadBtn.addEventListener("click", () => {
    const clone = chatWindow.cloneNode(true);
    clone.style.maxHeight = "none";
    clone.style.overflow = "visible";
    const wrapper = document.createElement("div");
    wrapper.style.padding = "20px";
    wrapper.style.background = "#f8f4ea";
    wrapper.appendChild(clone);

    const opt = {
      margin: 0.4,
      filename: "campusbot-chat.pdf",
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
    };
    if (window.html2pdf) {
      window.html2pdf().set(opt).from(wrapper).save();
    }
  });

  // ---------- Chat history ----------
  function loadConversations() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }

  function saveConversation() {
    if (currentConversation.messages.length === 0) return;
    const all = loadConversations();
    const idx = all.findIndex((c) => c.id === currentConversation.id);
    const firstUserMsg = currentConversation.messages.find((m) => m.role === "user");
    const record = {
      id: currentConversation.id,
      title: firstUserMsg ? firstUserMsg.text.slice(0, 40) : "New conversation",
      messages: currentConversation.messages,
      updatedAt: Date.now(),
    };
    if (idx >= 0) all[idx] = record;
    else all.unshift(record);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all.slice(0, 20)));
    renderHistoryList();
  }

  function renderHistoryList() {
    const all = loadConversations();
    historyList.innerHTML = "";
    if (all.length === 0) {
      const li = document.createElement("li");
      li.className = "empty";
      li.textContent = "No conversations yet";
      historyList.appendChild(li);
      return;
    }
    all.forEach((conv) => {
      const li = document.createElement("li");
      li.textContent = conv.title || "Conversation";
      li.addEventListener("click", () => loadConversationIntoView(conv));
      historyList.appendChild(li);
    });
  }

  function loadConversationIntoView(conv) {
    currentConversation = { id: conv.id, messages: [...conv.messages] };
    chatWindow.innerHTML = "";
    conv.messages.forEach((m) => {
      if (m.role === "user") {
        const node = userTpl.content.cloneNode(true);
        node.querySelector("p").textContent = m.text;
        chatWindow.appendChild(node);
      } else {
        const node = botTpl.content.cloneNode(true);
        node.querySelector("p").textContent = m.text;
        chatWindow.appendChild(node);
      }
    });
    scrollToBottom();
    historyPanel.classList.add("hidden");
  }

  newChatBtn.addEventListener("click", () => {
    currentConversation = { id: Date.now().toString(), messages: [] };
    chatWindow.innerHTML = "";
    const node = botTpl.content.cloneNode(true);
    node.querySelector("p").textContent =
      "Hi, I'm CampusBot. Ask me about admissions, placements, clubs, hostel, library, fees, or academic rules.";
    node.querySelector(".feedback-row").remove();
    chatWindow.appendChild(node);
  });

  historyToggle.addEventListener("click", () => {
    historyPanel.classList.toggle("hidden");
    renderHistoryList();
  });
  closeHistory.addEventListener("click", () => historyPanel.classList.add("hidden"));

  // ---------- Init ----------
  loadSuggestions();
  renderHistoryList();
  messageInput.focus();
})();