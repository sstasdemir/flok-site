const SUPABASE_URL = "https://tjjvwredykszmvtayvbg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_NsuxM_8f5b2oHIG3TXOmTg_xAU7DAzR";
const APP_STORE_URL = "";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isTurkish = (navigator.language || "en").toLowerCase().startsWith("tr");

const STRINGS = isTurkish
  ? {
      eventEyebrow: "Flok etkinliği",
      profileEyebrow: "Flok profili",
      eventFallbackTitle: "Bu etkinlik Flok'ta",
      eventFallbackBody: "Ayrıntıları görmek ve katılmak için Flok'ta aç.",
      profileFallbackTitle: "Bu profil Flok'ta",
      profileFallbackBody: "Profili görmek ve takip etmek için Flok'ta aç.",
      invalidTitle: "Bağlantı eksik görünüyor",
      invalidBody: "Paylaşan kişiden bağlantıyı yeniden göndermesini isteyebilirsin.",
      openInApp: "Flok'ta aç",
      getApp: "App Store'dan indir",
      comingSoon: "Yakında App Store'da",
      hint: "Flok yüklüyse bağlantı doğrudan uygulamada açılır.",
      hostedBy: (name) => `${name} düzenliyor`,
    }
  : {
      eventEyebrow: "Flok event",
      profileEyebrow: "Flok profile",
      eventFallbackTitle: "This event is on Flok",
      eventFallbackBody: "Open it in Flok to see the details and join.",
      profileFallbackTitle: "This profile is on Flok",
      profileFallbackBody: "Open it in Flok to see the profile and follow.",
      invalidTitle: "This link looks incomplete",
      invalidBody: "Ask the person who shared it to send it again.",
      openInApp: "Open in Flok",
      getApp: "Download on the App Store",
      comingSoon: "Coming soon to the App Store",
      hint: "If Flok is installed, the link opens straight in the app.",
      hostedBy: (name) => `Hosted by ${name}`,
    };

const kind = document.body.dataset.kind;
const id = new URLSearchParams(location.search).get("id")?.trim() ?? "";
const hasValidID = UUID_PATTERN.test(id);

document.documentElement.lang = isTurkish ? "tr" : "en";

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function httpsURL(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

async function fetchRow(table, rowID, select) {
  if (!UUID_PATTERN.test(rowID)) return null;
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?id=eq.${rowID}&select=${select}&limit=1`,
    { headers: { apikey: SUPABASE_PUBLISHABLE_KEY } },
  );
  if (!response.ok) return null;
  const rows = await response.json();
  return rows[0] ?? null;
}

function showBackdrop(imageURL) {
  if (!imageURL) return;
  const backdrop = document.querySelector(".backdrop");
  backdrop.style.backgroundImage = `url("${imageURL}")`;
  backdrop.classList.add("is-visible");
}

function renderCard({ title, body, eyebrow, coverURL, avatarURL, meta = [] }) {
  const card = element("article", kind === "profile" ? "card profile" : "card");
  if (coverURL) {
    const cover = element("img", "cover");
    cover.src = coverURL;
    cover.alt = "";
    card.append(cover);
  }
  if (avatarURL) {
    const avatar = element("img", "avatar");
    avatar.src = avatarURL;
    avatar.alt = "";
    card.append(avatar);
  }
  const content = element("div", "card-body");
  content.append(element("p", "eyebrow", eyebrow), element("h1", null, title));
  if (body) content.append(element("p", "meta", body));
  if (meta.length) {
    const list = element("div", "meta");
    meta.filter((item) => item.text).forEach((item) => list.append(element("span", item.className, item.text)));
    content.append(list);
  }
  card.append(content);
  document.querySelector(".card-slot").replaceChildren(card);
  document.title = `${title} · Flok`;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(isTurkish ? "tr-TR" : "en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

async function renderEvent() {
  const event = await fetchRow(
    "events",
    id,
    "title,title_en,starts_at,location,location_en,cover_image_url,host_id",
  ).catch(() => null);
  if (!event) {
    renderCard({ eyebrow: STRINGS.eventEyebrow, title: STRINGS.eventFallbackTitle, body: STRINGS.eventFallbackBody });
    return;
  }
  const host = await fetchRow("profiles", event.host_id ?? "", "display_name").catch(() => null);
  const coverURL = httpsURL(event.cover_image_url);
  showBackdrop(coverURL);
  renderCard({
    eyebrow: STRINGS.eventEyebrow,
    title: (!isTurkish && event.title_en) || event.title,
    coverURL,
    meta: [
      { className: "date", text: formatDate(event.starts_at) },
      { className: "place", text: (!isTurkish && event.location_en) || event.location },
      { className: "host", text: host?.display_name ? STRINGS.hostedBy(host.display_name) : "" },
    ],
  });
}

async function renderProfile() {
  const profile = await fetchRow("profiles", id, "display_name,avatar_url,user_title").catch(() => null);
  if (!profile) {
    renderCard({ eyebrow: STRINGS.profileEyebrow, title: STRINGS.profileFallbackTitle, body: STRINGS.profileFallbackBody });
    return;
  }
  const avatarURL = httpsURL(profile.avatar_url);
  showBackdrop(avatarURL);
  renderCard({
    eyebrow: STRINGS.profileEyebrow,
    title: profile.display_name,
    body: profile.user_title ?? "",
    avatarURL,
  });
}

function setUpActions() {
  const openButton = document.querySelector("[data-action=open]");
  const storeButton = document.querySelector("[data-action=store]");
  openButton.textContent = STRINGS.openInApp;
  openButton.href = `flok://${kind}/${id}`;
  if (APP_STORE_URL) {
    storeButton.textContent = STRINGS.getApp;
    storeButton.href = APP_STORE_URL;
  } else {
    storeButton.textContent = STRINGS.comingSoon;
    storeButton.setAttribute("aria-disabled", "true");
  }
  document.querySelector(".hint").textContent = STRINGS.hint;
}

if (!hasValidID) {
  renderCard({ eyebrow: "Flok", title: STRINGS.invalidTitle, body: STRINGS.invalidBody });
  document.querySelector(".actions").remove();
  document.querySelector(".hint").remove();
} else {
  setUpActions();
  (kind === "profile" ? renderProfile : renderEvent)();
}
