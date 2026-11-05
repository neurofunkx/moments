const menuToggle = document.querySelector(".menu-toggle");
const navigation = document.querySelector("#primary-navigation");
const siteHeader = document.querySelector(".site-header");

if (siteHeader) {
  let previousScrollY = window.scrollY;

  const updateHeader = () => {
    const currentScrollY = window.scrollY;
    siteHeader.classList.toggle("is-scrolled", currentScrollY > 0);

    if (Math.abs(currentScrollY - previousScrollY) > 4) {
      if (currentScrollY > previousScrollY && currentScrollY > 120) {
        siteHeader.classList.add("is-hidden");
      } else {
        siteHeader.classList.remove("is-hidden");
      }

      previousScrollY = currentScrollY;
    }

    if (currentScrollY <= 80) {
      siteHeader.classList.remove("is-hidden");
    }
  };

  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });
}

if (menuToggle && navigation) {
  const closeMenu = () => {
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation menu");
    navigation.classList.remove("is-open");
  };

  menuToggle.addEventListener("click", () => {
    const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "Open navigation menu" : "Close navigation menu");
    navigation.classList.toggle("is-open", !isOpen);
  });

  navigation.addEventListener("click", (event) => {
    if (event.target instanceof HTMLAnchorElement) {
      closeMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMenu();
    }
  });
}

const isLocalSite = ["localhost", "127.0.0.1"].includes(window.location.hostname);
const apiBase = isLocalSite
  ? "http://localhost:5446"
  : document.querySelector('meta[name="moments-api"]')?.getAttribute("content") || "";

const fetchJson = async (path) => {
  const response = await fetch(`${apiBase}${path}`);
  if (!response.ok) {
    throw new Error(`Unexpected status ${response.status}`);
  }
  return response.json();
};

const episodeNames = { intruder: "Intruder", arrival: "Arrival", riot: "Riot" };
const platformNames = { youtube: "YouTube", twitch: "Twitch" };
const placeholderImages = ["assets/moment-preview-1.jpg", "assets/moment-preview-2.jpg", "assets/moment-preview-3.jpg"];
const rankClasses = ["rank-first", "rank-second", "rank-third", "rank-fourth", "rank-fifth"];

const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);

const makeElement = (tag, className, text) => {
  const element = document.createElement(tag);
  if (className) {
    element.className = className;
  }
  if (text !== undefined) {
    element.textContent = text;
  }
  return element;
};

const episodeFilters = document.querySelectorAll("[data-episode-filter]");
const languageFilter = document.querySelector("#language-filter");
const momentGrid = document.querySelector("#moment-grid");
const momentStatus = document.querySelector("#moment-status");
const playerFilter = document.querySelector("#moment-player-filter");
const playerClear = document.querySelector("#moment-player-clear");
const leaderboardList = document.querySelector("#leaderboard-list");

let activeEpisode = "all";
let activePlayer = "";

const filterMoments = () => {
  const cards = [...momentGrid.children];
  if (cards.length === 0) {
    return;
  }
  cards.forEach((card) => {
    const matchesEpisode = activeEpisode === "all" || card.dataset.episode === activeEpisode;
    const matchesLanguage = languageFilter.value === "all" || card.dataset.language === languageFilter.value;
    const matchesPlayer = !activePlayer || card.dataset.player === activePlayer;
    card.hidden = !matchesEpisode || !matchesLanguage || !matchesPlayer;
  });

  const anyVisible = cards.some((card) => !card.hidden);
  momentStatus.textContent = anyVisible ? "" : "No Moments match these filters.";
  momentStatus.hidden = anyVisible;

  playerFilter.hidden = !activePlayer;
  playerFilter.querySelector("span").textContent = activePlayer ? `Showing Moments by ${activePlayer}` : "";
};

