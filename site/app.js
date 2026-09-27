(function () {
  "use strict";

  const els = {
    libraryView: document.getElementById("library-view"),
    guideView: document.getElementById("guide-view"),
    guideGrid: document.getElementById("guide-grid"),
    emptyState: document.getElementById("empty-state"),
    loadError: document.getElementById("load-error"),
    searchInput: document.getElementById("search-input"),
    categoryFilter: document.getElementById("category-filter"),
    guideCount: document.getElementById("guide-count"),
    pageCount: document.getElementById("page-count"),
    categoryCount: document.getElementById("category-count"),
    backButton: document.getElementById("back-button"),
    guideCategory: document.getElementById("guide-category"),
    guideDate: document.getElementById("guide-date"),
    guideTitle: document.getElementById("guide-title"),
    guideSummary: document.getElementById("guide-summary"),
    sourceLink: document.getElementById("source-link"),
    sourcesLink: document.getElementById("sources-link"),
    thumbnailList: document.getElementById("thumbnail-list"),
    viewerCard: document.getElementById("viewer-card"),
    imageScroller: document.getElementById("image-scroller"),
    viewerImage: document.getElementById("viewer-image"),
    prevButton: document.getElementById("prev-button"),
    nextButton: document.getElementById("next-button"),
    pageIndicator: document.getElementById("page-indicator"),
    zoomOutButton: document.getElementById("zoom-out-button"),
    zoomInButton: document.getElementById("zoom-in-button"),
    fitButton: document.getElementById("fit-button"),
    fullscreenButton: document.getElementById("fullscreen-button"),
    originalLink: document.getElementById("original-link"),
    pageKicker: document.getElementById("page-kicker"),
    pageTitle: document.getElementById("page-title"),
    pageDescription: document.getElementById("page-description"),
    zoomLabel: document.getElementById("zoom-label")
  };

  const state = {
    catalog: [],
    query: "",
    category: "all",
    currentGuide: null,
    pageIndex: 0,
    zoom: 1,
    touchStartX: null,
    touchStartY: null
  };

  const categoryLabels = {
    ai: "AI",
    development: "Development",
    games: "Games",
    research: "Research",
    other: "Other"
  };

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function categoryLabel(category) {
    return categoryLabels[category] || category;
  }

  function formatDate(value) {
    if (!value) return "";
    const date = new Date(value + "T00:00:00");
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(date);
  }

  function normalizedSearchText(guide) {
    const pageText = (guide.assets || []).map(function (asset) {
      return [asset.title, asset.description].filter(Boolean).join(" ");
    }).join(" ");
    return [
      guide.title,
      guide.summary,
      guide.category,
      (guide.tags || []).join(" "),
      pageText
    ].filter(Boolean).join(" ").toLocaleLowerCase("ko-KR");
  }

  async function loadCatalog() {
    try {
      const response = await fetch("./catalog.json", { cache: "no-store" });
      if (!response.ok) throw new Error("catalog HTTP " + response.status);
      const payload = await response.json();
      state.catalog = Array.isArray(payload.guides) ? payload.guides : [];
      renderStats();
      renderCategoryOptions();
      renderLibrary();
      routeFromHash();
    } catch (error) {
      console.error(error);
      els.libraryView.classList.add("hidden");
      els.loadError.classList.remove("hidden");
    }
  }

  function renderStats() {
    const totalPages = state.catalog.reduce(function (sum, guide) {
      return sum + (guide.assets ? guide.assets.length : 0);
    }, 0);
    const categories = new Set(state.catalog.map(function (guide) {
      return guide.category;
    }).filter(Boolean));

    els.guideCount.textContent = String(state.catalog.length);
    els.pageCount.textContent = String(totalPages);
    els.categoryCount.textContent = String(categories.size);
  }

  function renderCategoryOptions() {
    const categories = Array.from(new Set(state.catalog.map(function (guide) {
      return guide.category;
    }).filter(Boolean))).sort();

    categories.forEach(function (category) {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = categoryLabel(category);
      els.categoryFilter.appendChild(option);
    });
  }

  function filteredGuides() {
    const query = state.query.trim().toLocaleLowerCase("ko-KR");
    return state.catalog.filter(function (guide) {
      if (state.category !== "all" && guide.category !== state.category) return false;
      if (!query) return true;
      return normalizedSearchText(guide).includes(query);
    });
  }

  function renderLibrary() {
    const guides = filteredGuides();
    els.guideGrid.innerHTML = guides.map(function (guide) {
      const cover = guide.cover || (guide.assets && guide.assets[0] && guide.assets[0].path) || "";
      return [
        '<article class="guide-card" tabindex="0" role="button" data-guide="' + escapeHtml(guide.slug) + '" aria-label="' + escapeHtml(guide.title) + ' 열기">',
        '  <div class="guide-card-cover">',
        '    <img src="' + escapeHtml(cover) + '" alt="" loading="lazy">',
        '  </div>',
        '  <div class="guide-card-body">',
        '    <div class="guide-card-meta">',
        '      <span class="chip">' + escapeHtml(categoryLabel(guide.category)) + '</span>',
        '      <time>' + escapeHtml(formatDate(guide.created)) + '</time>',
        '    </div>',
        '    <h2>' + escapeHtml(guide.title) + '</h2>',
        '    <p>' + escapeHtml(guide.summary || "") + '</p>',
        '    <div class="guide-card-footer">',
        '      <span><strong>' + escapeHtml(String((guide.assets || []).length)) + '</strong> pages</span>',
        '      <span>보기 →</span>',
        '    </div>',
        '  </div>',
        '</article>'
      ].join("\n");
    }).join("\n");

    els.emptyState.classList.toggle("hidden", guides.length !== 0);

    els.guideGrid.querySelectorAll(".guide-card").forEach(function (card) {
      function open() {
        openGuide(card.getAttribute("data-guide"), 0, true);
      }
      card.addEventListener("click", open);
      card.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          open();
        }
      });
    });
  }

  function findGuide(slug) {
    return state.catalog.find(function (guide) {
      return guide.slug === slug;
    }) || null;
  }

  function openGuide(slug, pageIndex, updateHash) {
    const guide = findGuide(slug);
    if (!guide) {
      showLibrary(true);
      return;
    }

    state.currentGuide = guide;
    state.pageIndex = Math.max(0, Math.min(pageIndex || 0, guide.assets.length - 1));
    state.zoom = 1;

    els.libraryView.classList.add("hidden");
    els.loadError.classList.add("hidden");
    els.guideView.classList.remove("hidden");

    els.guideCategory.textContent = categoryLabel(guide.category);
    els.guideDate.textContent = formatDate(guide.created);
    els.guideDate.setAttribute("datetime", guide.created || "");
    els.guideTitle.textContent = guide.title;
    els.guideSummary.textContent = guide.summary || "";
    els.sourceLink.href = guide.source_url || "https://github.com/Legerdo/visual-guides";

    if (guide.sources_url) {
      els.sourcesLink.href = guide.sources_url;
      els.sourcesLink.classList.remove("hidden");
    } else {
      els.sourcesLink.classList.add("hidden");
    }

    renderThumbnails();
    renderPage(false);
    window.scrollTo({ top: 0, behavior: "auto" });

    if (updateHash) updateHashForCurrentPage();
  }

  function renderThumbnails() {
    if (!state.currentGuide) return;
    els.thumbnailList.innerHTML = state.currentGuide.assets.map(function (asset, index) {
      return [
        '<button class="thumbnail-button' + (index === state.pageIndex ? " active" : "") + '" type="button" data-page="' + index + '" aria-label="' + escapeHtml("페이지 " + (index + 1) + ": " + (asset.title || "")) + '">',
        '  <img src="' + escapeHtml(asset.path) + '" alt="" loading="lazy">',
        '  <span>' + String(index + 1).padStart(2, "0") + '</span>',
        '</button>'
      ].join("\n");
    }).join("\n");

    els.thumbnailList.querySelectorAll(".thumbnail-button").forEach(function (button) {
      button.addEventListener("click", function () {
        setPage(Number(button.getAttribute("data-page")), true);
      });
    });
  }

  function currentAsset() {
    if (!state.currentGuide) return null;
    return state.currentGuide.assets[state.pageIndex] || null;
  }

  function renderPage(scrollThumbnail) {
    const asset = currentAsset();
    if (!asset) return;

    els.viewerImage.src = asset.path;
    els.viewerImage.alt = asset.title || state.currentGuide.title + " 페이지 " + (state.pageIndex + 1);
    els.originalLink.href = asset.path;
    els.pageIndicator.textContent = (state.pageIndex + 1) + " / " + state.currentGuide.assets.length;
    els.pageKicker.textContent = "PAGE " + String(state.pageIndex + 1).padStart(2, "0");
    els.pageTitle.textContent = asset.title || state.currentGuide.title;
    els.pageDescription.textContent = asset.description || "";
    els.prevButton.disabled = state.pageIndex === 0;
    els.nextButton.disabled = state.pageIndex === state.currentGuide.assets.length - 1;

    els.thumbnailList.querySelectorAll(".thumbnail-button").forEach(function (button, index) {
      button.classList.toggle("active", index === state.pageIndex);
      button.setAttribute("aria-current", index === state.pageIndex ? "page" : "false");
    });

    if (scrollThumbnail) {
      const active = els.thumbnailList.querySelector(".thumbnail-button.active");
      if (active) active.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    }

    state.zoom = 1;
    els.imageScroller.scrollTo({ top: 0, left: 0 });
    updateZoomLabel();
  }

  function setPage(index, updateHash) {
    if (!state.currentGuide) return;
    const clamped = Math.max(0, Math.min(index, state.currentGuide.assets.length - 1));
    if (clamped === state.pageIndex) return;
    state.pageIndex = clamped;
    renderPage(true);
    if (updateHash) updateHashForCurrentPage();
  }

  function updateHashForCurrentPage() {
    if (!state.currentGuide) return;
    const params = new URLSearchParams();
    params.set("guide", state.currentGuide.slug);
    params.set("page", String(state.pageIndex + 1));
    const nextHash = "#" + params.toString();
    if (window.location.hash !== nextHash) {
      history.pushState(null, "", nextHash);
    }
  }

  function showLibrary(updateHash) {
    state.currentGuide = null;
    state.pageIndex = 0;
    state.zoom = 1;
    els.guideView.classList.add("hidden");
    els.libraryView.classList.remove("hidden");
    if (updateHash && window.location.hash) {
      history.pushState(null, "", window.location.pathname + window.location.search);
    }
  }

  function routeFromHash() {
    const raw = window.location.hash.replace(/^#/, "");
    if (!raw) {
      showLibrary(false);
      return;
    }

    const params = new URLSearchParams(raw);
    const slug = params.get("guide");
    if (!slug) {
      showLibrary(false);
      return;
    }
    const page = Math.max(0, (Number(params.get("page")) || 1) - 1);
    openGuide(slug, page, false);
  }

  function fitBaseWidth() {
    if (!els.viewerImage.naturalWidth) return 0;
    const available = Math.max(240, els.imageScroller.clientWidth - 52);
    return Math.min(els.viewerImage.naturalWidth, available);
  }

  function renderZoom() {
    const base = fitBaseWidth();
    if (!base) return;
    els.viewerImage.style.width = Math.round(base * state.zoom) + "px";
    updateZoomLabel();
  }

  function updateZoomLabel() {
    els.zoomLabel.textContent = state.zoom === 1 ? "맞춤" : Math.round(state.zoom * 100) + "%";
  }

  function setZoom(nextZoom) {
    const previousScrollWidth = els.imageScroller.scrollWidth;
    const previousScrollHeight = els.imageScroller.scrollHeight;
    const centerX = els.imageScroller.scrollLeft + els.imageScroller.clientWidth / 2;
    const centerY = els.imageScroller.scrollTop + els.imageScroller.clientHeight / 2;

    state.zoom = Math.max(0.75, Math.min(3, Math.round(nextZoom * 100) / 100));
    renderZoom();

    requestAnimationFrame(function () {
      const ratioX = previousScrollWidth ? centerX / previousScrollWidth : 0;
      const ratioY = previousScrollHeight ? centerY / previousScrollHeight : 0;
      els.imageScroller.scrollLeft = ratioX * els.imageScroller.scrollWidth - els.imageScroller.clientWidth / 2;
      els.imageScroller.scrollTop = ratioY * els.imageScroller.scrollHeight - els.imageScroller.clientHeight / 2;
    });
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      if (els.viewerCard.requestFullscreen) {
        els.viewerCard.requestFullscreen().catch(function (error) {
          console.error(error);
        });
      }
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }

  function isTypingTarget(target) {
    return target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      (target && target.isContentEditable);
  }

  els.searchInput.addEventListener("input", function () {
    state.query = els.searchInput.value;
    renderLibrary();
  });

  els.categoryFilter.addEventListener("change", function () {
    state.category = els.categoryFilter.value;
    renderLibrary();
  });

  els.backButton.addEventListener("click", function () {
    showLibrary(true);
  });

  els.prevButton.addEventListener("click", function () {
    setPage(state.pageIndex - 1, true);
  });

  els.nextButton.addEventListener("click", function () {
    setPage(state.pageIndex + 1, true);
  });

  els.zoomOutButton.addEventListener("click", function () {
    setZoom(state.zoom - 0.25);
  });

  els.zoomInButton.addEventListener("click", function () {
    setZoom(state.zoom + 0.25);
  });

  els.fitButton.addEventListener("click", function () {
    state.zoom = 1;
    renderZoom();
    els.imageScroller.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  });

  els.fullscreenButton.addEventListener("click", toggleFullscreen);

  els.viewerImage.addEventListener("load", function () {
    renderZoom();
  });

  window.addEventListener("resize", function () {
    if (state.currentGuide && state.zoom === 1) renderZoom();
  });

  window.addEventListener("hashchange", routeFromHash);

  document.addEventListener("keydown", function (event) {
    if (isTypingTarget(event.target) || !state.currentGuide) return;

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setPage(state.pageIndex - 1, true);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      setPage(state.pageIndex + 1, true);
    } else if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      setZoom(state.zoom + 0.25);
    } else if (event.key === "-") {
      event.preventDefault();
      setZoom(state.zoom - 0.25);
    } else if (event.key === "0") {
      event.preventDefault();
      state.zoom = 1;
      renderZoom();
      els.imageScroller.scrollTo({ top: 0, left: 0 });
    } else if (event.key.toLowerCase() === "f") {
      event.preventDefault();
      toggleFullscreen();
    } else if (event.key === "Escape" && !document.fullscreenElement) {
      event.preventDefault();
      showLibrary(true);
    }
  });

  els.imageScroller.addEventListener("touchstart", function (event) {
    if (event.touches.length !== 1 || state.zoom > 1) return;
    state.touchStartX = event.touches[0].clientX;
    state.touchStartY = event.touches[0].clientY;
  }, { passive: true });

  els.imageScroller.addEventListener("touchend", function (event) {
    if (state.touchStartX == null || state.touchStartY == null || state.zoom > 1) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - state.touchStartX;
    const dy = touch.clientY - state.touchStartY;
    state.touchStartX = null;
    state.touchStartY = null;

    if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
    if (dx < 0) setPage(state.pageIndex + 1, true);
    else setPage(state.pageIndex - 1, true);
  }, { passive: true });

  document.addEventListener("fullscreenchange", function () {
    els.fullscreenButton.textContent = document.fullscreenElement ? "전체화면 종료" : "전체화면";
    if (state.currentGuide && state.zoom === 1) {
      requestAnimationFrame(renderZoom);
    }
  });

  loadCatalog();
})();
