(() => {
  const config = window.FLOK_CONFIG || {};
  const supabaseUrl = String(config.supabaseUrl || "").replace(/\/$/, "");
  const supabaseAnonKey = String(config.supabaseAnonKey || "");
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const forms = Array.from(document.querySelectorAll("[data-waitlist]"));

  const setStatus = (form, message, kind) => {
    const status = form.querySelector("[data-waitlist-status]");
    if (!status) return;
    status.textContent = message;
    status.classList.toggle("is-ok", kind === "ok");
    status.classList.toggle("is-err", kind === "err");
  };

  const shake = (form) => {
    form.classList.remove("is-shaking");
    void form.offsetWidth;
    form.classList.add("is-shaking");
  };

  const renderDone = (form, message) => {
    const row = form.querySelector(".waitlist__row");
    if (!row || form.querySelector(".waitlist__done")) return;
    const done = document.createElement("div");
    done.className = "waitlist__done";
    done.innerHTML =
      '<span class="waitlist__check" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span>';
    done.append(document.createTextNode(message));
    row.replaceWith(done);
    form.querySelector(".waitlist__hint")?.remove();
    setStatus(form, "", null);
  };

  const markAllDone = (message) => forms.forEach((form) => renderDone(form, message));

  const submitEmail = async (email, source) => {
    if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes("YOUR_")) {
      throw new Error("config");
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/landing_waitlist`, {
      method: "POST",
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ email, source }),
    });

    if (response.ok) return { duplicate: false };

    let detail = "";
    try {
      const body = await response.json();
      detail = String(body?.message || body?.code || "");
    } catch {
      detail = "";
    }

    if (response.status === 409 || /duplicate|unique|23505/i.test(detail)) {
      return { duplicate: true };
    }
    throw new Error(detail || `http_${response.status}`);
  };

  const handleSubmit = async (form) => {
    const honeypot = form.querySelector(".waitlist__hp");
    if (honeypot && honeypot.value.trim()) return;

    const input = form.querySelector('input[name="email"]');
    const button = form.querySelector('button[type="submit"]');
    const email = String(input?.value || "").trim().toLowerCase();
    const source = form.dataset.source || "landing";

    if (!emailPattern.test(email)) {
      setStatus(form, "Geçerli bir e-posta adresi yaz.", "err");
      shake(form);
      input?.focus();
      return;
    }

    const originalLabel = button?.textContent || "";
    if (button) {
      button.disabled = true;
      button.textContent = "Kaydediliyor…";
    }
    setStatus(form, "", null);

    try {
      const result = await submitEmail(email, source);
      markAllDone(result.duplicate ? "Zaten listedesin, teşekkürler!" : "Listedesin! Yayına girince ilk sana yazacağız.");
    } catch (error) {
      const reason = error instanceof Error ? error.message : "";
      setStatus(
        form,
        reason === "config"
          ? "Kayıt şu an kapalı. Biraz sonra tekrar dene."
          : "Bir şeyler ters gitti. Bağlantını kontrol edip tekrar dene.",
        "err"
      );
      shake(form);
      if (button) {
        button.disabled = false;
        button.textContent = originalLabel;
      }
    }
  };

  forms.forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      void handleSubmit(form);
    });
  });
})();
