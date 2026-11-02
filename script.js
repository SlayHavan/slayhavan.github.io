"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasHover = window.matchMedia("(hover: hover)").matches;
  root.classList.add("js");

  /* ---------- 1. Smooth scrolling ---------- */
  const headerH = () => parseInt(getComputedStyle(root).getPropertyValue("--header-h"), 10) || 64;

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      const id = link.getAttribute("href");
      if (!id || id === "#") return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const top = id === "#home" ? 0 : target.getBoundingClientRect().top + window.scrollY - headerH() + 1;
      window.scrollTo({ top, behavior: reduceMotion ? "auto" : "smooth" });
      target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
      history.replaceState(null, "", id);
    });
  });

  /* ---------- 2. Intersection Observer: reveal ---------- */
  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("active");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("active"));
  }

  // Rete di sicurezza: se per qualsiasi motivo l'observer non scatta, mostra comunque le sezioni
  window.addEventListener("scroll", () => {
    reveals.forEach((el) => {
      if (!el.classList.contains("active") && el.getBoundingClientRect().top < window.innerHeight * 0.9) {
        el.classList.add("active");
      }
    });
  }, { passive: true });

  // Indice per l'apparizione riga per riga del codice
  document.querySelectorAll(".code-card .ln").forEach((ln, i) => ln.style.setProperty("--n", i));

  /* ---------- 3. Scramble del titolo ---------- */
  const scrambleEl = document.querySelector("[data-scramble]");
  if (scrambleEl && !reduceMotion) {
    const finalText = scrambleEl.textContent;
    const glyphs = "!<>-_/[]{}=+*^?#01";
    const run = () => {
      let frame = 0;
      const total = 28;
      const timer = setInterval(() => {
        frame++;
        const out = finalText
          .split("")
          .map((ch, i) => (frame > (i + 1) * (total / finalText.length) ? ch : glyphs[Math.floor(Math.random() * glyphs.length)]))
          .join("");
        scrambleEl.textContent = out;
        if (frame >= total + 4) {
          clearInterval(timer);
          scrambleEl.textContent = finalText;
        }
      }, 40);
    };
    run();
    scrambleEl.addEventListener("mouseenter", run);
  }

  /* ---------- 4. Terminale: digitazione + cursore ---------- */
  const typed = document.querySelector(".typed");
  if (typed) {
    const text = typed.dataset.text || "";
    if (reduceMotion) {
      typed.textContent = text;
    } else {
      let i = 0;
      let deleting = false;
      const tick = () => {
        if (!deleting) {
          i++;
          typed.textContent = text.slice(0, i);
          if (i >= text.length) {
            deleting = true;
            return setTimeout(tick, 2200);
          }
          return setTimeout(tick, 70 + Math.random() * 70);
        }
        i -= 2;
        if (i <= 0) {
          i = 0;
          deleting = false;
          typed.textContent = "";
          return setTimeout(tick, 500);
        }
        typed.textContent = text.slice(0, i);
        setTimeout(tick, 25);
      };
      setTimeout(tick, 600);
    }
  }
  // Il lampeggio del cursore <i> è in CSS (@keyframes blink)

  /* ---------- 5. Barra di progresso dello scroll ---------- */
  let ticking = false;
  const updateProgress = () => {
    const max = root.scrollHeight - window.innerHeight;
    root.style.setProperty("--scroll", max > 0 ? (window.scrollY / max).toFixed(4) : 0);
    ticking = false;
  };
  window.addEventListener("scroll", () => {
    if (!ticking) {
      requestAnimationFrame(updateProgress);
      ticking = true;
    }
  }, { passive: true });
  updateProgress();

  /* ---------- 4b. Contatori animati (statistiche) ---------- */
  const counters = document.querySelectorAll("[data-count]");
  const runCount = (el) => {
    const target = Number(el.dataset.count) || 0;
    const suffix = el.dataset.suffix || "";
    if (reduceMotion) { el.textContent = target + suffix; return; }
    const duration = 1400;
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min((now - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  if ("IntersectionObserver" in window) {
    const counterObserver = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { runCount(entry.target); obs.unobserve(entry.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach((c) => counterObserver.observe(c));
  } else {
    counters.forEach(runCount);
  }

  /* ---------- 5a. Schermata d'ingresso + musica ---------- */
  const enterBtn = document.querySelector(".enter-screen");
  const bgm = document.getElementById("bgm");
  const player = document.querySelector(".music-player");
  const slider = document.querySelector(".mp-slider");
  const volOut = document.querySelector(".mp-value");
  const muteBtn = document.querySelector(".mp-btn");

  if (enterBtn && bgm && player && slider && muteBtn) {
    const refreshUI = () => {
      const v = Number(slider.value);
      const off = bgm.muted || v === 0;
      slider.style.setProperty("--val", v + "%");
      if (volOut) volOut.textContent = v;
      player.classList.toggle("is-muted", off);
      muteBtn.setAttribute("aria-pressed", String(off));
      muteBtn.setAttribute("aria-label", off ? "Attiva audio" : "Disattiva audio");
    };

    bgm.volume = Number(slider.value) / 100;
    refreshUI();

    slider.addEventListener("input", () => {
      bgm.volume = Number(slider.value) / 100;
      if (Number(slider.value) > 0) bgm.muted = false;
      refreshUI();
    });

    muteBtn.addEventListener("click", () => {
      if (Number(slider.value) === 0) {
        slider.value = 50;
        bgm.volume = 0.5;
        bgm.muted = false;
      } else {
        bgm.muted = !bgm.muted;
      }
      refreshUI();
    });

    enterBtn.focus({ preventScroll: true });
    enterBtn.addEventListener("click", () => {
      root.classList.add("entered");
      enterBtn.setAttribute("aria-hidden", "true");
      // Il play parte dal click dell'utente, così il browser lo consente
      const p = bgm.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
      // Rilancia l'effetto scramble del titolo ora che la pagina è visibile
      const h1 = document.querySelector("[data-scramble]");
      if (h1) h1.dispatchEvent(new Event("mouseenter"));
    }, { once: true });
  }

  /* ---------- 5b. Donut ASCII 3D (solo quando visibile) ---------- */
  const donut = document.querySelector(".ascii-donut");
  if (donut) {
    const W = 56, H = 26;
    const shades = ".,-~:;=!*#$@";
    let A = 1.2, B = 0.4;
    let rafId = null;
    let last = 0;

    const draw = () => {
      const out = new Array(W * H).fill(" ");
      const zbuf = new Array(W * H).fill(0);
      const cA = Math.cos(A), sA = Math.sin(A), cB = Math.cos(B), sB = Math.sin(B);

      for (let j = 0; j < 6.283; j += 0.08) {
        const ct = Math.cos(j), st = Math.sin(j);
        for (let i = 0; i < 6.283; i += 0.03) {
          const sp = Math.sin(i), cp = Math.cos(i);
          const h = ct + 2;
          const D = 1 / (sp * h * sA + st * cA + 5);
          const t = sp * h * cA - st * sA;
          const x = Math.floor(W / 2 + 40 * D * (cp * h * cB - t * sB));
          const y = Math.floor(H / 2 + 20 * D * (cp * h * sB + t * cB));
          const o = x + W * y;
          const N = Math.floor(8 * ((st * sA - sp * ct * cA) * cB - sp * ct * sA - st * cA - cp * ct * sB));
          if (y >= 0 && y < H && x >= 0 && x < W && D > zbuf[o]) {
            zbuf[o] = D;
            out[o] = shades[N > 0 ? Math.min(N, shades.length - 1) : 0];
          }
        }
      }

      let text = "";
      for (let r = 0; r < H; r++) text += out.slice(r * W, (r + 1) * W).join("") + "\n";
      donut.textContent = text;
    };

    const loop = (now) => {
      rafId = requestAnimationFrame(loop);
      if (now - last < 33) return; // ~30 fps
      last = now;
      A += 0.045;
      B += 0.022;
      draw();
    };

    draw(); // primo frame statico
    if (!reduceMotion && "IntersectionObserver" in window) {
      new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && rafId === null) rafId = requestAnimationFrame(loop);
          else if (!entry.isIntersecting && rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
        });
      }).observe(donut);
    }
  }

  /* ---------- 6. Spotlight, glow sulle card e parallax orbit ---------- */
  if (hasHover && !reduceMotion) {
    const orbit = document.querySelector(".orbit");
    const labelA = document.querySelector(".label-a");

    window.addEventListener("pointermove", (e) => {
      root.style.setProperty("--mx", e.clientX + "px");
      root.style.setProperty("--my", e.clientY + "px");
      if (orbit) {
        const px = (e.clientX / window.innerWidth - 0.5) * 36;
        const py = (e.clientY / window.innerHeight - 0.5) * 36;
        orbit.style.setProperty("--px", px.toFixed(1));
        orbit.style.setProperty("--py", py.toFixed(1));
        if (labelA) labelA.textContent = `x: ${(px / 18).toFixed(2)} / y: ${(py / 18).toFixed(2)}`;
      }
    }, { passive: true });

    document.querySelectorAll(".service-card, .platform, .goal, [data-tilt]").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--x", e.clientX - r.left + "px");
        el.style.setProperty("--y", e.clientY - r.top + "px");
      });
    });
  }
});