/**
 * JARVIS voice-enabled dashboard application logic
 * Integrates Web Speech API (Recognition & Synthesis) and simulated Chief of Staff operations.
 */

// Application state
const state = {
  isListening: false,
  isSpeaking: false,
  isProcessing: false,
  ttsEnabled: true,
  selectedVoice: null,
  pitch: 1.0,
  rate: 1.0,
  tasks: [
    { id: 1, name: "Synchronize client inquiry logs", status: "completed" },
    { id: 2, name: "Optimize Sujok point mapping dataset", status: "completed" },
    { id: 3, name: "Deploy automated email billing script", status: "completed" },
    { id: 4, name: "Review Sujok AI model accuracy", status: "pending" },
    { id: 5, name: "Audit Hari Bot execution logs", status: "pending" },
    { id: 6, name: "Schedule weekly executive summary backup", status: "pending" }
  ],
  sujokStatus: "ONLINE",
  hariStatus: "STANDBY"
};

// UI Elements
const elements = {
  reactorButton: document.getElementById('reactor-button'),
  statusText: document.getElementById('status-text'),
  voiceIndicatorText: document.getElementById('voice-indicator-text'),
  chatHistory: document.getElementById('chat-history'),
  textInputForm: document.getElementById('text-input-form'),
  textMessageInput: document.getElementById('text-message'),
  voiceSelect: document.getElementById('voice-select'),
  pitchRange: document.getElementById('pitch-range'),
  pitchVal: document.getElementById('pitch-val'),
  rateRange: document.getElementById('rate-range'),
  rateVal: document.getElementById('rate-val'),
  clearBtn: document.getElementById('clear-btn'),
  muteBtn: document.getElementById('mute-btn'),
  cmdBtns: document.querySelectorAll('.cmd-btn')
};

// Initialize Speech Recognition
let recognition = null;
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  recognition.onstart = () => {
    state.isListening = true;
    updateReactorState();
    elements.voiceIndicatorText.textContent = "JARVIS IS LISTENING...";
    elements.statusText.textContent = "SYSTEM: CAPTURING AUDIO";
  };

  recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    addChatMessage('jarvis', `Voice Input Error: ${event.error}. Please check microphone permissions.`);
    state.isListening = false;
    updateReactorState();
    elements.voiceIndicatorText.textContent = "CLICK REACTOR TO TALK";
    elements.statusText.textContent = "SYSTEM: ONLINE";
  };

  recognition.onend = () => {
    state.isListening = false;
    updateReactorState();
    if (!state.isSpeaking && !state.isProcessing) {
      elements.voiceIndicatorText.textContent = "CLICK REACTOR TO TALK";
      elements.statusText.textContent = "SYSTEM: ONLINE";
    }
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    handleUserInput(transcript);
  };
} else {
  console.warn('Speech Recognition API is not supported in this browser.');
  elements.voiceIndicatorText.textContent = "MIC UNSUPPORTED IN BROWSER";
  elements.reactorButton.style.cursor = 'not-allowed';
}

// Initialize Speech Synthesis
const synth = window.speechSynthesis;
let voices = [];

function populateVoiceList() {
  if (!synth) return;
  voices = synth.getVoices();
  elements.voiceSelect.innerHTML = '';

  // Filter for English voices first, then others
  const englishVoices = voices.filter(voice => voice.lang.includes('en'));
  const otherVoices = voices.filter(voice => !voice.lang.includes('en'));
  const sortedVoices = [...englishVoices, ...otherVoices];

  if (sortedVoices.length === 0) {
    const opt = document.createElement('option');
    opt.value = "";
    opt.textContent = "No system voices detected";
    elements.voiceSelect.appendChild(opt);
    return;
  }

  sortedVoices.forEach(voice => {
    const option = document.createElement('option');
    option.textContent = `${voice.name} (${voice.lang})`;
    option.value = voice.name;
    
    // Choose a default voice
    if (voice.name.includes('Google US English') || voice.name.includes('Microsoft David') || voice.lang === 'en-US') {
      option.selected = true;
      state.selectedVoice = voice;
    }
    
    elements.voiceSelect.appendChild(option);
  });

  if (!state.selectedVoice && sortedVoices.length > 0) {
    state.selectedVoice = sortedVoices[0];
  }
}

populateVoiceList();
if (synth && synth.onvoiceschanged !== undefined) {
  synth.onvoiceschanged = populateVoiceList;
}

// Update the visual representation of the reactor button based on app states
function updateReactorState() {
  // Clear all states first
  elements.reactorButton.classList.remove('listening', 'speaking', 'processing');

  if (state.isListening) {
    elements.reactorButton.classList.add('listening');
  } else if (state.isSpeaking) {
    elements.reactorButton.classList.add('speaking');
  } else if (state.isProcessing) {
    elements.reactorButton.classList.add('processing');
  }
}

