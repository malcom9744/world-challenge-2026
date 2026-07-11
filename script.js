const DEFAULT_CHALLENGES = [
  {
    title: "Défi 1 · Étoile bleue",
    hint: "Le premier code se cache dans la trajectoire du ciel.",
    code: "WORLD01",
    location: "Pôle Nord",
    country: "Canada",
    flag: "🇨🇦"
  },
  {
    title: "Défi 2 · Passage secret",
    hint: "Un mot de passe fleuri ouvre le deuxième portail.",
    code: "ROSE22",
    location: "Jardin des vents",
    country: "France",
    flag: "🇫🇷"
  },
  {
    title: "Défi 3 · Mirage de l’océan",
    hint: "Le code suit le rythme des vagues et des points lumineux.",
    code: "TIDE33",
    location: "Plage du phare",
    country: "Brésil",
    flag: "🇧🇷"
  },
  {
    title: "Défi 4 · Aurore du nord",
    hint: "Le quatrième code se révèle avec une lumière froide.",
    code: "AURORA44",
    location: "Vallée glacée",
    country: "Norvège",
    flag: "🇳🇴"
  },
  {
    title: "Défi 5 · Final",
    hint: "Le dernier code est la clé de l’arrivée.",
    code: "QUEST55",
    location: "Tour du drapeau",
    country: "Japon",
    flag: "🇯🇵"
  }
];

const DEFAULT_TEAMS = [
  { name: "Équipe Alpha", time: null },
  { name: "Équipe Bravo", time: null },
  { name: "Équipe Charlie", time: null }
];

const ADMIN_PASSWORD = "WORLD2026";
const STORAGE_KEYS = {
  challenges: "wc2026_challenges",
  teams: "wc2026_teams",
  currentTeam: "wc2026_current_team"
};

let challengeData = loadStoredData(STORAGE_KEYS.challenges, DEFAULT_CHALLENGES);
let teams = loadStoredData(STORAGE_KEYS.teams, DEFAULT_TEAMS);
let audioContext = null;

const state = {
  running: false,
  timerId: null,
  startTime: null,
  elapsed: 0,
  completed: 0,
  finished: false,
  scanStarted: false,
  scannerChallenge: null,
  scannerStream: null,
  scannerLoopId: null,
  scanCooldown: false
};

const challengeGrid = document.querySelector("#challengeGrid");
const progressBar = document.querySelector("#progressBar");
const progressText = document.querySelector("#progressText");
const timer = document.querySelector("#timer");
const startBtn = document.querySelector("#startBtn");
const resetBtn = document.querySelector("#resetBtn");
const teamSelect = document.querySelector("#teamSelect");
const adminBtn = document.querySelector("#adminBtn");
const publishBtn = document.querySelector("#publishBtn");
const qrModal = document.querySelector("#qrModal");
const scannerModal = document.querySelector("#scannerModal");
const closeModal = document.querySelector("#closeModal");
const closeScanner = document.querySelector("#closeScanner");
const closeAdmin = document.querySelector("#closeAdmin");
const modalTitle = document.querySelector("#modalTitle");
const qrDisplay = document.querySelector("#qrDisplay");
const toast = document.querySelector("#toast");
const victoryScreen = document.querySelector("#victoryScreen");
const victoryTime = document.querySelector("#victoryTime");
const victoryTeam = document.querySelector("#victoryTeam");
const restartBtn = document.querySelector("#restartBtn");
const confettiLayer = document.querySelector("#confettiLayer");
const feedbackOverlay = document.querySelector("#feedbackOverlay");
const leaderboardList = document.querySelector("#leaderboardList");
const adminModal = document.querySelector("#adminModal");
const adminPasswordInput = document.querySelector("#adminPassword");
const adminLogin = document.querySelector("#adminLogin");
const adminDashboard = document.querySelector("#adminDashboard");
const adminForm = document.querySelector("#adminForm");
const loginAdminBtn = document.querySelector("#loginAdmin");
const saveAdminBtn = document.querySelector("#saveAdmin");
const scannerStatus = document.querySelector("#scannerStatus");
const cameraPreview = document.querySelector("#cameraPreview");
const cameraCanvas = document.querySelector("#cameraCanvas");
const cameraContext = cameraCanvas.getContext("2d");

