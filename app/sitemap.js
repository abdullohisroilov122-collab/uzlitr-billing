import { SITE_URL } from "@/lib/site";

export default function sitemap() {
  return [
    { url: `${SITE_URL}/login`, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/register`, changeFrequency: "monthly", priority: 0.8 }
  ];
}
