(function () {
  "use strict";

  const els = {
    libraryView: document.getElementById("library-view"),
    guideView: document.getElementById("guide-view"),
    guideList: document.getElementById("guide-list"),
    emptyState: document.getElementById("empty-state"),
    loadError: document.getElementById("load-error"),
    searchInput: document.getElementById("search-input"),
    categoryTabsDynamic: document.getElementById("category-tabs-dynamic"),
    categoryTabs: document.querySelector(".category-tabs"),
    guideCount: document.getElementById("guide-count"),
    pageCount: document.getElementById("page-count"),
    resultCount: document.getElementById("result-count"),
    backButton: document.getElementById("back-button"),
    guideCategory: document.getElementById("guide-category"),
    guideDate: document.getElementById("guide-date"),
    guidePageCount: document.getElementById("guide-page-count"),
    guideTitle: document.getElementById("guide-title"),
    guideSummary: document.getElementById("guide-summary"),
    sourceLink: document.getElementById("source-link"),
    sourcesLink: document.getElementById("sources-link"),
    pageNavCount: document.getElementById("page-nav-count"),
    thumbnailList: document.getElementById("thumbnail-list"),
    pagesButton: document.getElementById("pages-button"),
    infoButton: document.getElementById("info-button"),
    pageDialog: document.getElementById("page-dialog"),
    detailsDialog: document.getElementById("details-dialog"),
    closePagesButton: document.getElementById("close-pages-button"),
    closeDetailsButton: document.getElementById("close-details-button"),
    viewerCard: document.getElementById("viewer-card"),
    imageScroller: document.getElementById("image-scroller"),
    imageCanvas: document.getElementById("image-canvas"),
    viewerImage: document.getElementById("viewer-image"),
    imageError: document.getElementById("image-error"),
    retryImageButton: document.getElementById("retry-image-button"),
    readerStatus: document.getElementById("reader-status"),
    prevButton: document.getElementById("prev-button"),
    nextButton: document.getElementById("next-button"),
    stagePrevButton: document.getElementById("stage-prev-button"),
    stageNextButton: document.getElementById("stage-next-button"),
    pageIndicator: document.getElementById("page-indicator"),
    zoomOutButton: document.getElementById("zoom-out-button"),
    zoomInButton: document.getElementById("zoom-in-button"),
    fitButton: document.getElementById("fit-button"),
    widthButton: document.getElementById("width-button"),
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
    mode: "fit",
    scale: 1,
    imageReady: false,
    imageRequest: 0,
    naturalWidth: 0,
    naturalHeight: 0,
    libraryScrollY: 0,
    libraryFocus: null,
    lastGuideSlug: null,
    touch: null,
    drag: null,
    ignoreDoubleClickUntil: 0,
    fullscreen: false,
    fullscreenExitAt: -Infinity,
    layoutFrame: 0,
    pageMotion: null,
    wheelDelta: 0,
    wheelResetTimer: 0,
    lastWheelTurnAt: -Infinity
  };

  const categoryLabels = {
    ai: "AI",
    development: "개발",
    games: "게임",
    research: "리서치",
    other: "기타"
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
      renderCategoryTabs();
      renderLibrary();
      routeFromHash();
    } catch (error) {
      console.error(error);
      document.body.classList.remove("is-reading");
      els.libraryView.classList.add("hidden");
      els.guideView.classList.add("hidden");
      els.loadError.classList.remove("hidden");
    }
  }

  function renderStats() {
    const totalPages = state.catalog.reduce(function (sum, guide) {
      return sum + (guide.assets ? guide.assets.length : 0);
    }, 0);

    els.guideCount.textContent = String(state.catalog.length);
    els.pageCount.textContent = String(totalPages);
  }

  function renderCategoryTabs() {
    const categories = Array.from(new Set(state.catalog.map(function (guide) {
      return guide.category;
    }).filter(Boolean))).sort();

    els.categoryTabsDynamic.innerHTML = categories.map(function (category) {
      return [
        '<button class="category-tab" type="button" data-category="' + escapeHtml(category) + '" role="tab" aria-selected="false">',
        escapeHtml(categoryLabel(category)),
        "</button>"
      ].join("");
    }).join("");

    els.categoryTabs.querySelectorAll(".category-tab").forEach(function (button) {
      button.addEventListener("click", function () {
        setCategory(button.getAttribute("data-category") || "all");
      });
    });
  }

  function setCategory(category) {
    state.category = category;
    els.categoryTabs.querySelectorAll(".category-tab").forEach(function (button) {
      const selected = button.getAttribute("data-category") === category;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-selected", selected ? "true" : "false");
    });
    renderLibrary();
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
    els.resultCount.textContent = String(guides.length);
    els.guideList.innerHTML = guides.map(function (guide) {
      const cover = guide.cover || (guide.assets && guide.assets[0] && guide.assets[0].path) || "";
      const tags = (guide.tags || []).slice(0, 4);

      return [
        '<button class="guide-row" type="button" data-guide="' + escapeHtml(guide.slug) + '">',
        '  <span class="guide-row__cover">',
        '    <img src="' + escapeHtml(cover) + '" alt="" loading="lazy">',
        "  </span>",
        '  <span class="guide-row__content">',
        '    <span class="guide-row__eyebrow">',
        '      <span class="badge">' + escapeHtml(categoryLabel(guide.category)) + "</span>",
        "      <time>" + escapeHtml(formatDate(guide.created)) + "</time>",
        "    </span>",
        "    <h3>" + escapeHtml(guide.title) + "</h3>",
        '    <span class="guide-row__summary">' + escapeHtml(guide.summary || "") + "</span>",
        '    <span class="guide-row__tags">' + tags.map(function (tag) {
          return '<span class="guide-row__tag">#' + escapeHtml(tag) + "</span>";
        }).join("") + "</span>",
        "  </span>",
        '  <span class="guide-row__suffix">',
        '    <span class="guide-row__pages">' + escapeHtml(String((guide.assets || []).length)) + " pages</span>",
        '    <span class="guide-row__arrow" aria-hidden="true">→</span>',
        "  </span>",
        "</button>"
      ].join("\n");
    }).join("\n");

    els.emptyState.classList.toggle("hidden", guides.length !== 0);

    els.guideList.querySelectorAll(".guide-row").forEach(function (row) {
      row.addEventListener("click", function () {
        openGuide(row.getAttribute("data-guide"), 0, true);
      });
    });
  }

  function findGuide(slug) {
    return state.catalog.find(function (guide) {
      return guide.slug === slug;
    }) || null;
  }

  function pageIndexInGuide(index, guide) {
    const value = Number.isFinite(index) ? Math.trunc(index) : 0;
    return Math.max(0, Math.min(value, guide.assets.length - 1));
  }

  function announce(message) {
    if (els.readerStatus) els.readerStatus.textContent = message;
  }

  function openGuide(slug, pageIndex, updateHash) {
    const guide = findGuide(slug);
    if (!guide || !guide.assets || !guide.assets.length) {
      showLibrary(false);
      history.replaceState(null, "", window.location.pathname + window.location.search);
      return;
    }

    const enteringReader = !state.currentGuide;
    if (enteringReader) {
      state.libraryScrollY = window.scrollY;
      state.libraryFocus = els.libraryView.contains(document.activeElement) ? document.activeElement : null;
    }
    closeDialogs();
    state.currentGuide = guide;
    state.lastGuideSlug = guide.slug;
    state.pageIndex = pageIndexInGuide(pageIndex, guide);

    document.body.classList.add("is-reading");
    els.libraryView.classList.add("hidden");
    els.loadError.classList.add("hidden");
    els.guideView.classList.remove("hidden");

    els.guideCategory.textContent = categoryLabel(guide.category);
    els.guideDate.textContent = formatDate(guide.created);
    els.guideDate.setAttribute("datetime", guide.created || "");
    els.guidePageCount.textContent = guide.assets.length + " 페이지";
    els.pageNavCount.textContent = String(guide.assets.length);
    els.guideTitle.textContent = guide.title;
    els.guideTitle.title = guide.title;
    els.guideSummary.textContent = guide.summary || "";
    els.sourceLink.href = guide.source_url || "https://github.com/Legerdo/visual-guides";
    document.title = guide.title + " · Visual Guides";

    if (guide.sources_url) {
      els.sourcesLink.href = guide.sources_url;
      els.sourcesLink.classList.remove("hidden");
    } else {
      els.sourcesLink.classList.add("hidden");
    }

    renderThumbnails();
    renderPage();
    if (updateHash) updateHashForCurrentPage();
    if (enteringReader) {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      requestAnimationFrame(function () {
        if (state.currentGuide) els.imageScroller.focus({ preventScroll: true });
      });
    }
  }

  function renderThumbnails() {
    if (!state.currentGuide) return;

    els.thumbnailList.innerHTML = state.currentGuide.assets.map(function (asset, index) {
      return [
        '<button class="thumbnail-button' + (index === state.pageIndex ? " is-selected" : "") + '" type="button" data-page="' + index + '" aria-label="' + escapeHtml("페이지 " + (index + 1) + ": " + (asset.title || "")) + '">',
        '  <img src="' + escapeHtml(asset.path) + '" alt="" loading="lazy">',
        '  <span class="thumbnail-button__meta">',
        '    <span class="thumbnail-button__number">' + String(index + 1).padStart(2, "0") + "</span>",
        '    <span class="thumbnail-button__title">' + escapeHtml(asset.title || "Page " + (index + 1)) + "</span>",
        "  </span>",
        "</button>"
      ].join("\n");
    }).join("\n");

    els.thumbnailList.querySelectorAll(".thumbnail-button").forEach(function (button) {
      button.addEventListener("click", function () {
        setPage(Number(button.getAttribute("data-page")), true);
        els.pageDialog.close();
      });
    });
  }

  function currentAsset() {
    if (!state.currentGuide) return null;
    return state.currentGuide.assets[state.pageIndex] || null;
  }

  function reducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function motionOffset(motion, distance) {
    const direction = motion && motion.direction < 0 ? -1 : 1;
    const axis = motion && motion.axis === "y" ? "y" : "x";
    return {
      x: axis === "x" ? direction * distance : 0,
      y: axis === "y" ? direction * distance : 0
    };
  }

  function animatePageDeparture(motion) {
    if (!motion || reducedMotion() || !state.imageReady || typeof els.viewerImage.animate !== "function") return;
    const imageRect = els.viewerImage.getBoundingClientRect();
    const stage = els.imageScroller.parentElement;
    const stageRect = stage.getBoundingClientRect();
    if (!imageRect.width || !imageRect.height) return;

    const ghost = els.viewerImage.cloneNode(false);
    ghost.removeAttribute("id");
    ghost.removeAttribute("alt");
    ghost.className = "page-transition-ghost";
    ghost.style.left = (imageRect.left - stageRect.left) + "px";
    ghost.style.top = (imageRect.top - stageRect.top) + "px";
    ghost.style.width = imageRect.width + "px";
    ghost.style.height = imageRect.height + "px";
    stage.appendChild(ghost);

    const offset = motionOffset(motion, 26);
    const animation = ghost.animate([
      { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)" },
      { opacity: 0, transform: "translate3d(" + (-offset.x) + "px, " + (-offset.y) + "px, 0) scale(.992)" }
    ], {
      duration: 210,
      easing: "cubic-bezier(.4, 0, .2, 1)",
      fill: "forwards"
    });
    animation.finished.catch(function () {}).then(function () { ghost.remove(); });
  }

  function animatePageArrival() {
    const motion = state.pageMotion;
    state.pageMotion = null;
    if (!motion || reducedMotion() || typeof els.imageCanvas.animate !== "function") return;
    const offset = motionOffset(motion, 30);
    els.imageCanvas.animate([
      { opacity: 0.16, transform: "translate3d(" + offset.x + "px, " + offset.y + "px, 0) scale(.992)" },
      { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)" }
    ], {
      duration: 240,
      easing: "cubic-bezier(.2, .8, .2, 1)"
    });
  }

  function animatePageBoundary(motion) {
    if (!motion || reducedMotion() || typeof els.imageCanvas.animate !== "function") return;
    const offset = motionOffset(motion, 10);
    els.imageCanvas.animate([
      { transform: "translate3d(0, 0, 0)" },
      { transform: "translate3d(" + (-offset.x) + "px, " + (-offset.y) + "px, 0)" },
      { transform: "translate3d(0, 0, 0)" }
    ], {
      duration: 180,
      easing: "cubic-bezier(.2, .8, .2, 1)"
    });
  }

  function renderPage() {
    const asset = currentAsset();
    if (!asset) return;

    const count = state.currentGuide.assets.length;
    els.viewerImage.alt = asset.title || state.currentGuide.title + " 페이지 " + (state.pageIndex + 1);
    els.originalLink.href = asset.path;
    els.pageIndicator.textContent = (state.pageIndex + 1) + " / " + count;
    els.pageKicker.textContent = "PAGE " + String(state.pageIndex + 1).padStart(2, "0");
    els.pageTitle.textContent = asset.title || state.currentGuide.title;
    els.pageTitle.title = els.pageTitle.textContent;
    els.pageDescription.textContent = asset.description || "";
    [els.prevButton, els.stagePrevButton].forEach(function (button) {
      button.disabled = state.pageIndex === 0;
    });
    [els.nextButton, els.stageNextButton].forEach(function (button) {
      button.disabled = state.pageIndex === count - 1;
    });
    els.thumbnailList.querySelectorAll(".thumbnail-button").forEach(function (button, index) {
      const selected = index === state.pageIndex;
      button.classList.toggle("is-selected", selected);
      if (selected) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    loadPageImage(asset);
  }

  function loadPageImage(asset) {
    const request = ++state.imageRequest;
    const expectedSrc = new URL(asset.path, document.baseURI).href;
    state.mode = "fit";
    state.scale = 1;
    state.imageReady = false;
    state.touch = null;
    endDrag();
    els.viewerImage.style.visibility = "hidden";
    els.viewerImage.style.width = "1px";
    els.viewerImage.style.height = "1px";
    els.imageScroller.style.overflow = "hidden";
    els.imageScroller.style.touchAction = "pinch-zoom";
    els.imageScroller.dataset.viewMode = "fit";
    els.imageScroller.classList.remove("is-zoomed");
    els.imageScroller.setAttribute("aria-busy", "true");
    if (els.imageError) els.imageError.classList.add("hidden");
    sizeCanvas(stageSize(), 1, 1);
    els.imageScroller.scrollTo({ top: 0, left: 0, behavior: "instant" });
    updateZoomLabel();
    announce((state.pageIndex + 1) + " 페이지를 불러오는 중입니다.");

    function loaded() {
      // A cached image may already be complete; a previous request must never resize this page.
      if (request !== state.imageRequest || state.imageReady || !state.currentGuide ||
          els.viewerImage.currentSrc !== expectedSrc || !els.viewerImage.complete ||
          !els.viewerImage.naturalWidth || !els.viewerImage.naturalHeight) return;
      state.naturalWidth = els.viewerImage.naturalWidth;
      state.naturalHeight = els.viewerImage.naturalHeight;
      state.imageReady = true;
      renderZoom();
      els.viewerImage.style.visibility = "visible";
      els.imageScroller.setAttribute("aria-busy", "false");
      animatePageArrival();
      announce((state.pageIndex + 1) + " / " + state.currentGuide.assets.length +
        " 페이지, " + els.viewerImage.alt + ". 화면에 맞춰 표시합니다.");
    }

    els.viewerImage.onload = loaded;
    els.viewerImage.onerror = function () {
      if (request !== state.imageRequest || !state.currentGuide) return;
      state.imageReady = false;
      state.pageMotion = null;
      els.imageScroller.setAttribute("aria-busy", "false");
      if (els.imageError) els.imageError.classList.remove("hidden");
      updateZoomLabel();
      announce("이미지를 불러오지 못했습니다. 다시 시도하거나 설명에서 원본을 열어주세요.");
    };
    els.viewerImage.src = asset.path;
    loaded();
  }

  function setPage(index, updateHash, motion) {
    if (!state.currentGuide) return;
    const clamped = pageIndexInGuide(index, state.currentGuide);
    const pageMotion = motion || {
      direction: clamped < state.pageIndex ? -1 : 1,
      axis: "x"
    };
    if (clamped === state.pageIndex) {
      animatePageBoundary(pageMotion);
      return;
    }
    animatePageDeparture(pageMotion);
    state.pageMotion = pageMotion;
    state.pageIndex = clamped;
    renderPage();
    if (updateHash) updateHashForCurrentPage();
  }

  function updateHashForCurrentPage() {
    if (!state.currentGuide) return;
    const params = new URLSearchParams();
    params.set("guide", state.currentGuide.slug);
    params.set("page", String(state.pageIndex + 1));
    const nextHash = "#" + params.toString();
    if (window.location.hash !== nextHash) history.pushState(null, "", nextHash);
  }

  function showLibrary(updateHash) {
    const leavingReader = !!state.currentGuide;
    closeDialogs();
    endDrag();
    state.currentGuide = null;
    state.pageIndex = 0;
    state.imageReady = false;
    state.imageRequest += 1;
    state.touch = null;
    state.pageMotion = null;
    state.wheelDelta = 0;
    state.lastWheelTurnAt = -Infinity;
    clearTimeout(state.wheelResetTimer);
    document.body.classList.remove("is-reading");
    els.guideView.classList.add("hidden");
    els.libraryView.classList.remove("hidden");
    document.title = "Visual Guides";
    if (document.fullscreenElement === els.viewerCard && document.exitFullscreen) {
      document.exitFullscreen().catch(function () {});
    }
    if (updateHash && window.location.hash) {
      history.pushState(null, "", window.location.pathname + window.location.search);
    }
    if (leavingReader) {
      requestAnimationFrame(function () {
        if (state.currentGuide) return;
        let target = state.libraryFocus;
        if (!target || !target.isConnected) {
          target = Array.from(els.guideList.querySelectorAll(".guide-row")).find(function (row) {
            return row.getAttribute("data-guide") === state.lastGuideSlug;
          }) || els.searchInput;
        }
        target.focus({ preventScroll: true });
        window.scrollTo({ top: state.libraryScrollY, left: 0, behavior: "instant" });
      });
    }
  }

  function routeFromHash() {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const slug = params.get("guide");
    if (!slug) {
      showLibrary(false);
      return;
    }
    const page = (Number(params.get("page")) || 1) - 1;
    if (state.currentGuide && state.currentGuide.slug === slug) {
      setPage(page, false);
    } else {
      openGuide(slug, page, false);
    }
  }

  function stageSize(withoutScrollbars) {
    const stage = els.imageScroller;
    const style = getComputedStyle(stage);
    const number = function (value) { return parseFloat(value) || 0; };
    const rect = stage.getBoundingClientRect();
    const width = withoutScrollbars ? rect.width - number(style.borderLeftWidth) - number(style.borderRightWidth) : stage.clientWidth;
    const height = withoutScrollbars ? rect.height - number(style.borderTopWidth) - number(style.borderBottomWidth) : stage.clientHeight;
    return {
      width: Math.max(0, width - number(style.paddingLeft) - number(style.paddingRight)),
      height: Math.max(0, height - number(style.paddingTop) - number(style.paddingBottom))
    };
  }

  function fitScale() {
    if (!state.imageReady) return 1;
    const available = stageSize(true);
    return Math.min(1, available.width / state.naturalWidth, available.height / state.naturalHeight);
  }

  function sizeCanvas(available, width, height) {
    els.imageCanvas.style.width = Math.max(available.width, width) + "px";
    els.imageCanvas.style.height = Math.max(available.height, height) + "px";
  }

  function hasOverflow() {
    return els.imageScroller.scrollWidth > els.imageScroller.clientWidth + 1 ||
      els.imageScroller.scrollHeight > els.imageScroller.clientHeight + 1;
  }

  function captureAnchor(point) {
    if (!state.imageReady) return null;
    const stageRect = els.imageScroller.getBoundingClientRect();
    const imageRect = els.viewerImage.getBoundingClientRect();
    const clientX = point ? point.clientX : stageRect.left + els.imageScroller.clientWidth / 2;
    const clientY = point ? point.clientY : stageRect.top + els.imageScroller.clientHeight / 2;
    if (!imageRect.width || !imageRect.height) return null;
    return {
      x: Math.max(0, Math.min(1, (clientX - imageRect.left) / imageRect.width)),
      y: Math.max(0, Math.min(1, (clientY - imageRect.top) / imageRect.height)),
      clientX: clientX,
      clientY: clientY
    };
  }

  function renderZoom(anchor) {
    if (!state.currentGuide || !state.imageReady) return;
    const stage = els.imageScroller;
    stage.style.overflow = state.mode === "fit" ? "hidden" : "auto";
    let available = stageSize();
    if (!available.width || !available.height) return;
    if (state.mode === "fit") state.scale = fitScale();

    // Re-measure after overflow changes: classic scrollbars also take up image space.
    for (let pass = 0; pass < 2; pass += 1) {
      if (state.mode === "width") state.scale = Math.min(1, available.width / state.naturalWidth);
      const width = Math.floor(state.naturalWidth * state.scale * 100) / 100;
      const height = Math.floor(state.naturalHeight * state.scale * 100) / 100;
      els.viewerImage.style.width = width + "px";
      els.viewerImage.style.height = height + "px";
      sizeCanvas(available, width, height);
      available = stageSize();
    }
    if (state.mode === "fit") {
      stage.scrollTo({ top: 0, left: 0, behavior: "instant" });
    } else if (anchor) {
      const rect = els.viewerImage.getBoundingClientRect();
      stage.scrollLeft += rect.left + anchor.x * rect.width - anchor.clientX;
      stage.scrollTop += rect.top + anchor.y * rect.height - anchor.clientY;
    }
    const overflowing = hasOverflow();
    stage.classList.toggle("is-zoomed", overflowing);
    stage.style.touchAction = overflowing ? "pan-x pan-y pinch-zoom" : "pinch-zoom";
    stage.dataset.viewMode = state.mode;
    updateZoomLabel();
  }

  function updateZoomLabel() {
    const percent = Math.round(state.scale * 100) + "%";
    els.zoomLabel.textContent = state.mode === "fit" ? "화면 맞춤" : state.mode === "width" ? "너비 맞춤" : percent;
    els.zoomLabel.title = state.imageReady ? "원본 크기의 " + percent : "이미지 불러오는 중";
    els.fitButton.setAttribute("aria-pressed", state.mode === "fit" ? "true" : "false");
    els.widthButton.setAttribute("aria-pressed", state.mode === "width" ? "true" : "false");
    els.zoomOutButton.disabled = !state.imageReady || state.scale <= fitScale() + 0.001;
    els.zoomInButton.disabled = !state.imageReady || state.scale >= 3;
    els.fitButton.disabled = !state.imageReady;
    els.widthButton.disabled = !state.imageReady;
  }

  function setFit(mode) {
    if (!state.imageReady) return;
    state.mode = mode;
    state.touch = null;
    endDrag();
    renderZoom();
    els.imageScroller.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }

  function resetViewer() {
    if (!state.imageReady) return;
    setFit("fit");
    announce("이미지를 화면 맞춤으로 리셋했습니다.");
  }

  function setZoom(nextScale, point) {
    if (!state.imageReady) return;
    const anchor = captureAnchor(point);
    const minimum = fitScale();
    state.scale = Math.max(minimum, Math.min(3, nextScale));
    state.mode = state.scale <= minimum + 0.001 ? "fit" : "custom";
    state.touch = null;
    endDrag();
    renderZoom(anchor);
  }

  function scheduleLayout() {
    if (state.layoutFrame) return;
    state.layoutFrame = requestAnimationFrame(function () {
      state.layoutFrame = 0;
      if (state.currentGuide && state.imageReady) renderZoom(captureAnchor());
    });
  }

  function anyDialogOpen() {
    return els.pageDialog.open || els.detailsDialog.open;
  }

  function closeDialogs() {
    [els.pageDialog, els.detailsDialog].forEach(function (dialog) {
      if (dialog.open) dialog.close();
    });
  }

  function revealSelectedThumbnail() {
    const active = els.thumbnailList.querySelector(".is-selected");
    if (!active || !els.pageDialog.open) return;
    active.focus({ preventScroll: true });
    const item = active.getBoundingClientRect();
    const list = els.thumbnailList.getBoundingClientRect();
    const top = list.top + els.thumbnailList.clientTop;
    const left = list.left + els.thumbnailList.clientLeft;
    const bottom = top + els.thumbnailList.clientHeight;
    const right = left + els.thumbnailList.clientWidth;
    // Scroll only the dialog's list; scrollIntoView can also move the reader/document.
    if (item.top < top) els.thumbnailList.scrollTop -= top - item.top;
    else if (item.bottom > bottom) els.thumbnailList.scrollTop += item.bottom - bottom;
    if (item.left < left) els.thumbnailList.scrollLeft -= left - item.left;
    else if (item.right > right) els.thumbnailList.scrollLeft += item.right - right;
  }

  function connectDialog(dialog, opener, closeButton) {
    opener.addEventListener("click", function () {
      if (dialog.open || !state.currentGuide) return;
      closeDialogs();
      state.touch = null;
      dialog.showModal();
      opener.setAttribute("aria-expanded", "true");
      if (dialog === els.pageDialog) requestAnimationFrame(revealSelectedThumbnail);
    });
    closeButton.addEventListener("click", function () { dialog.close(); });
    dialog.addEventListener("close", function () {
      opener.setAttribute("aria-expanded", "false");
      if (state.currentGuide && !anyDialogOpen()) opener.focus({ preventScroll: true });
    });
    dialog.addEventListener("click", function (event) {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right ||
          event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    });
  }

  function toggleFullscreen() {
    if (!state.currentGuide || els.fullscreenButton.disabled) return;
    const operation = document.fullscreenElement ? document.exitFullscreen() : els.viewerCard.requestFullscreen();
    operation.catch(function (error) {
      console.warn("Fullscreen unavailable", error);
      announce("전체화면을 열지 못했습니다. 현재 창에서 계속 볼 수 있습니다.");
    });
  }

  function endDrag() {
    if (state.drag && els.imageScroller.hasPointerCapture(state.drag.id)) {
      els.imageScroller.releasePointerCapture(state.drag.id);
    }
    if (state.drag && state.drag.moved) state.ignoreDoubleClickUntil = performance.now() + 200;
    state.drag = null;
    els.imageScroller.classList.remove("is-dragging");
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
  els.backButton.addEventListener("click", function () { showLibrary(true); });
  [els.prevButton, els.stagePrevButton].forEach(function (button) {
    button.addEventListener("click", function () {
      setPage(state.pageIndex - 1, true, { direction: -1, axis: "x" });
    });
  });
  [els.nextButton, els.stageNextButton].forEach(function (button) {
    button.addEventListener("click", function () {
      setPage(state.pageIndex + 1, true, { direction: 1, axis: "x" });
    });
  });
  els.zoomOutButton.addEventListener("click", function () { setZoom(state.scale / 1.25); });
  els.zoomInButton.addEventListener("click", function () { setZoom(state.scale * 1.25); });
  els.fitButton.addEventListener("click", resetViewer);
  els.widthButton.addEventListener("click", function () { setFit("width"); });
  els.fullscreenButton.addEventListener("click", toggleFullscreen);
  if (!els.viewerCard.requestFullscreen || document.fullscreenEnabled === false) {
    els.fullscreenButton.disabled = true;
    els.fullscreenButton.classList.add("hidden");
    els.fullscreenButton.title = "이 브라우저는 전체화면을 지원하지 않습니다";
  }
  if (els.retryImageButton) {
    els.retryImageButton.addEventListener("click", function () {
      const asset = currentAsset();
      if (asset) {
        els.viewerImage.removeAttribute("src");
        loadPageImage(asset);
      }
    });
  }
  connectDialog(els.pageDialog, els.pagesButton, els.closePagesButton);
  connectDialog(els.detailsDialog, els.infoButton, els.closeDetailsButton);

  els.imageScroller.addEventListener("dblclick", function (event) {
    if (!state.imageReady || performance.now() < state.ignoreDoubleClickUntil) return;
    event.preventDefault();
    if (state.mode === "fit") setZoom(Math.max(1, state.scale * 2), event);
    else setFit("fit");
  });
  els.viewerImage.addEventListener("dragstart", function (event) { event.preventDefault(); });
  els.imageScroller.addEventListener("pointerdown", function (event) {
    if (event.pointerType === "touch" || event.button !== 0 || !state.imageReady || !hasOverflow()) return;
    state.drag = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      left: els.imageScroller.scrollLeft,
      top: els.imageScroller.scrollTop,
      moved: false
    };
    els.imageScroller.setPointerCapture(event.pointerId);
    els.imageScroller.classList.add("is-dragging");
    els.imageScroller.focus({ preventScroll: true });
    event.preventDefault();
  });
  els.imageScroller.addEventListener("pointermove", function (event) {
    const drag = state.drag;
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
    els.imageScroller.scrollLeft = drag.left - dx;
    els.imageScroller.scrollTop = drag.top - dy;
    event.preventDefault();
  });
  els.imageScroller.addEventListener("pointerup", endDrag);
  els.imageScroller.addEventListener("pointercancel", endDrag);
  els.imageScroller.addEventListener("lostpointercapture", endDrag);

  function wheelDeltaInPixels(event) {
    const multiplier = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 :
      event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? els.imageScroller.clientHeight : 1;
    return {
      x: event.deltaX * multiplier,
      y: event.deltaY * multiplier
    };
  }

  els.viewerCard.addEventListener("wheel", function (event) {
    if (!state.currentGuide) return;

    if (event.ctrlKey) {
      event.preventDefault();
      if (!state.imageReady || anyDialogOpen()) return;
      const delta = wheelDeltaInPixels(event).y;
      if (!delta) return;
      const point = els.imageScroller.contains(event.target) ? event : null;
      const factor = Math.exp(-Math.max(-240, Math.min(240, delta)) * 0.0028);
      setZoom(state.scale * factor, point);
      announce("이미지 확대 " + Math.round(state.scale * 100) + "%.");
      return;
    }

    if (!state.imageReady || anyDialogOpen() || hasOverflow() ||
        (window.visualViewport && window.visualViewport.scale > 1.01)) return;

    const delta = wheelDeltaInPixels(event);
    const primary = Math.abs(delta.y) >= Math.abs(delta.x) ? delta.y : delta.x;
    if (Math.abs(primary) < 1) return;
    event.preventDefault();

    const now = performance.now();
    if (now - state.lastWheelTurnAt < 320) return;
    if (state.wheelDelta && Math.sign(state.wheelDelta) !== Math.sign(primary)) state.wheelDelta = 0;
    state.wheelDelta += primary;
    clearTimeout(state.wheelResetTimer);
    state.wheelResetTimer = setTimeout(function () { state.wheelDelta = 0; }, 160);
    if (Math.abs(state.wheelDelta) < 72) return;

    const direction = state.wheelDelta > 0 ? 1 : -1;
    state.wheelDelta = 0;
    state.lastWheelTurnAt = now;
    setPage(state.pageIndex + direction, true, { direction: direction, axis: "y" });
  }, { passive: false });

  function canSwipePage() {
    return state.imageReady && !hasOverflow() &&
      (!window.visualViewport || window.visualViewport.scale <= 1.01);
  }
  els.imageScroller.addEventListener("touchstart", function (event) {
    state.touch = null;
    if (event.touches.length !== 1 || !canSwipePage()) return;
    const touch = event.touches[0];
    state.touch = { id: touch.identifier, x: touch.clientX, y: touch.clientY, at: performance.now() };
  }, { passive: true });
  els.imageScroller.addEventListener("touchmove", function (event) {
    if (event.touches.length !== 1) {
      state.touch = null;
      return;
    }
    if (!state.touch || !canSwipePage()) return;
    const touch = event.touches[0];
    if (Math.abs(touch.clientX - state.touch.x) + Math.abs(touch.clientY - state.touch.y) > 8) {
      event.preventDefault();
    }
  }, { passive: false });
  els.imageScroller.addEventListener("touchend", function (event) {
    const start = state.touch;
    state.touch = null;
    if (!start || event.touches.length || !canSwipePage() || performance.now() - start.at > 1200) return;
    const touch = Array.from(event.changedTouches).find(function (item) { return item.identifier === start.id; });
    if (!touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    const horizontal = Math.abs(dx) >= 48 && Math.abs(dx) >= Math.abs(dy) * 1.2;
    const vertical = Math.abs(dy) >= 48 && Math.abs(dy) >= Math.abs(dx) * 1.1;
    if (!horizontal && !vertical) return;
    const direction = horizontal ? (dx < 0 ? 1 : -1) : (dy < 0 ? 1 : -1);
    setPage(state.pageIndex + direction, true, {
      direction: direction,
      axis: horizontal ? "x" : "y"
    });
  }, { passive: true });
  els.imageScroller.addEventListener("touchcancel", function () { state.touch = null; }, { passive: true });

  document.addEventListener("keydown", function (event) {
    if (state.currentGuide && event.ctrlKey && !event.metaKey && !event.altKey && event.key === "0" &&
        !isTypingTarget(event.target) && !anyDialogOpen()) {
      event.preventDefault();
      resetViewer();
      return;
    }
    if (event.defaultPrevented || event.isComposing || event.metaKey || event.ctrlKey || event.altKey ||
        isTypingTarget(event.target) || anyDialogOpen()) return;
    if (!state.currentGuide) {
      if (event.key === "/") {
        event.preventDefault();
        els.searchInput.focus();
      }
      return;
    }

    const key = event.key;
    if (key === "ArrowLeft" || key === "ArrowRight") {
      if (!hasOverflow() && (!window.visualViewport || window.visualViewport.scale <= 1.01)) {
        event.preventDefault();
        setPage(state.pageIndex + (key === "ArrowRight" ? 1 : -1), true, {
          direction: key === "ArrowRight" ? 1 : -1,
          axis: "x"
        });
      } else if (hasOverflow()) {
        event.preventDefault();
        els.imageScroller.scrollLeft += (key === "ArrowRight" ? 1 : -1) * Math.max(80, els.imageScroller.clientWidth / 4);
      }
    } else if ((key === "ArrowUp" || key === "ArrowDown") && hasOverflow()) {
      event.preventDefault();
      els.imageScroller.scrollTop += (key === "ArrowDown" ? 1 : -1) * Math.max(80, els.imageScroller.clientHeight / 4);
    } else if (key === "PageUp" || key === "PageDown") {
      event.preventDefault();
      setPage(state.pageIndex + (key === "PageDown" ? 1 : -1), true, {
        direction: key === "PageDown" ? 1 : -1,
        axis: "y"
      });
    } else if (key === "Home" || key === "End") {
      event.preventDefault();
      setPage(key === "Home" ? 0 : state.currentGuide.assets.length - 1, true);
    } else if (key === "+" || key === "=") {
      event.preventDefault();
      setZoom(state.scale * 1.25);
    } else if (key === "-") {
      event.preventDefault();
      setZoom(state.scale / 1.25);
    } else if (key === "0" || key.toLowerCase() === "r") {
      event.preventDefault();
      resetViewer();
    } else if (key.toLowerCase() === "w") {
      event.preventDefault();
      setFit("width");
    } else if (key.toLowerCase() === "f" && !event.repeat) {
      event.preventDefault();
      toggleFullscreen();
    } else if (key === "Escape" && !document.fullscreenElement && performance.now() - state.fullscreenExitAt > 300) {
      event.preventDefault();
      showLibrary(true);
    }
  });

  document.addEventListener("fullscreenchange", function () {
    const fullscreen = document.fullscreenElement === els.viewerCard;
    if (state.fullscreen && !fullscreen) state.fullscreenExitAt = performance.now();
    state.fullscreen = fullscreen;
    els.fullscreenButton.textContent = fullscreen ? "전체화면 종료" : "전체화면";
    els.fullscreenButton.setAttribute("aria-pressed", fullscreen ? "true" : "false");
    scheduleLayout();
  });
  if ("ResizeObserver" in window) new ResizeObserver(scheduleLayout).observe(els.imageScroller);
  window.addEventListener("resize", scheduleLayout);
  window.addEventListener("hashchange", routeFromHash);
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";

  loadCatalog();
})();