function loadStoredData(key, fallback) {
  try {
    const rawValue = window.localStorage.getItem(key);
    if (!rawValue) {
      return JSON.parse(JSON.stringify(fallback));
    }
    return JSON.parse(rawValue);
  } catch (error) {
    return JSON.parse(JSON.stringify(fallback));
  }
}

function persistData(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function buildChallenges() {
  challengeGrid.innerHTML = "";

  challengeData.forEach((challenge, index) => {
    const card = document.createElement("article");
    card.className = "challenge-card";
    card.dataset.index = String(index);

    card.innerHTML = `
      <div class="challenge-top">
        <span class="challenge-tag">${challenge.flag} ${challenge.country}</span>
        <span class="challenge-status">📍</span>
      </div>
      <div class="challenge-meta">
        <h3>${challenge.title}</h3>
        <span>${index + 1}/5</span>
      </div>
      <p class="challenge-location">Lieu : ${challenge.location}</p>
      <p>${challenge.hint}</p>
      <div class="code-row">
        <input class="code-input" type="text" maxlength="8" placeholder="Entrez le code" autocomplete="off" />
        <button class="validate-btn">Valider</button>
      </div>
      <div class="challenge-actions">
        <button class="qr-btn">QR visuel</button>
        <button class="camera-btn">Scanner</button>
      </div>
    `;

    challengeGrid.appendChild(card);
  });
}

function setProgress() {
  const total = challengeData.length;
  const progress = (state.completed / total) * 100;
  progressBar.style.width = `${progress}%`;
  progressText.textContent = `${state.completed} / ${total} défis`;
}

function formatTime(seconds) {
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function updateTimerDisplay() {
  timer.textContent = formatTime(state.elapsed);
}

function startTimer() {
  if (state.running) {
    return;
  }

  state.running = true;
  state.startTime = Date.now() - state.elapsed * 1000;
  startBtn.textContent = "Pause";
  state.timerId = window.setInterval(() => {
    state.elapsed = Math.floor((Date.now() - state.startTime) / 1000);
    updateTimerDisplay();
  }, 1000);
}

function stopTimer() {
  if (!state.running) {
    return;
  }

  state.running = false;
  startBtn.textContent = "Reprendre";
  clearInterval(state.timerId);
}

function resetGame() {
  stopTimer();
  state.elapsed = 0;
  state.completed = 0;
  state.finished = false;
  state.scanStarted = false;
  state.scannerChallenge = null;
  startBtn.textContent = "Pause";
  updateTimerDisplay();
  setProgress();
  buildChallenges();
  hideVictory();
  clearConfetti();
  showToast("Partie réinitialisée.");
}

const challengeGridClickHandler = (event) => {
  const button = event.target.closest("button");
  if (!button) {
    return;
  }

  const card = event.target.closest(".challenge-card");
  if (!card) {
    return;
  }

  const index = Number(card.dataset.index);

  if (button.classList.contains("validate-btn")) {
    validateChallenge(index);
  }

  if (button.classList.contains("qr-btn")) {
    openQrModal(index);
  }

  if (button.classList.contains("camera-btn")) {
    openScanner(index);
  }
};

const challengeGridKeyHandler = (event) => {
  if (event.key !== "Enter" || !event.target.classList.contains("code-input")) {
    return;
  }

  const card = event.target.closest(".challenge-card");
  if (!card) {
    return;
  }

  validateChallenge(Number(card.dataset.index));
};

function validateChallenge(index) {
  const card = challengeGrid.querySelector(`[data-index="${index}"]`);
  if (!card) {
    return;
  }

  const input = card.querySelector(".code-input");
  const expectedCode = challengeData[index].code;
  const value = input.value.trim().toUpperCase();

  if (!state.scanStarted && value === expectedCode) {
    state.scanStarted = true;
    startTimer();
  }

  if (value === expectedCode) {
    if (card.classList.contains("complete")) {
      showToast("Défi déjà validé.");
      return;
    }

    card.classList.add("complete", "success");
    card.querySelector(".challenge-status").textContent = "✅";
    input.disabled = true;
    state.completed += 1;
    setProgress();
    showSuccessFeedback();
    playSound("success");
    showToast(`Défi ${index + 1} validé !`);
    launchConfetti();

    if (state.completed === challengeData.length) {
      finishGame();
    }
  } else {
    card.classList.add("shake");
    playSound("error");
    showToast("Code invalide. Réessaie.");
    window.setTimeout(() => card.classList.remove("shake"), 320);
  }
}

function showSuccessFeedback() {
  feedbackOverlay.textContent = "Code validé";
  feedbackOverlay.classList.remove("hidden");
  window.setTimeout(() => {
    feedbackOverlay.classList.add("hidden");
  }, 450);
}

function openQrModal(index) {
  modalTitle.textContent = challengeData[index].title;
  renderQr(index);
  qrModal.classList.remove("hidden");
  qrModal.setAttribute("aria-hidden", "false");
}

function closeQrModal() {
  qrModal.classList.add("hidden");
  qrModal.setAttribute("aria-hidden", "true");
}

function renderQr(index) {
  qrDisplay.innerHTML = "";
  const grid = document.createElement("div");
  grid.className = "qr-grid";

  const pattern = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 1, 1, 0, 1],
    [1, 0, 1, 0, 0, 0, 1, 0, 1],
    [1, 0, 1, 0, 1, 0, 1, 0, 1],
    [1, 0, 1, 0, 1, 0, 1, 0, 1],
    [1, 0, 1, 0, 0, 0, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1]
  ];

  for (let y = 0; y < 9; y += 1) {
    for (let x = 0; x < 9; x += 1) {
      const cell = document.createElement("span");
      const seed = (x * 3 + y * 5 + index * 7) % 2;
      if (pattern[y][x] || seed === 0) {
        cell.classList.add("on");
      }
      grid.appendChild(cell);
    }
  }

  qrDisplay.appendChild(grid);
}

