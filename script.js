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

const episodeFilters = document.querySelectorAll("[data-episode-filter]");
const languageFilter = document.querySelector("#language-filter");
const momentCards = document.querySelectorAll(".moment-card[data-episode]");

if (languageFilter instanceof HTMLSelectElement && momentCards.length > 0) {
  let activeEpisode = "all";

  const filterMoments = () => {
    momentCards.forEach((card) => {
      const matchesEpisode = activeEpisode === "all" || card.dataset.episode === activeEpisode;
      const matchesLanguage = languageFilter.value === "all" || card.dataset.language === languageFilter.value;
      card.hidden = !matchesEpisode || !matchesLanguage;
    });
  };

  episodeFilters.forEach((filter) => {
    if (!(filter instanceof HTMLButtonElement)) {
      return;
    }

    filter.addEventListener("click", () => {
      activeEpisode = filter.dataset.episodeFilter || "all";
      episodeFilters.forEach((button) => {
        if (button instanceof HTMLButtonElement) {
          const isActive = button === filter;
          button.classList.toggle("is-active", isActive);
          button.setAttribute("aria-pressed", String(isActive));
        }
      });
      filterMoments();
    });
  });

  languageFilter.addEventListener("change", filterMoments);
}

const momentForm = document.querySelector("#moment-form");

if (momentForm instanceof HTMLFormElement) {
  const isLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  const apiBase = isLocal
    ? "http://localhost:5446"
    : document.querySelector('meta[name="moments-api"]')?.getAttribute("content") || "";

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