const buildMomentCard = (moment, index) => {
  const card = makeElement("a", "moment-card");
  card.href = moment.videoUrl;
  card.target = "_blank";
  card.rel = "noopener noreferrer";
  card.dataset.episode = moment.episode;
  card.dataset.language = moment.language;
  card.dataset.player = moment.handle;

  const placeholder = placeholderImages[index % placeholderImages.length];
  const frame = makeElement("div", "moment-image");
  const image = document.createElement("img");
  image.src = moment.thumbnail || placeholder;
  image.alt = "";
  image.width = 452;
  image.height = 250;
  image.loading = "lazy";
  image.decoding = "async";
  image.addEventListener("error", () => {
    image.src = placeholder;
  }, { once: true });
  frame.append(image);

  const details = [
    episodeNames[moment.episode] || capitalize(moment.episode),
    platformNames[moment.platform] || capitalize(moment.platform),
    capitalize(moment.language),
  ].join(" · ");

  const byline = makeElement("p", "moment-byline");
  byline.append(makeElement("strong", "", moment.handle));

  card.append(frame, makeElement("h3", "", moment.title), makeElement("p", "moment-details", details), byline);
  return card;
};

const buildLeaderboardRow = (player, index) => {
  const row = makeElement("a", "leaderboard-row");
  row.href = "#moments";
  row.setAttribute("aria-label", `View moments from ${player.handle}`);
  row.addEventListener("click", () => {
    activePlayer = player.handle;
    filterMoments();
  });

  const note = makeElement("span", "rank-note", `${player.moments} ${player.moments === 1 ? "moment" : "moments"} `);
  const arrow = makeElement("span", "", "›");
  arrow.setAttribute("aria-hidden", "true");
  note.append(arrow);
  const metrics = makeElement("div", "leaderboard-metrics");
  metrics.append(note);

  row.append(
    makeElement("span", `rank ${rankClasses[index] || ""}`.trim(), `#${index + 1}`),
    makeElement("strong", "", player.handle),
    metrics,
  );
  return row;
};

const addLanguageOptions = (moments) => {
  [...new Set(moments.map((moment) => moment.language))].sort().forEach((language) => {
    languageFilter.add(new Option(capitalize(language), language));
  });
};

const loadGallery = async () => {
  try {
    const { moments } = await fetchJson("/api/moments");
    momentGrid.replaceChildren(...moments.map(buildMomentCard));
    addLanguageOptions(moments);
    momentStatus.textContent = "No Moments yet. Yours could be the first.";
    momentStatus.hidden = moments.length > 0;
    filterMoments();
  } catch {
    momentStatus.textContent = "Moments are unavailable right now. Please try again soon.";
    momentStatus.hidden = false;
  }
};

const loadLeaderboard = async () => {
  const showMessage = (message) => {
    leaderboardList.replaceChildren(makeElement("p", "list-status", message));
  };
  try {
    const { players } = await fetchJson("/api/leaderboard");
    if (players.length === 0) {
      showMessage("No players on the board yet. Be the first.");
    } else {
      leaderboardList.replaceChildren(...players.map(buildLeaderboardRow));
    }
  } catch {
    showMessage("The leaderboard is unavailable right now. Please try again soon.");
  }
};