function openScanner(index) {
  state.scannerChallenge = index;
  scannerStatus.textContent = `Pointez la caméra sur le QR code du défi ${index + 1}.`;
  scannerModal.classList.remove("hidden");
  scannerModal.setAttribute("aria-hidden", "false");

  const mediaConstraints = {
    video: {
      facingMode: { ideal: "environment" }
    }
  };

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showToast("Scanner caméra non supporté sur cet appareil.");
    return;
  }

  navigator.mediaDevices.getUserMedia(mediaConstraints)
    .then((stream) => {
      state.scannerStream = stream;
      cameraPreview.srcObject = stream;
      cameraPreview.play().catch(() => undefined);
      state.scannerLoopId = window.requestAnimationFrame(scanFrame);
    })
    .catch(() => {
      showToast("La caméra n’a pas pu être lancée. Vérifie l’autorisation.");
      closeScannerModal();
    });
}

function scanFrame() {
  if (!state.scannerStream || !cameraPreview.videoWidth) {
    return;
  }

  cameraContext.drawImage(cameraPreview, 0, 0, cameraCanvas.width, cameraCanvas.height);
  const imageData = cameraContext.getImageData(0, 0, cameraCanvas.width, cameraCanvas.height);

  if (typeof jsQR !== "undefined") {
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert"
    });

    if (code && !state.scanCooldown) {
      state.scanCooldown = true;
      window.setTimeout(() => {
        state.scanCooldown = false;
      }, 1200);

      const scannedValue = code.data.trim().toUpperCase();
      const foundChallengeIndex = challengeData.findIndex((challenge) => challenge.code.toUpperCase() === scannedValue);

      if (foundChallengeIndex >= 0) {
        state.scanStarted = true;
        startTimer();
        const targetCard = challengeGrid.querySelector(`[data-index="${foundChallengeIndex}"]`);
        const targetInput = targetCard.querySelector(".code-input");
        targetInput.value = scannedValue;
        showToast(`QR détecté: ${challengeData[foundChallengeIndex].title}`);
        scannerStatus.textContent = `QR reconnu pour ${challengeData[foundChallengeIndex].title}.`;
        playSound("success");
      } else {
        scannerStatus.textContent = "QR reconnu mais non associé à un défi.";
        playSound("error");
        showToast("QR non reconnu.");
      }
    }
  }

  state.scannerLoopId = window.requestAnimationFrame(scanFrame);
}

