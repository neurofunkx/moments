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
