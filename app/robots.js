import { SITE_URL } from "@/lib/site";

// Only the public pages are for search engines; cabinets, the admin panel and the API are not.
export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: ["/login", "/register", "/brand/"],
      disallow: ["/api/", "/portal", "/applications", "/customers", "/meters", "/models", "/users", "/tokens",
        "/audit", "/security", "/settings", "/login?staff"]
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL
  };
}
