// Shared request body schema fragments used by api route metadata
export const POST_BODY = {
  title: { type: "string" },
  excerpt: { type: "string" },
  content: { type: "string" },
  category: { type: "string" },
  tags: { type: "array" },
  published: { type: "boolean" }
};

export const DOC_BODY = {
  slug: { type: "string" },
  title: { type: "string" },
  section: { type: "string" },
  body: { type: "string" },
  published: { type: "boolean" }
};

export const CHANGELOG_BODY = {
  version: { type: "string" },
  title: { type: "string" },
  content: { type: "string" },
  type: { type: "string" }
};

export const DISTRO_BODY = {
  name: { type: "string" },
  status: { type: "string" },
  status_color: { type: "string" },
  description: { type: "string" },
  command: { type: "string" }
};

export const RELEASE_BODY = {
  version: { type: "string" },
  channel: { type: "string" },
  title: { type: "string" },
  notes: { type: "string" },
  file_url: { type: "string" }
};

export default {
  POST_BODY,
  DOC_BODY,
  CHANGELOG_BODY,
  DISTRO_BODY,
  RELEASE_BODY
};
