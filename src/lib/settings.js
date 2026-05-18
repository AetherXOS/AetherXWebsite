const LEGACY_PLACEHOLDERS = {
  version: "0.8.0-beta",
  version_status: "Soon",
  discord_url: "https://discord.gg/ndxpM4U2gv",
};

function getEnv(name) {
  if (typeof process === "undefined" || !process.env) {
    return "";
  }
  return process.env[name] || "";
}

export const SETTINGS_FIELDS = [
  { key: "version", label: "Exokernel Version", placeholder: "e.g. 0.8.0-beta" },
  { key: "version_status", label: "Version Status Label", placeholder: "e.g. Live" },
  { key: "discord_url", label: "Discord Invitation URL", placeholder: "https://discord.gg/..." },
  { key: "instagram_url", label: "Instagram Profile URL", placeholder: "https://instagram.com/..." },
  { key: "linkedin_url", label: "LinkedIn Profile URL", placeholder: "https://linkedin.com/in/..." },
  { key: "twitter_url", label: "X / Twitter Profile URL", placeholder: "https://x.com/..." },
  { key: "live_chat_enabled", label: "Enable Live Chat on public pages" },
];

export const SYSTEM_SETTINGS_BODY = Object.fromEntries(
  SETTINGS_FIELDS.map(({ key }) => [key, key === "live_chat_enabled" ? { type: "boolean" } : { type: "string" }]),
);

export function createDefaultSettings(overrides = {}) {
  return {
    version: "",
    version_status: "",
    discord_url: getEnv("DISCORD_URL"),
    instagram_url: getEnv("INSTAGRAM_URL"),
    linkedin_url: getEnv("LINKEDIN_URL"),
    twitter_url: getEnv("TWITTER_URL"),
    live_chat_enabled: true,
    ...overrides,
  };
}

function normalizeUrl(value, fallback = "") {
  if (value == null) return fallback;
  const text = String(value).trim();
  if (!text) return fallback;
  return text;
}

export function normalizeSettings(value = {}) {
  const defaults = createDefaultSettings();
  const next = {
    ...defaults,
    ...value,
  };

  for (const field of SETTINGS_FIELDS) {
    const current = next[field.key];
    if (field.key === "live_chat_enabled") {
      // coerce boolean-ish values
      if (typeof current === "string") {
        next[field.key] = !(current === "" || current.toLowerCase() === "false" || current === "0");
      } else {
        next[field.key] = Boolean(current);
      }
      continue;
    }

    if (typeof current !== "string") {
      next[field.key] = current == null ? "" : String(current);
    } else {
      next[field.key] = current.trim();
    }
  }

  if (!getEnv("DISCORD_URL") && next.discord_url === LEGACY_PLACEHOLDERS.discord_url) {
    next.discord_url = defaults.discord_url;
  }

  if (next.version === LEGACY_PLACEHOLDERS.version) {
    next.version = "";
  }

  if (next.version_status === LEGACY_PLACEHOLDERS.version_status) {
    next.version_status = "";
  }

  next.discord_url = normalizeUrl(next.discord_url, defaults.discord_url);
  next.instagram_url = normalizeUrl(next.instagram_url, defaults.instagram_url);
  next.linkedin_url = normalizeUrl(next.linkedin_url, defaults.linkedin_url);
  next.twitter_url = normalizeUrl(next.twitter_url, defaults.twitter_url);

  return next;
}

export function applySettingsPatch(currentSettings = {}, patch = {}) {
  const next = normalizeSettings(currentSettings);

  for (const field of SETTINGS_FIELDS) {
    if (patch[field.key] === undefined) continue;
    next[field.key] = patch[field.key] == null ? "" : String(patch[field.key]).trim();
  }

  return normalizeSettings(next);
}

export function getVisibleSocialLinks(settings = {}) {
  const normalized = normalizeSettings(settings);

  return [
    {
      key: "discord_url",
      label: "Discord",
      href: normalized.discord_url,
      dataTestId: "social-discord",
    },
    {
      key: "instagram_url",
      label: "Instagram",
      href: normalized.instagram_url,
      dataTestId: "social-instagram",
    },
    {
      key: "linkedin_url",
      label: "LinkedIn",
      href: normalized.linkedin_url,
      dataTestId: "social-linkedin",
    },
    {
      key: "twitter_url",
      label: "Twitter",
      href: normalized.twitter_url,
      dataTestId: "social-twitter",
    },
  ].filter((item) => item.href);
}