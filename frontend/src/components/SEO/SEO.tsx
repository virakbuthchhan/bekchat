import React, { useEffect } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonical?: string;
}

export const SEO: React.FC<SEOProps> = ({
  title,
  description = 'Bek-Chat is a fast, self-hosted, real-time team collaboration platform featuring instant channel messaging, direct messages, webhooks, and Telegram Bot API support.',
  keywords,
  canonical,
}) => {
  useEffect(() => {
    // Update Title
    const defaultTitle = 'Bek-Chat | Real-Time Team Communication & Bot Platform';
    document.title = title ? `${title} | Bek-Chat` : defaultTitle;

    // Update Meta Description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', description);
    } else {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      metaDescription.setAttribute('content', description);
      document.head.appendChild(metaDescription);
    }

    // Update Open Graph Title
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      ogTitle.setAttribute('content', title ? `${title} | Bek-Chat` : defaultTitle);
    }

    // Update Meta Keywords
    if (keywords) {
      let metaKeywords = document.querySelector('meta[name="keywords"]');
      if (metaKeywords) {
        metaKeywords.setAttribute('content', keywords);
      }
    }

    // Update Canonical URL
    if (canonical) {
      let linkCanonical = document.querySelector('link[rel="canonical"]');
      if (linkCanonical) {
        linkCanonical.setAttribute('href', canonical);
      }
    }
  }, [title, description, keywords, canonical]);

  return null;
};