function closeScannerModal() {
  if (state.scannerStream) {
    state.scannerStream.getTracks().forEach((track) => track.stop());
  }

  if (state.scannerLoopId) {
    window.cancelAnimationFrame(state.scannerLoopId);
  }

  state.scannerStream = null;
  state.scannerLoopId = null;
  scannerModal.classList.add("hidden");
  scannerModal.setAttribute("aria-hidden", "true");
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.remove("hidden");
  clearTimeout(showToast.timerId);
  showToast.timerId = window.setTimeout(() => {
    toast.classList.add("hidden");
  }, 2000);
}

function ensureAudioContext() {
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) {
    return null;
  }

  if (!audioContext) {
    audioContext = new AudioCtor();
  }

  return audioContext;
}

function playSound(type) {
  const context = ensureAudioContext();
  if (!context) {
    return;
  }

  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.connect(gain);
  gain.connect(context.destination);

  oscillator.type = type === "success" ? "triangle" : "sawtooth";
  oscillator.frequency.value = type === "success" ? 660 : 180;
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.06, context.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.35);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.42);
}

function finishGame() {
  state.finished = true;
  stopTimer();
  victoryTime.textContent = `Temps final : ${formatTime(state.elapsed)}`;
  const selectedTeam = teamSelect.value;
  victoryTeam.textContent = `Équipe : ${selectedTeam}`;
  persistRanking(selectedTeam, state.elapsed);
  renderLeaderboard();
  victoryScreen.classList.remove("hidden");
  victoryScreen.setAttribute("aria-hidden", "false");
  launchConfetti();
  playSound("success");
}

function hideVictory() {
  victoryScreen.classList.add("hidden");
  victoryScreen.setAttribute("aria-hidden", "true");
}

function persistRanking(teamName, time) {
  const existingTeam = teams.find((team) => team.name === teamName);

  if (!existingTeam) {
    teams.push({ name: teamName, time });
  } else if (existingTeam.time === null || time < existingTeam.time) {
    existingTeam.time = time;
  }

  persistData(STORAGE_KEYS.teams, teams);
}

function renderLeaderboard() {
  const sortedTeams = [...teams].sort((a, b) => {
    if (a.time === null && b.time === null) {
      return 0;
    }
    if (a.time === null) {
      return 1;
    }
    if (b.time === null) {
      return -1;
    }
    return a.time - b.time;
  });

  leaderboardList.innerHTML = "";

  sortedTeams.slice(0, 5).forEach((team, index) => {
    const item = document.createElement("li");
    item.className = "leaderboard-item";
    item.innerHTML = `
      <span class="leaderboard-rank">#${index + 1}</span>
      <span>${team.name}</span>
      <span class="leaderboard-time">${team.time === null ? "—" : formatTime(team.time)}</span>
    `;
    leaderboardList.appendChild(item);
  });
}

function populateTeamSelect() {
  teamSelect.innerHTML = "";
  teams.forEach((team) => {
    const option = document.createElement("option");
    option.value = team.name;
    option.textContent = team.name;
    teamSelect.appendChild(option);
  });

  const storedTeam = window.localStorage.getItem(STORAGE_KEYS.currentTeam);
  if (storedTeam && teams.some((team) => team.name === storedTeam)) {
    teamSelect.value = storedTeam;
  } else {
    window.localStorage.setItem(STORAGE_KEYS.currentTeam, teamSelect.value);
  }
}

function renderAdminForm() {
  adminForm.innerHTML = "";

  challengeData.forEach((challenge, index) => {
    const fieldset = document.createElement("div");
    fieldset.className = "admin-item";
    fieldset.innerHTML = `
      <strong>Défi ${index + 1}</strong>
      <label>Titre
        <input data-field="title" value="${challenge.title}" />
      </label>
      <label>Lieu
        <input data-field="location" value="${challenge.location}" />
      </label>
      <label>Pays
        <input data-field="country" value="${challenge.country}" />
      </label>
      <label>Drapeau
        <input data-field="flag" value="${challenge.flag}" />
      </label>
      <label>Indice
        <input data-field="hint" value="${challenge.hint}" />
      </label>
      <label>Code
        <input data-field="code" value="${challenge.code}" />
      </label>
    `;
    adminForm.appendChild(fieldset);
  });
}