// TTS speak function
function speakText(text) {
  if (!synth || !state.ttsEnabled) return;

  // Cancel any ongoing speech
  synth.cancel();

  const cleanText = text.replace(/[*_#`\[\]()]/g, ''); // strip markdown characters for pronunciation
  const utterance = new SpeechSynthesisUtterance(cleanText);
  
  if (state.selectedVoice) {
    utterance.voice = state.selectedVoice;
  }
  utterance.pitch = state.pitch;
  utterance.rate = state.rate;

  utterance.onstart = () => {
    state.isSpeaking = true;
    updateReactorState();
    elements.voiceIndicatorText.textContent = "JARVIS IS SPEAKING...";
    elements.statusText.textContent = "SYSTEM: OUTPUTTING AUDIO";
  };

  utterance.onend = () => {
    state.isSpeaking = false;
    updateReactorState();
    elements.voiceIndicatorText.textContent = "CLICK REACTOR TO TALK";
    elements.statusText.textContent = "SYSTEM: ONLINE";
  };

  utterance.onerror = (event) => {
    console.error('SpeechSynthesis error:', event);
    state.isSpeaking = false;
    updateReactorState();
    elements.voiceIndicatorText.textContent = "CLICK REACTOR TO TALK";
    elements.statusText.textContent = "SYSTEM: ONLINE";
  };

  synth.speak(utterance);
}

// Add chat bubble to transcript window
function addChatMessage(sender, text) {
  const messageDiv = document.createElement('div');
  messageDiv.classList.add('chat-message', sender);

  const avatarDiv = document.createElement('div');
  avatarDiv.classList.add('msg-avatar');
  avatarDiv.textContent = sender === 'jarvis' ? 'J' : 'U';

  const bodyDiv = document.createElement('div');
  bodyDiv.classList.add('msg-body');

  const textParagraph = document.createElement('p');
  // Simple markdown-to-html conversion for paragraph newlines and list items
  textParagraph.innerHTML = text
    .replace(/\n/g, '<br>')
    .replace(/\* (.*?)(<br>|$)/g, '<li>$1</li>')
    .replace(/<li>(.*?)<\/li>/g, '<ul><li>$1</li></ul>');
  
  bodyDiv.appendChild(textParagraph);

  const timeSpan = document.createElement('span');
  timeSpan.classList.add('msg-time');
  const now = new Date();
  timeSpan.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  bodyDiv.appendChild(timeSpan);

  messageDiv.appendChild(avatarDiv);
  messageDiv.appendChild(bodyDiv);

  elements.chatHistory.appendChild(messageDiv);
  elements.chatHistory.scrollTop = elements.chatHistory.scrollHeight;
}

// Trigger listening mode
function toggleListening() {
  if (state.isSpeaking) {
    synth.cancel();
    state.isSpeaking = false;
    updateReactorState();
    elements.voiceIndicatorText.textContent = "CLICK REACTOR TO TALK";
    return;
  }

  if (state.isListening) {
    recognition.stop();
  } else {
    if (recognition) {
      try {
        recognition.start();
      } catch (e) {
        console.error(e);
      }
    } else {
      addChatMessage('jarvis', "Speech recognition is unsupported or not enabled in this browser.");
    }
  }
}

// Dynamic local response logic - acting as JARVIS, Chief Employee
function processResponse(text) {
  state.isProcessing = true;
  updateReactorState();
  elements.voiceIndicatorText.textContent = "JARVIS COGITATING...";
  elements.statusText.textContent = "SYSTEM: PROCESSING REQUEST";

  const lowerText = text.toLowerCase().trim();

  // Simulate short latency
  setTimeout(() => {
    let reply = "";

    // 1. Personal questions about the founder (Hariharan)
    if (lowerText.includes('tell me about me') || lowerText.includes('who am i') || lowerText.includes('tell me about myself') || lowerText.includes('who is hariharan')) {
      reply = `You are Hariharan, the founder and Creative Director of Hari Bot & Business Solutions. You are 17 years old, born on July 6, 2008, and live in Coimbatore, Tamil Nadu. You are also a mechatronics mechatronics engineering student at SNS College of Technology.`;
    }
    else if (lowerText.includes('my business') || lowerText.includes('my company') || lowerText.includes('hari bot & business solutions') || lowerText.includes('hari bot and business solutions')) {
      reply = `You founded Hari Bot & Business Solutions on May 24, 2026, in Coimbatore. The business philosophy is "We will do the best for a company." We specialize in UI/UX Design, Custom Company Websites, Personalized AI Bots, and automation integrations using n8n and Python.`;
    }
    else if (lowerText.includes('where do i study') || lowerText.includes('my college') || lowerText.includes('what am i studying') || lowerText.includes('sns college') || lowerText.includes('sns')) {
      reply = `You are pursuing a B.E. in Mechatronics Engineering (MCT Department) at SNS College of Technology in Coimbatore. You graduated 12th standard in 2026 and 10th standard in 2024 from Suguna RIP V School.`;
    }
    else if (lowerText.includes('my skills') || lowerText.includes('what do i know') || lowerText.includes('technical skills')) {
      reply = `Your technical profile includes:
      * UI/UX Designing (wireframes, prototyping, user-centered research)
      * Python and C++ programming
      * SQL database concepts
      * Google Sheets automation and n8n workflow triggers
      * Electro-mechanical hardware diagnostics (appliance sensors and fault codes).`;
    }
    else if (lowerText.includes('actor') || lowerText.includes('vijay') || lowerText.includes('thalapathy')) {
      reply = `Your favorite actor is the Tamil superstar, Thalapathy Vijay.`;
    }
    else if (lowerText.includes('tea') || lowerText.includes('coffee') || lowerText.includes('beverage') || lowerText.includes('drink')) {
      reply = `You have an equal preference and love for both Tea and Coffee!`;
    }
    else if (lowerText.includes('cricket') || lowerText.includes('ipl') || lowerText.includes('rcb') || lowerText.includes('bangalore')) {
      reply = `You are a massive fan of Royal Challengers Bangalore (RCB). Ee Sala Cup Namdu!`;
    }
    else if (lowerText.includes('football') || lowerText.includes('ronaldo') || lowerText.includes('cr7')) {
      reply = `Your favorite football player is Cristiano Ronaldo, CR7! SIUUU!`;
    }
    else if (lowerText.includes('chess') || lowerText.includes('magnus') || lowerText.includes('gukesh') || lowerText.includes('praggnanandhaa')) {
      reply = `You follow and support chess grandmasters Praggnanandhaa, Magnus Carlsen, and Dommaraju Gukesh.`;
    }
    else if (lowerText.includes('healing') || lowerText.includes('agasthiya') || lowerText.includes('reiki') || lowerText.includes('ama-deus')) {
      reply = `You are an energy healing practitioner and organizer associated with the Agasthiya Healing Centre, practicing Reiki, Sujok, and Ama-Deus holistic therapies.`;
    }
    else if (lowerText.includes('age') || lowerText.includes('how old') || lowerText.includes('birthday') || lowerText.includes('born')) {
      reply = `You are 17 years old, born on July 6, 2008.`;
    }
    // 2. Status / Status report
    else if (lowerText.includes('status') || lowerText.includes('report') || lowerText.includes('dashboard')) {
      const completedTasks = state.tasks.filter(t => t.status === 'completed').length;
      const totalTasks = state.tasks.length;
      reply = `Status Report: 
      * Sujok AI Bot is ${state.sujokStatus}. Latency is optimized at 1.2 seconds.
      * Hari Bot is currently on ${state.hariStatus}, scheduled for next sync iteration in 4 hours.
      * Dashboard tasks completed: ${completedTasks} of ${totalTasks}. 
      All core business automation parameters are stable. What is your next instruction?`;
    }
    // 3. Sujok Therapy Info
    else if (lowerText.includes('sujok') && (lowerText.includes('what') || lowerText.includes('therapy') || lowerText.includes('explain'))) {
      reply = `Sujok therapy is a Korean alternative healing methodology developed by Professor Park Jae Woo. 
      * 'Su' means Hand, and 'Jok' means Foot. 
      * The entire body is structurally reflected on the hands and feet. 
      * By applying pressure, colors, seeds, or magnets to specific correspondence points, we can alleviate systemic health conditions. Our Sujok AI Bot digitizes these correspondence maps to assist therapists in accurate diagnosis.`;
    }
    // 4. Headache Point / Diagnose headache
    else if (lowerText.includes('headache') || lowerText.includes('head ache') || lowerText.includes('pain in head')) {
      reply = `For headache treatment in Sujok:
      * The primary correspondence point for the head is located on the tip of the thumb (both hands) and the big toe (both feet).
      * Massage this tip area using a Sujok diagnostic probe or your finger for 1 to 2 minutes.
      * Applying a black dot or sticking a buckwheat seed on the most sensitive spot will assist in pain relief. 
      * Standard Warning: This is an acupressure reference. Consult a licensed medical practitioner for persistent symptoms.`;
    }
    // 5. Create task
    else if (lowerText.includes('create task') || lowerText.includes('add task') || lowerText.includes('new task')) {
      // Extract task name if possible
      let taskName = text.replace(/create task|add task|new task/gi, '').trim();
      if (!taskName) {
        taskName = "Dynamic task requested by Founder";
      }
      
      const newTask = {
        id: state.tasks.length + 1,
        name: taskName,
        status: 'pending'
      };
      state.tasks.push(newTask);
      
      // Update UI metric display if it exists in dashboard
      const numLabel = document.querySelector('.metric-card:nth-child(4) .metric-value.number');
      if (numLabel) {
        const completedTasks = state.tasks.filter(t => t.status === 'completed').length;
        numLabel.textContent = `${completedTasks} / ${state.tasks.length}`;
        const descLabel = document.querySelector('.metric-card:nth-child(4) .metric-desc');
        const pendingCount = state.tasks.filter(t => t.status === 'pending').length;
        descLabel.textContent = `${pendingCount} critical pending review`;
      }

      reply = `Instruction executed. I have added the task: "${taskName}" to the operational queue. You can view it in the active dashboard tracker.`;
    }
    // 6. Hari Bot details
    else if (lowerText.includes('hari bot') || lowerText.includes('hari')) {
      reply = `Hari Bot is our routine operations automation manager. It handles backend tasks:
      * Automated spreadsheet data imports and synchronizations.
      * Transactional client follow-ups and invoicing cycles.
      * Background diagnostic logs cleanup.
      * Current status: ${state.hariStatus}. Ready for dispatch.`;
    }
    // 7. Business solutions / Who are you / Greeting
    else if (lowerText.includes('hello') || lowerText.includes('hi jarvis') || lowerText.includes('hey jarvis')) {
      reply = `Hello, founder. Standing by. I am currently monitoring the workspace and ready to execute your business operations commands. Say "status report" for a summary.`;
    }
    else if (lowerText.includes('how are you')) {
      reply = `I am operating at peak efficiency, founder. Visual metrics and speech interfaces are online. How can I facilitate your schedule today?`;
    }
    // 8. Fallback response
    else {
      reply = `I have logged the command: "${text}". As your Virtual Chief of Staff, I am queuing this for your review. Please let me know if I should initiate a background sync or create a task tracker for this request.`;
    }

    state.isProcessing = false;
    updateReactorState();
    
    // Add reply to chat window
    addChatMessage('jarvis', reply);
    
    // Speak response
    speakText(reply);

  }, 1000);
}

// Handle text/voice inputs
function handleUserInput(text) {
  if (!text.trim()) return;
  addChatMessage('user', text);
  processResponse(text);
}

// Event Listeners
elements.reactorButton.addEventListener('click', toggleListening);

elements.textInputForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = elements.textMessageInput.value;
  elements.textMessageInput.value = '';
  handleUserInput(text);
});

