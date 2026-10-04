(() => {
  const year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  const nav = document.getElementById("nav");
  const onScroll = () => {
    if (nav) nav.classList.toggle("is-on", window.scrollY > 8);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  const config = window.FLOK_CONFIG || {};
  const supabaseUrl = String(config.supabaseUrl || "").replace(/\/$/, "");
  const supabaseAnonKey = String(config.supabaseAnonKey || "");
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const setStatus = (form, message, kind) => {
    const status = form.querySelector("[data-waitlist-status]");
    if (!status) return;
    status.textContent = message;
    status.classList.toggle("is-ok", kind === "ok");
    status.classList.toggle("is-err", kind === "err");
  };

  const syncSuccess = (email) => {
    document.querySelectorAll("[data-waitlist]").forEach((form) => {
      const input = form.querySelector('input[name="email"]');
      if (input) input.value = email;
      setStatus(form, "Kaydını aldık. Yayına girince yazacağız.", "ok");
      const btn = form.querySelector('button[type="submit"]');
      if (btn) {
        btn.disabled = true;
        btn.textContent = "Kayda alındı";
      }
    });
  };

  const joinWaitlist = async (email, source) => {
    if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes("YOUR_")) {
      throw new Error("config");
    }

    const res = await fetch(`${supabaseUrl}/rest/v1/landing_waitlist`, {
      method: "POST",
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ email, source }),
    });

    if (res.ok || res.status === 201) return { ok: true };

    let detail = "";
    try {
      const body = await res.json();
      detail = String(body?.message || body?.error_description || body?.code || "");
    } catch {
      detail = "";
    }

    if (res.status === 409 || /duplicate|unique|23505/i.test(detail)) {
      return { ok: true, duplicate: true };
    }

    throw new Error(detail || `http_${res.status}`);
  };

  const handleWaitlist = async (form) => {
    const hp = form.querySelector(".waitlist__hp");
    if (hp && String(hp.value || "").trim()) return;

    const input = form.querySelector('input[name="email"]');
    const btn = form.querySelector('button[type="submit"]');
    const email = String(input?.value || "").trim().toLowerCase();
    const source = form.getAttribute("data-source") || "landing";

    if (!emailRe.test(email)) {
      setStatus(form, "Geçerli bir e-posta gir.", "err");
      input?.focus();
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.textContent = "Kaydediliyor…";
    }
    setStatus(form, "", null);

    try {
      const result = await joinWaitlist(email, source);
      if (result.duplicate) {
        syncSuccess(email);
        setStatus(form, "Zaten listedesin, teşekkürler.", "ok");
      } else {
        syncSuccess(email);
      }
    } catch (err) {
      const reason = err instanceof Error ? err.message : "";
      if (reason === "config") {
        setStatus(form, "Yapılandırma eksik. config.js dosyasını kontrol et.", "err");
      } else {
        setStatus(form, "Bir şeyler ters gitti. Biraz sonra tekrar dene.", "err");
      }
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Listeye katıl";
      }
    }
  };

  document.querySelectorAll("[data-waitlist]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      event.stopPropagation();
      void handleWaitlist(form);
    });

    const btn = form.querySelector('button[type="submit"]');
    if (btn) {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        void handleWaitlist(form);
      });
    }
  });
})();
