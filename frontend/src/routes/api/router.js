export class ApiRouter {
  constructor(basePath = "/api") {
    this.basePath = basePath;
    this.routes = [];
    this.middlewares = [];
  }

  use(middleware) {
    this.middlewares.push(middleware);
    return this;
  }

  addRoute(method, path, ...args) {
    const handlers = args.filter((x) => typeof x === "function");
    const meta = args.find((x) => typeof x === "object" && x !== null) || {};

    const paramNames = [];
    const pattern = path.replace(/:([a-zA-Z0-9_]+)/g, (_, name) => {
      paramNames.push(name);
      return "([^/]+)";
    });
    const regex = new RegExp(`^${pattern}$`);

    this.routes.push({
      method: method.toUpperCase(),
      path, 
      regex,
      paramNames,
      handler: handlers[handlers.length - 1],
      handlers,
      meta, 
    });
    return this;
  }

  get(path, ...args) { return this.addRoute("GET", path, ...args); }
  post(path, ...args) { return this.addRoute("POST", path, ...args); }
  put(path, ...args) { return this.addRoute("PUT", path, ...args); }
  delete(path, ...args) { return this.addRoute("DELETE", path, ...args); }

  async handleRequest(request, pathPart, method, db, url) {
    const path = "/" + pathPart.replace(/\/$/, "");

    // Guarantee static routes take absolute precedence over parameterized wildcard routes
    const sortedRoutes = [...this.routes].sort((a, b) => {
      const aParam = a.path.includes(":");
      const bParam = b.path.includes(":");
      if (aParam && !bParam) return 1;
      if (!aParam && bParam) return -1;
      return b.path.length - a.path.length;
    });

    let matchedRoute = null;
    let pathParams = {};

    for (const route of sortedRoutes) {
      if (route.method !== method) continue;
      const match = path.match(route.regex);
      if (match) {
        matchedRoute = route;
        route.paramNames.forEach((name, idx) => {
          pathParams[name] = decodeURIComponent(match[idx + 1]);
        });
        break;
      }
    }

    if (!matchedRoute) {
      return null; 
    }

    const ctx = {
      request,
      method,
      url,
      params: pathParams,
      db,
      body: null,
      query: Object.fromEntries(url.searchParams),
      headers: request.headers,
    };

    if (["POST", "PUT", "PATCH"].includes(method)) {
      try {
        const contentType = request.headers.get("Content-Type") || "";
        if (contentType.includes("application/json")) {
          ctx.body = await request.clone().json();
        } else if (contentType.includes("x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
          const formData = await request.clone().formData();
          ctx.body = Object.fromEntries(formData.entries());
        }
      } catch (err) {
        // Safe body parsing fallback
      }
    }

    const stack = [...this.middlewares, ...(matchedRoute.handlers || [matchedRoute.handler])];
    let index = 0;

    const next = async () => {
      if (index < stack.length) {
        const current = stack[index++];
        return current(ctx, next);
      }
    };

    try {
      const result = await next();
      if (result instanceof Response) {
        return result;
      }
      if (result !== undefined) {
        return Response.json(result);
      }
      return Response.json({ success: true });
    } catch (err) {
      if (err instanceof Response) {
        return err;
      }
      console.error(`Router Error [${method} ${path}]:`, err);
      return Response.json(
        { detail: err.message || "Internal Server Error" },
        { status: err.status || 500 }
      );
    }
  }

  generateOpenApiSpec() {
    const spec = {
      openapi: "3.0.0",
      info: {
        title: "AetherXOS Exokernel API Portal",
        version: "1.2.0-exokernel",
        description: "Enterprise-grade exokernel API gateways with high-performance memory cache layers, GPG release telemetry, and active SSE support channels.",
      },
      servers: [
        { url: "/api", description: "Local Gateway" }
      ],
      paths: {},
      components: {
        securitySchemes: {
          BearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "UUID",
            description: "Default User authorization token.",
          },
          AdminToken: {
            type: "apiKey",
            in: "header",
            name: "X-Admin-Token",
            description: "Administrative programmatic API keys.",
          }
        }
      ,
      schemas: {
        DateTime: { type: "string", format: "date-time", description: "RFC3339 timestamp" },
        JSON: { type: "object", additionalProperties: true, description: "Arbitrary JSON object" },
      }
      }
    };

    for (const route of this.routes) {
      if (route.path.includes("swagger") || route.path.includes("feed")) continue;

      const openApiPath = route.path.replace(/:([a-zA-Z0-9_]+)/g, "{$1}");
      
      if (!spec.paths[openApiPath]) {
        spec.paths[openApiPath] = {};
      }

      const methodLower = route.method.toLowerCase();
      const meta = route.meta || {};

      const parameters = [];
      route.paramNames.forEach((name) => {
        parameters.push({
          name,
          in: "path",
          required: true,
          schema: { type: "string" },
        });
      });

      if (meta.query) {
        Object.entries(meta.query).forEach(([name, desc]) => {
          parameters.push({
            name,
            in: "query",
            description: desc,
            schema: { type: "string" },
          });
        });
      }

      const pathItem = {
        summary: meta.summary || `${route.method} ${route.path}`,
        description: meta.description || "",
        tags: meta.tags || ["General"],
        parameters,
        responses: meta.responses || {
          200: { description: "Successful response" }
        }
      };

      if (meta.body) {
        pathItem.requestBody = {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: meta.body,
              }
            }
          }
        };
      }

      if (meta.secured) {
        pathItem.security = [
          { BearerAuth: [] },
          { AdminToken: [] }
        ];
      }

      spec.paths[openApiPath][methodLower] = pathItem;
    }

    return spec;
  }
}
