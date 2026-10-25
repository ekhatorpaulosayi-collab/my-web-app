/**
 * Link-preview clients. Instagram's in-app browser and Meta's newer
 * crawler are included with the older facebookexternalhit token.
 * vercel.json repeats this list because a rewrite cannot import it.
 */
export const CRAWLER_UA_PATTERN = 'facebookexternalhit|WhatsApp|Twitterbot|LinkedInBot|Slackbot|TelegramBot|googlebot|bingbot|Discordbot|Instagram|meta-externalagent|Facebot|facebookcatalog';

export const CRAWLER_UA = new RegExp(CRAWLER_UA_PATTERN, 'i');
