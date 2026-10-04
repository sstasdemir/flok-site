(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const compactLayout = window.matchMedia("(max-width: 900px)");
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  // MARK: - Static bits

  document.querySelectorAll("[data-year]").forEach((node) => {
    node.textContent = String(new Date().getFullYear());
  });

  // MARK: - Reveal on scroll

  const revealTargets = Array.from(document.querySelectorAll(".reveal"));
  revealTargets.forEach((node) => {
    const siblings = Array.from(node.parentElement?.children || []).filter((child) => child.classList.contains("reveal"));
    const index = siblings.indexOf(node);
    if (index > 0) node.style.setProperty("--delay", `${Math.min(index, 5) * 0.08}s`);
  });

  if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );
    revealTargets.forEach((node) => revealObserver.observe(node));
  } else {
    revealTargets.forEach((node) => node.classList.add("is-visible"));
  }

  // MARK: - Nav

  const nav = document.getElementById("nav");
  const updateNav = () => nav?.classList.toggle("is-scrolled", window.scrollY > 8);

  // MARK: - Hero parallax

  const hero = document.querySelector(".hero");
  const heroLayers = Array.from(document.querySelectorAll("[data-hero-stage] [data-depth]"));
  const pointer = { x: 0, y: 0 };
  const eased = { x: 0, y: 0 };
  let heroFrame = 0;

  const renderHero = () => {
    eased.x += (pointer.x - eased.x) * 0.08;
    eased.y += (pointer.y - eased.y) * 0.08;
    const scroll = Math.min(window.scrollY, 900);
    heroLayers.forEach((layer) => {
      const depth = Number(layer.dataset.depth || 1);
      layer.style.setProperty("--px", `${(eased.x * 16 * depth).toFixed(2)}px`);
      layer.style.setProperty("--py", `${(eased.y * 12 * depth - scroll * 0.06 * depth).toFixed(2)}px`);
    });
    const settled = Math.abs(pointer.x - eased.x) < 0.001 && Math.abs(pointer.y - eased.y) < 0.001;
    heroFrame = settled ? 0 : requestAnimationFrame(renderHero);
  };

  const requestHero = () => {
    if (reduceMotion.matches || heroFrame) return;
    heroFrame = requestAnimationFrame(renderHero);
  };

  hero?.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "mouse") return;
    const rect = hero.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    pointer.y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    requestHero();
  });
  hero?.addEventListener("pointerleave", () => {
    pointer.x = 0;
    pointer.y = 0;
    requestHero();
  });

  // MARK: - Scroll story

  const story = document.querySelector("[data-story]");
  const steps = Array.from(story?.querySelectorAll("[data-step]") || []);
  const screens = Array.from(story?.querySelectorAll("[data-screen]") || []);
  const dots = Array.from(story?.querySelectorAll(".story__dots li") || []);
  const storyVisual = story?.querySelector(".story__visual");
  const storyPhone = story?.querySelector(".phone--story");
  const storyRail = story?.querySelector(".story__rail");
  const tilts = [-2.5, 2, -1.5, 2.5, 0];
  let activeStep = 0;

  const setActiveStep = (index) => {
    if (index === activeStep) return;
    activeStep = index;
    steps.forEach((step, i) => step.classList.toggle("is-active", i === index));
    screens.forEach((screen, i) => screen.classList.toggle("is-active", i === index));
    dots.forEach((dot, i) => dot.classList.toggle("is-active", i === index));
    storyPhone?.style.setProperty("--tilt", reduceMotion.matches ? "0deg" : `${tilts[index] ?? 0}deg`);
  };

  const updateStory = () => {
    if (!steps.length) return;
    const viewport = window.innerHeight;
    let focusLine = viewport * 0.5;
    if (compactLayout.matches && storyVisual) {
      const visualBottom = storyVisual.getBoundingClientRect().bottom;
      focusLine = visualBottom + (viewport - visualBottom) * 0.3;
    }

    let index = 0;
    steps.forEach((step, i) => {
      if (step.getBoundingClientRect().top <= focusLine) index = i;
    });
    setActiveStep(index);

    const first = steps[0].getBoundingClientRect();
    const last = steps[steps.length - 1].getBoundingClientRect();
    const progress = clamp((focusLine - first.top) / (last.bottom - first.top), 0, 1);
    storyRail?.style.setProperty("--progress", progress.toFixed(3));
  };

  // MARK: - Memories strip

  const strip = document.querySelector("[data-strip]");
  const stripRow = strip?.querySelector("[data-strip-row]");

  const updateStrip = () => {
    if (!strip || !stripRow || reduceMotion.matches) return;
    const rect = strip.getBoundingClientRect();
    const viewport = window.innerHeight;
    if (rect.bottom < 0 || rect.top > viewport) return;
    const progress = clamp((viewport - rect.top) / (viewport + rect.height), 0, 1);
    const travel = Math.max(stripRow.scrollWidth - window.innerWidth, 0);
    stripRow.style.setProperty("--sx", `${(-travel * progress + travel * 0.1).toFixed(1)}px`);
  };

  // MARK: - Scroll loop

  let scrollFrame = 0;
  const onScroll = () => {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = 0;
      updateNav();
      updateStory();
      updateStrip();
      if (window.scrollY < window.innerHeight * 1.2) requestHero();
    });
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  onScroll();
})();