function openAdminModal() {
  adminModal.classList.remove("hidden");
  adminModal.setAttribute("aria-hidden", "false");
  adminPasswordInput.value = "";
  adminDashboard.classList.add("hidden");
  adminLogin.classList.remove("hidden");
}

function closeAdminModal() {
  adminModal.classList.add("hidden");
  adminModal.setAttribute("aria-hidden", "true");
  adminPasswordInput.value = "";
  adminDashboard.classList.add("hidden");
  adminLogin.classList.remove("hidden");
}

function saveAdminChanges() {
  const adminRows = adminForm.querySelectorAll(".admin-item");
  const newChallenges = [];

  adminRows.forEach((row, index) => {
    const fields = row.querySelectorAll("input");
    const payload = {
      title: fields[0].value.trim() || `Défi ${index + 1}`,
      location: fields[1].value.trim() || `Lieu ${index + 1}`,
      country: fields[2].value.trim() || "Pays",
      flag: fields[3].value.trim() || "🌍",
      hint: fields[4].value.trim() || "Indice",
      code: fields[5].value.trim().toUpperCase() || `CODE${index + 1}`
    };
    newChallenges.push(payload);
  });

  challengeData = newChallenges;
  persistData(STORAGE_KEYS.challenges, challengeData);
  state.completed = 0;
  state.scanStarted = false;
  resetGame();
  showToast("Défis mis à jour dans l’administration.");
  closeAdminModal();
}

function launchConfetti() {
  clearConfetti();
  const colors = ["#38bdf8", "#22c55e", "#facc15", "#fb7185", "#a78bfa"];

  for (let i = 0; i < 120; i += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.style.left = `${Math.random() * 100}vw`;
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.setProperty("--drift", `${(Math.random() - 0.5) * 160}px`);
    piece.style.animationDuration = `${3 + Math.random() * 2}s`;
    piece.style.animationDelay = `${Math.random() * 0.2}s`;
    confettiLayer.appendChild(piece);
  }
}

function clearConfetti() {
  confettiLayer.innerHTML = "";
}

function publishToGitHubPages() {
  const repoUrl = "https://github.com/malcom9744/world-challenge-2026/actions/workflows/deploy-pages.yml";
  const pagesUrl = "https://malcom9744.github.io/world-challenge-2026";
  showToast(`Publication prévue via GitHub Pages. Ouvre: ${repoUrl}`);
  window.open(repoUrl, "_blank", "noopener,noreferrer");
  window.setTimeout(() => {
    window.open(pagesUrl, "_blank", "noopener,noreferrer");
  }, 300);
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js").catch(() => undefined);
    });
  }
}

startBtn.addEventListener("click", () => {
  if (state.finished) {
    return;
  }

  if (state.running) {
    stopTimer();
  } else {
    startTimer();
  }
});

resetBtn.addEventListener("click", resetGame);
publishBtn.addEventListener("click", publishToGitHubPages);
closeModal.addEventListener("click", closeQrModal);
closeScanner.addEventListener("click", closeScannerModal);
closeAdmin.addEventListener("click", closeAdminModal);
teamSelect.addEventListener("change", () => {
  window.localStorage.setItem(STORAGE_KEYS.currentTeam, teamSelect.value);
  showToast(`Équipe sélectionnée : ${teamSelect.value}`);
});
restartBtn.addEventListener("click", resetGame);
adminBtn.addEventListener("click", openAdminModal);
loginAdminBtn.addEventListener("click", () => {
  if (adminPasswordInput.value === ADMIN_PASSWORD) {
    adminLogin.classList.add("hidden");
    adminDashboard.classList.remove("hidden");
    renderAdminForm();
  } else {
    showToast("Mot de passe incorrect.");
  }
});
saveAdminBtn.addEventListener("click", saveAdminChanges);
challengeGrid.addEventListener("click", challengeGridClickHandler);
challengeGrid.addEventListener("keydown", challengeGridKeyHandler);
qrModal.addEventListener("click", (event) => {
  if (event.target === qrModal) {
    closeQrModal();
  }
});
scannerModal.addEventListener("click", (event) => {
  if (event.target === scannerModal) {
    closeScannerModal();
  }
});

buildChallenges();
populateTeamSelect();
renderLeaderboard();
setProgress();
updateTimerDisplay();
registerServiceWorker();