episodeFilters.forEach((filter) => {
  filter.addEventListener("click", () => {
    activeEpisode = filter.dataset.episodeFilter || "all";
    episodeFilters.forEach((button) => {
      const isActive = button === filter;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
    filterMoments();
  });
});

languageFilter.addEventListener("change", filterMoments);
playerClear.addEventListener("click", () => {
  activePlayer = "";
  filterMoments();
});

loadGallery();
loadLeaderboard();

const momentForm = document.querySelector("#moment-form");

if (momentForm instanceof HTMLFormElement) {
  const statusLine = document.querySelector("#submit-status");
  const signInBlock = document.querySelector("#submit-signin");
  const accountBlock = document.querySelector("#submit-account");
  const signInLink = document.querySelector("#steam-sign-in");
  const signOutButton = document.querySelector("#steam-sign-out");
  const submitButton = document.querySelector("#moment-submit");

  const loginMessages = {
    ok: "You're signed in. Add your Moment below.",
    failed: "Steam sign-in didn't complete. Please try again.",
    unavailable: "We couldn't reach Steam. Please try again in a few minutes.",
  };

  const submitErrors = {
    duplicate_video: "That video has already been submitted.",
    handle_taken: "That player name is taken. Please choose another.",
    daily_limit: "You've reached today's limit. Please try again tomorrow.",
    sign_in_required: "Your sign-in has expired. Please sign in again.",
  };

  const fieldErrors = {
    handle: "Use 3 to 32 letters, numbers, dots, dashes or underscores.",
    email: "Enter a valid email address, or leave this empty.",
    videoUrl: "Enter a link to a YouTube video or a Twitch video or clip.",
    title: "Use 3 to 120 characters.",
    description: "Use 500 characters or fewer.",
    episode: "Choose an episode.",
    language: "Choose a language.",
    acceptedRules: "Please confirm this before submitting.",
  };

  const showStatus = (message, isError = false) => {
    statusLine.textContent = message;
    statusLine.hidden = !message;
    statusLine.classList.toggle("is-error", isError);
  };

  const showFieldErrors = (fields = {}) => {
    momentForm.querySelectorAll("[data-error-for]").forEach((slot) => {
      slot.textContent = fields[slot.dataset.errorFor] ? fieldErrors[slot.dataset.errorFor] : "";
    });
  };

  const showSignedOut = () => {
    signInBlock.hidden = false;
    accountBlock.hidden = true;
    momentForm.hidden = true;
  };

  const showSignedIn = (account) => {
    signInBlock.hidden = true;
    accountBlock.hidden = false;
    momentForm.hidden = false;
    momentForm.elements.handle.value ||= account.handle || "";
    momentForm.elements.email.value ||= account.email || "";
  };

  const showOffline = () => {
    signInBlock.hidden = true;
    accountBlock.hidden = true;
    momentForm.hidden = true;
    showStatus("Submissions are unavailable right now. Please try again soon.", true);
  };

  // The sign-in result comes back in the address bar. Read it once, then tidy it away.
  const pageAddress = new URL(window.location.href);
  const loginResult = pageAddress.searchParams.get("login");
  if (loginResult) {
    pageAddress.searchParams.delete("login");
    window.history.replaceState(null, "", pageAddress);
  }

  const loadAccount = async () => {
    try {
      const response = await fetch(`${apiBase}/api/me`, { credentials: "include" });
      if (!response.ok) {
        throw new Error(`Unexpected status ${response.status}`);
      }
      const account = await response.json();
      if (account.signedIn) {
        showSignedIn(account);
      } else {
        showSignedOut();
      }
      if (loginMessages[loginResult]) {
        showStatus(loginMessages[loginResult], loginResult !== "ok");
      }
    } catch {
      showOffline();
    }
  };

  signInLink.href = `${apiBase}/auth/steam/login`;

  signOutButton.addEventListener("click", async () => {
    try {
      await fetch(`${apiBase}/auth/logout`, { method: "POST", credentials: "include" });
      momentForm.reset();
      showFieldErrors();
      showStatus("");
      showSignedOut();
    } catch {
      showStatus("Couldn't sign you out. Please try again.", true);
    }
  });

  momentForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    showStatus("");
    showFieldErrors();

    const invalid = {};
    Array.from(momentForm.elements).forEach((field) => {
      if (field.name && !field.checkValidity()) {
        invalid[field.name] = true;
      }
    });
    if (Object.keys(invalid).length > 0) {
      showFieldErrors(invalid);
      return;
    }

    const values = Object.fromEntries(new FormData(momentForm));
    values.acceptedRules = momentForm.elements.acceptedRules.checked;

    submitButton.disabled = true;
    try {
      const response = await fetch(`${apiBase}/api/submissions`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (response.status === 201) {
        const { handle, email } = momentForm.elements;
        const keep = { handle: handle.value, email: email.value };
        momentForm.reset();
        handle.value = keep.handle;
        email.value = keep.email;
        showStatus("Moment received. Our editors will review it soon.");
        return;
      }

      const failure = await response.json().catch(() => ({}));
      if (failure.error === "invalid") {
        showFieldErrors(failure.fields);
      } else if (failure.error === "handle_taken") {
        showFieldErrors({ handle: true });
        showStatus(submitErrors.handle_taken, true);
      } else {
        showStatus(submitErrors[failure.error] || "Something went wrong. Please try again.", true);
      }
      if (response.status === 401) {
        showSignedOut();
      }
    } catch {
      showStatus("Couldn't reach the server. Your details are still here, so please try again.", true);
    } finally {
      submitButton.disabled = false;
    }
  });

  loadAccount();
}