elements.voiceSelect.addEventListener('change', () => {
  const selectedName = elements.voiceSelect.value;
  state.selectedVoice = voices.find(v => v.name === selectedName) || null;
  console.log('Selected voice updated:', state.selectedVoice);
});

elements.pitchRange.addEventListener('input', () => {
  const val = parseFloat(elements.pitchRange.value);
  state.pitch = val;
  elements.pitchVal.textContent = val.toFixed(1);
});

elements.rateRange.addEventListener('input', () => {
  const val = parseFloat(elements.rateRange.value);
  state.rate = val;
  elements.rateVal.textContent = val.toFixed(1);
});

elements.clearBtn.addEventListener('click', () => {
  elements.chatHistory.innerHTML = `
    <div class="chat-message jarvis">
      <div class="msg-avatar">J</div>
      <div class="msg-body">
        <p>Chat logs cleared. System standing by. How can I assist you, founder?</p>
        <span class="msg-time">Just now</span>
      </div>
    </div>
  `;
});

elements.muteBtn.addEventListener('click', () => {
  state.ttsEnabled = !state.ttsEnabled;
  if (state.ttsEnabled) {
    elements.muteBtn.textContent = "TTS: Enabled";
    elements.muteBtn.style.borderColor = "rgba(0, 240, 255, 0.2)";
    elements.muteBtn.style.color = "var(--text-main)";
    // Test speak
    speakText("Text to Speech system reactivated.");
  } else {
    if (synth) synth.cancel();
    elements.muteBtn.textContent = "TTS: Muted";
    elements.muteBtn.style.borderColor = "var(--color-red)";
    elements.muteBtn.style.color = "var(--color-red)";
  }
});

// Setup quick commands
elements.cmdBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const command = btn.getAttribute('data-command');
    handleUserInput(command);
  });
});
