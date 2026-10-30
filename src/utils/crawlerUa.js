/**
 * Link-preview crawlers. vercel.json repeats this list because a rewrite
 * cannot import it.
 * facebookexternalhit and meta-externalagent are Meta's preview fetchers.
 * A shopper in Instagram's in-app browser sends a user agent containing
 * "Instagram". That browser must receive the store, so this list has no
 * Instagram token.
 */
export const CRAWLER_UA_PATTERN = 'facebookexternalhit|WhatsApp|Twitterbot|LinkedInBot|Slackbot|TelegramBot|googlebot|bingbot|Discordbot|meta-externalagent|Facebot|facebookcatalog';

export const CRAWLER_UA = new RegExp(CRAWLER_UA_PATTERN, 'i');
