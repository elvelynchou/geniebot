import Hero from '@ulixee/hero';

/**
 * Browser instance in the pool
 */
interface BrowserInstance {
    /** Hero instance */
    hero: Hero;
    /** Unique identifier */
    id: string;
    /** When the instance was created */
    createdAt: number;
    /** When the instance was last used */
    lastUsed: number;
    /** Number of requests handled */
    requestCount: number;
    /** Current status */
    status: "idle" | "busy" | "recycling" | "unhealthy";
}
/**
 * Pool configuration
 */
interface PoolConfig {
    /** Pool size (number of browser instances) */
    size: number;
    /** Retire browser after this many page loads */
    retireAfterPageCount: number;
    /** Retire browser after this age in milliseconds */
    retireAfterAgeMs: number;
    /** How often to check for recycling (ms) */
    recycleCheckInterval: number;
    /** How often to run health checks (ms) */
    healthCheckInterval: number;
    /** Max consecutive failures before marking unhealthy */
    maxConsecutiveFailures: number;
    /** Maximum queue size */
    maxQueueSize: number;
    /** Queue timeout in milliseconds */
    queueTimeout: number;
}
/**
 * Pool statistics
 */
interface PoolStats {
    /** Total instances */
    total: number;
    /** Available instances */
    available: number;
    /** Busy instances */
    busy: number;
    /** Recycling instances */
    recycling: number;
    /** Unhealthy instances */
    unhealthy: number;
    /** Queue length */
    queueLength: number;
    /** Total requests handled */
    totalRequests: number;
    /** Average request duration */
    avgRequestDuration: number;
}
/**
 * Health status
 */
interface HealthStatus {
    /** Overall health */
    healthy: boolean;
    /** Issues found */
    issues: string[];
    /** Stats snapshot */
    stats: PoolStats;
}
/**
 * Browser pool interface
 */
interface IBrowserPool {
    /** Initialize the pool */
    initialize(): Promise<void>;
    /** Shutdown the pool */
    shutdown(): Promise<void>;
    /** Acquire a browser instance */
    acquire(): Promise<Hero>;
    /** Release a browser instance back to the pool */
    release(hero: Hero): void;
    /** Execute callback with auto-managed browser */
    withBrowser<T>(callback: (hero: Hero) => Promise<T>): Promise<T>;
    /** Get pool statistics */
    getStats(): PoolStats;
    /** Run health check */
    healthCheck?(): Promise<HealthStatus>;
}

/**
 * Engine types for multi-engine scraping architecture
 *
 * Engine stack (in order of preference):
 * 1. http - Native fetch, fastest, no browser
 * 2. tlsclient - TLS fingerprinting via got-scraping
 * 3. hero - Full browser with JavaScript execution
 */

/**
 * Available engine names
 */
type EngineName = "http" | "tlsclient" | "hero";

/**
 * Proxy configuration for Hero
 */
interface ProxyConfig {
    /** Full proxy URL (takes precedence over other fields) */
    url?: string;
    /** Proxy type */
    type?: "datacenter" | "residential";
    /** Proxy username */
    username?: string;
    /** Proxy password */
    password?: string;
    /** Proxy host */
    host?: string;
    /** Proxy port */
    port?: number;
    /** Country code for residential proxies (e.g., 'us', 'uk') */
    country?: string;
}
/**
 * Proxy metadata in scrape results
 */
interface ProxyMetadata {
    /** Proxy host that was used */
    host: string;
    /** Proxy port that was used */
    port: number;
    /** Country code if geo-targeting was used */
    country?: string;
}
/**
 * Browser pool configuration for ReaderClient
 */
interface BrowserPoolConfig {
    /** Number of browser instances (default: 2) */
    size?: number;
    /** Retire browser after this many page loads (default: 100) */
    retireAfterPages?: number;
    /** Retire browser after this many minutes (default: 30) */
    retireAfterMinutes?: number;
    /** Maximum pending requests in queue (default: 100) */
    maxQueueSize?: number;
}
/**
 * Main scraping options interface
 */
interface ScrapeOptions {
    /** Array of URLs to scrape */
    urls: string[];
    /** Output formats - which content fields to include (default: ['markdown']) */
    formats?: Array<"markdown" | "html">;
    /** Custom user agent string */
    userAgent?: string;
    /** Custom headers for requests */
    headers?: Record<string, string>;
    /** Request timeout in milliseconds (default: 30000) */
    timeoutMs?: number;
    /** URL patterns to include (regex strings) */
    includePatterns?: string[];
    /** URL patterns to exclude (regex strings) */
    excludePatterns?: string[];
    /** Remove ads and tracking elements (default: true) */
    removeAds?: boolean;
    /** Remove base64-encoded images to reduce output size (default: true) */
    removeBase64Images?: boolean;
    /** Extract only main content, removing nav/header/footer/sidebar (default: true) */
    onlyMainContent?: boolean;
    /** CSS selectors for elements to include (if set, only these elements are kept) */
    includeTags?: string[];
    /** CSS selectors for elements to exclude (removed from output) */
    excludeTags?: string[];
    /** Skip TLS/SSL certificate verification (default: true) */
    skipTLSVerification?: boolean;
    /** Number of URLs to process in parallel (default: 1 - sequential) */
    batchConcurrency?: number;
    /** Total timeout for the entire batch operation in milliseconds (default: 300000) */
    batchTimeoutMs?: number;
    /** Maximum retry attempts for failed URLs (default: 2) */
    maxRetries?: number;
    /** Progress callback for batch operations */
    onProgress?: (progress: {
        completed: number;
        total: number;
        currentUrl: string;
    }) => void;
    /** Proxy configuration for Hero */
    proxy?: ProxyConfig;
    /** CSS selector to wait for before considering page loaded */
    waitForSelector?: string;
    /** Enable verbose logging (default: false) */
    verbose?: boolean;
    /** Show Chrome window (default: false) */
    showChrome?: boolean;
    /** Connection to Hero Core (for shared Core usage) */
    connectionToCore?: any;
    /** Browser pool configuration (passed from ReaderClient) */
    browserPool?: BrowserPoolConfig;
    /** Browser pool instance (internal, provided by ReaderClient) */
    pool?: IBrowserPool;
    /** Engines to use in order (default: ['http', 'tlsclient', 'hero']) */
    engines?: EngineName[];
    /** Skip specific engines (e.g., ['http'] to skip native fetch) */
    skipEngines?: EngineName[];
    /** Force a specific engine, skipping the cascade */
    forceEngine?: EngineName;
}
/**
 * Website metadata extracted from the base page
 */
interface WebsiteMetadata {
    /** Basic meta tags */
    title: string | null /** <title> or <meta property="og:title"> */;
    description: string | null /** <meta name="description"> */;
    author: string | null /** <meta name="author"> */;
    language: string | null /** <html lang="..."> */;
    charset: string | null /** <meta charset="..."> */;
    /** Links */
    favicon: string | null /** <link rel="icon"> */;
    image: string | null /** <meta property="og:image"> */;
    canonical: string | null /** <link rel="canonical"> */;
    /** SEO */
    keywords: string[] | null /** <meta name="keywords"> */;
    robots: string | null /** <meta name="robots"> */;
    /** Branding */
    themeColor: string | null /** <meta name="theme-color"> */;
    /** Open Graph */
    openGraph: {
        title: string | null /** <meta property="og:title"> */;
        description: string | null /** <meta property="og:description"> */;
        type: string | null /** <meta property="og:type"> */;
        url: string | null /** <meta property="og:url"> */;
        image: string | null /** <meta property="og:image"> */;
        siteName: string | null /** <meta property="og:site_name"> */;
        locale: string | null /** <meta property="og:locale"> */;
    } | null;
    /** Twitter Card */
    twitter: {
        card: string | null /** <meta name="twitter:card"> */;
        site: string | null /** <meta name="twitter:site"> */;
        creator: string | null /** <meta name="twitter:creator"> */;
        title: string | null /** <meta name="twitter:title"> */;
        description: string | null /** <meta name="twitter:description"> */;
        image: string | null /** <meta name="twitter:image"> */;
    } | null;
}
/**
 * Individual page data
 */
interface Page {
    /** Full URL of the page */
    url: string;
    /** Page title */
    title: string;
    /** Markdown content */
    markdown: string;
    /** HTML content */
    html: string;
    /** When the page was fetched */
    fetchedAt: string;
    /** Crawl depth from base URL */
    depth: number;
    /** Whether a Cloudflare challenge was detected */
    hadChallenge?: boolean;
    /** Type of challenge encountered */
    challengeType?: string;
    /** Time spent waiting for challenge resolution (ms) */
    waitTimeMs?: number;
}
/**
 * Individual website scrape result
 */
interface WebsiteScrapeResult {
    /** Markdown content (present if 'markdown' in formats) */
    markdown?: string;
    /** HTML content (present if 'html' in formats) */
    html?: string;
    /** Metadata about the scraping operation */
    metadata: {
        /** Base URL that was scraped */
        baseUrl: string;
        /** Total number of pages scraped */
        totalPages: number;
        /** ISO timestamp when scraping started */
        scrapedAt: string;
        /** Duration in milliseconds */
        duration: number;
        /** Website metadata extracted from base page */
        website: WebsiteMetadata;
        /** Proxy used for this request (if proxy pooling was enabled) */
        proxy?: ProxyMetadata;
    };
}
/**
 * Batch metadata for multi-URL operations
 */
interface BatchMetadata {
    /** Total number of URLs provided */
    totalUrls: number;
    /** Number of URLs successfully scraped */
    successfulUrls: number;
    /** Number of URLs that failed */
    failedUrls: number;
    /** ISO timestamp when the batch operation started */
    scrapedAt: string;
    /** Total duration for the entire batch in milliseconds */
    totalDuration: number;
    /** Array of errors for failed URLs */
    errors?: Array<{
        url: string;
        error: string;
    }>;
}
/**
 * Main scrape result interface
 */
interface ScrapeResult {
    /** Array of individual website results */
    data: WebsiteScrapeResult[];
    /** Metadata about the batch operation */
    batchMetadata: BatchMetadata;
}
/**
 * Default scrape options
 */
declare const DEFAULT_OPTIONS: Omit<Required<ScrapeOptions>, "proxy" | "waitForSelector" | "connectionToCore" | "userAgent" | "headers" | "browserPool" | "pool" | "engines" | "skipEngines" | "forceEngine"> & {
    proxy?: ProxyConfig;
    waitForSelector?: string;
    connectionToCore?: any;
    userAgent?: string;
    headers?: Record<string, string>;
    browserPool?: BrowserPoolConfig;
    pool?: IBrowserPool;
    engines?: EngineName[];
    skipEngines?: EngineName[];
    forceEngine?: EngineName;
};
/**
 * Format type guard
 */
declare function isValidFormat(format: string): format is "markdown" | "html";
/**
 * Check if a URL should be crawled based on base domain
 */
declare function shouldCrawlUrl$1(url: URL, baseDomain: string): boolean;

/**
 * Crawl options interface
 */
interface CrawlOptions {
    /** Single seed URL to start crawling from */
    url: string;
    /** Maximum depth to crawl (default: 1) */
    depth?: number;
    /** Maximum pages to discover (default: 20) */
    maxPages?: number;
    /** Also scrape full content (default: false) */
    scrape?: boolean;
    /** Delay between requests in milliseconds (default: 1000) */
    delayMs?: number;
    /** Total timeout for the entire crawl operation in milliseconds */
    timeoutMs?: number;
    /** URL patterns to include (regex strings) - if set, only matching URLs are crawled */
    includePatterns?: string[];
    /** URL patterns to exclude (regex strings) - matching URLs are skipped */
    excludePatterns?: string[];
    /** Output formats for scraped content (default: ['markdown']) */
    formats?: Array<"markdown" | "html">;
    /** Number of URLs to scrape in parallel (default: 2) */
    scrapeConcurrency?: number;
    /** Remove ads and tracking elements (default: true) */
    removeAds?: boolean;
    /** Remove base64-encoded images to reduce output size (default: true) */
    removeBase64Images?: boolean;
    /** Proxy configuration for Hero */
    proxy?: ProxyConfig;
    /** Custom user agent string */
    userAgent?: string;
    /** Enable verbose logging (default: false) */
    verbose?: boolean;
    /** Show Chrome window (default: false) */
    showChrome?: boolean;
    /** Connection to Hero Core (for shared Core usage) */
    connectionToCore?: any;
    /** Browser pool instance (internal, provided by ReaderClient) */
    pool?: IBrowserPool;
}
/**
 * Crawl URL result interface
 */
interface CrawlUrl {
    /** URL of the page */
    url: string;
    /** Page title */
    title: string;
    /** Page description or null if not found */
    description: string | null;
}
/**
 * Crawl result interface
 */
interface CrawlResult {
    /** Array of discovered URLs with basic info */
    urls: CrawlUrl[];
    /** Full scrape results (only when scrape: true) */
    scraped?: ScrapeResult;
    /** Crawl operation metadata */
    metadata: CrawlMetadata;
}
/**
 * Crawl metadata interface
 */
interface CrawlMetadata {
    /** Total URLs discovered */
    totalUrls: number;
    /** Maximum depth reached */
    maxDepth: number;
    /** Total crawl duration in milliseconds */
    totalDuration: number;
    /** Seed URL that started the crawl */
    seedUrl: string;
}

/**
 * ReaderClient
 *
 * A client wrapper that manages HeroCore lifecycle and provides
 * a simple interface for scraping and crawling.
 *
 * @example
 * const reader = new ReaderClient();
 *
 * const result = await reader.scrape({
 *   urls: ['https://example.com'],
 *   formats: ['markdown'],
 * });
 *
 * console.log(result.data[0].markdown);
 *
 * // When done (optional - auto-closes on process exit)
 * await reader.close();
 */

/**
 * Proxy rotation strategy
 */
type ProxyRotation = "round-robin" | "random";
/**
 * Configuration options for ReaderClient
 */
interface ReaderClientOptions {
    /** Enable verbose logging (default: false) */
    verbose?: boolean;
    /** Show Chrome browser window (default: false) */
    showChrome?: boolean;
    /** Browser pool configuration */
    browserPool?: BrowserPoolConfig;
    /** List of proxies to rotate through */
    proxies?: ProxyConfig[];
    /** Proxy rotation strategy (default: "round-robin") */
    proxyRotation?: ProxyRotation;
    /** Skip TLS/SSL certificate verification (default: true) */
    skipTLSVerification?: boolean;
}
/**
 * ReaderClient manages the HeroCore lifecycle and provides
 * scrape/crawl methods with automatic initialization.
 */
declare class ReaderClient {
    private heroCore;
    private pool;
    private initialized;
    private initializing;
    private closed;
    private options;
    private proxyIndex;
    private cleanupHandler;
    constructor(options?: ReaderClientOptions);
    /**
     * Get the next proxy from the rotation pool
     */
    private getNextProxy;
    /**
     * Initialize HeroCore. Called automatically on first scrape/crawl.
     * Can be called explicitly if you want to pre-warm the client.
     */
    start(): Promise<void>;
    /**
     * Internal initialization logic
     */
    private initializeCore;
    /**
     * Create a connection to the HeroCore instance
     */
    private createConnection;
    /**
     * Ensure client is initialized before operation
     */
    private ensureInitialized;
    /**
     * Scrape one or more URLs
     *
     * @param options - Scrape options (urls, formats, etc.)
     * @returns Scrape result with data and metadata
     *
     * @example
     * const result = await reader.scrape({
     *   urls: ['https://example.com'],
     *   formats: ['markdown', 'html'],
     * });
     */
    scrape(options: Omit<ScrapeOptions, "connectionToCore" | "pool">): Promise<ScrapeResult>;
    /**
     * Crawl a website to discover URLs
     *
     * @param options - Crawl options (url, depth, maxPages, etc.)
     * @returns Crawl result with discovered URLs and optional scraped content
     *
     * @example
     * const result = await reader.crawl({
     *   url: 'https://example.com',
     *   depth: 2,
     *   maxPages: 50,
     *   scrape: true,
     * });
     */
    crawl(options: Omit<CrawlOptions, "connectionToCore" | "pool">): Promise<CrawlResult>;
    /**
     * Check if the client is initialized and ready
     */
    isReady(): boolean;
    /**
     * Close the client and release resources
     *
     * Note: This is optional - the client will auto-close on process exit.
     */
    close(): Promise<void>;
    /**
     * Register cleanup handlers for process exit
     */
    private registerCleanup;
    /**
     * Remove process cleanup handlers
     */
    private removeCleanupHandlers;
}

/**
 * Scraper class with built-in concurrency support
 *
 * Features:
 * - Hero-based browser automation
 * - Automatic Cloudflare challenge detection and bypass
 * - Built-in concurrency via browser pool
 * - Progress tracking
 * - Error handling per URL
 *
 * @example
 * const scraper = new Scraper({
 *   urls: ['https://example.com', 'https://example.org'],
 *   formats: ['markdown', 'html'],
 *   batchConcurrency: 2,
 *   proxy: { type: 'residential', ... }
 * });
 *
 * const result = await scraper.scrape();
 * console.log(`Scraped ${result.batchMetadata.successfulUrls} URLs`);
 */
declare class Scraper {
    private options;
    private logger;
    private robotsCache;
    constructor(options: ScrapeOptions);
    /**
     * Get robots.txt rules for a URL, cached per domain
     */
    private getRobotsRules;
    /**
     * Scrape all URLs
     *
     * @returns Scrape result with pages and metadata
     */
    scrape(): Promise<ScrapeResult>;
    /**
     * Scrape URLs with concurrency control
     */
    private scrapeWithConcurrency;
    /**
     * Scrape a single URL with retry logic
     */
    private scrapeSingleUrlWithRetry;
    /**
     * Scrape a single URL using the engine orchestrator
     */
    private scrapeSingleUrl;
    /**
     * Build final scrape result
     */
    private buildScrapeResult;
}
/**
 * Convenience function to scrape URLs
 *
 * @param options - Scrape options
 * @returns Scrape result
 *
 * @example
 * const result = await scrape({
 *   urls: ['https://example.com'],
 *   formats: ['markdown']
 * });
 */
declare function scrape(options: ScrapeOptions): Promise<ScrapeResult>;

/**
 * Crawler class for discovering and optionally scraping pages
 *
 * Features:
 * - BFS/DFS crawling with depth control
 * - Automatic Cloudflare challenge handling
 * - Link extraction and filtering
 * - Optional full content scraping
 * - URL deduplication
 *
 * @example
 * const crawler = new Crawler({
 *   url: 'https://example.com',
 *   depth: 2,
 *   maxPages: 20,
 *   scrape: true
 * });
 *
 * const result = await crawler.crawl();
 * console.log(`Discovered ${result.urls.length} URLs`);
 */
declare class Crawler {
    private options;
    private visited;
    private queue;
    private urls;
    private pool;
    private logger;
    private robotsRules;
    constructor(options: CrawlOptions);
    /**
     * Start crawling
     */
    crawl(): Promise<CrawlResult>;
    /**
     * Fetch a single page and extract basic info
     */
    private fetchPage;
    /**
     * Extract links from HTML content using DOM parsing
     * Handles all href formats (single quotes, double quotes, unquoted)
     */
    private extractLinks;
    /**
     * Scrape all discovered URLs
     */
    private scrapeDiscoveredUrls;
}
/**
 * Convenience function to crawl a website
 *
 * @param options - Crawl options
 * @returns Crawl result
 *
 * @example
 * const result = await crawl({
 *   url: 'https://example.com',
 *   depth: 2,
 *   maxPages: 20,
 *   scrape: true
 * });
 */
declare function crawl(options: CrawlOptions): Promise<CrawlResult>;

/**
 * Daemon Server
 *
 * An HTTP server that wraps ReaderClient, allowing multiple CLI
 * commands to share a single browser pool for efficient scraping.
 *
 * @example
 * // Start daemon
 * const daemon = new DaemonServer({ port: 3847, poolSize: 5 });
 * await daemon.start();
 *
 * // Stop daemon
 * await daemon.stop();
 */
declare const DEFAULT_DAEMON_PORT = 3847;
/**
 * Daemon server configuration
 */
interface DaemonServerOptions {
    /** Port to listen on (default: 3847) */
    port?: number;
    /** Browser pool size (default: 5) */
    poolSize?: number;
    /** Enable verbose logging (default: false) */
    verbose?: boolean;
    /** Show Chrome browser windows (default: false) */
    showChrome?: boolean;
}
/**
 * Status response data
 */
interface DaemonStatus {
    running: true;
    port: number;
    poolSize: number;
    uptime: number;
    pid: number;
}
/**
 * Daemon Server
 */
declare class DaemonServer {
    private server;
    private client;
    private options;
    private startTime;
    constructor(options?: DaemonServerOptions);
    /**
     * Start the daemon server
     */
    start(): Promise<void>;
    /**
     * Stop the daemon server
     */
    stop(): Promise<void>;
    /**
     * Get the port the daemon is running on
     */
    getPort(): number;
    /**
     * Handle incoming HTTP requests
     */
    private handleRequest;
    /**
     * Handle scrape request
     */
    private handleScrape;
    /**
     * Handle crawl request
     */
    private handleCrawl;
    /**
     * Handle status request
     */
    private handleStatus;
    /**
     * Handle shutdown request
     */
    private handleShutdown;
    /**
     * Send JSON response
     */
    private sendResponse;
    /**
     * Write PID file
     */
    private writePidFile;
    /**
     * Remove PID file
     */
    private removePidFile;
}
/**
 * Get path to PID file
 */
declare function getPidFilePath(): Promise<string>;
/**
 * Check if daemon is running by reading PID file
 */
declare function getDaemonInfo(): Promise<{
    pid: number;
    port: number;
    startedAt: string;
} | null>;

/**
 * Daemon Client
 *
 * A client that connects to the daemon server via HTTP.
 * Used by CLI commands when a daemon is running.
 *
 * @example
 * const client = new DaemonClient({ port: 3847 });
 *
 * const result = await client.scrape({
 *   urls: ['https://example.com'],
 *   formats: ['markdown'],
 * });
 */

/**
 * Daemon client configuration
 */
interface DaemonClientOptions {
    /** Port the daemon is running on (default: 3847) */
    port?: number;
    /** Request timeout in milliseconds (default: 600000 = 10 minutes) */
    timeoutMs?: number;
}
/**
 * Daemon Client
 */
declare class DaemonClient {
    private options;
    constructor(options?: DaemonClientOptions);
    /**
     * Scrape URLs via daemon
     */
    scrape(options: Omit<ScrapeOptions, "connectionToCore">): Promise<ScrapeResult>;
    /**
     * Crawl URL via daemon
     */
    crawl(options: Omit<CrawlOptions, "connectionToCore">): Promise<CrawlResult>;
    /**
     * Get daemon status
     */
    status(): Promise<DaemonStatus>;
    /**
     * Request daemon shutdown
     */
    shutdown(): Promise<void>;
    /**
     * Check if daemon is reachable
     */
    isRunning(): Promise<boolean>;
    /**
     * Make HTTP request to daemon
     */
    private request;
}
/**
 * Check if daemon is running on the specified port
 */
declare function isDaemonRunning(port?: number): Promise<boolean>;

/**
 * Convert HTML to Markdown
 *
 * Simple conversion without any headers, metadata, or formatting wrappers.
 * Returns clean markdown content ready for LLM consumption.
 *
 * Uses supermarkdown (Rust-based) for high-performance conversion.
 */
declare function htmlToMarkdown(html: string): string;
/**
 * Alias for htmlToMarkdown (backward compatibility)
 */
declare const formatToMarkdown: typeof htmlToMarkdown;

/**
 * HTML formatter
 *
 * Returns the cleaned HTML content as-is.
 * The content has already been processed by content-cleaner.ts
 * (ads removed, base64 images stripped, scripts/styles removed).
 */
/**
 * Return HTML content as-is (already cleaned by content-cleaner)
 *
 * This is essentially a pass-through. The cleaning happens in scraper.ts
 * via cleanContent() before this is called.
 */
declare function formatToHTML(html: string): string;

/**
 * Extract comprehensive website metadata from HTML content
 * Uses proper DOM parsing for reliable attribute extraction
 */
declare function extractMetadata(html: string, baseUrl: string): WebsiteMetadata;

/**
 * HTML content cleaning utilities using DOM parsing
 *
 * Layered extraction strategy:
 * 1. Remove scripts, styles, hidden elements (always safe)
 * 2. Remove overlays/modals (always safe)
 * 3. Remove ads (if enabled)
 * 4. Remove navigation with protection (check each element before removing)
 * 5. Find and isolate main content
 */
/**
 * Content cleaning options
 */
interface CleaningOptions {
    /** Remove ads and tracking elements (default: true) */
    removeAds?: boolean;
    /** Remove base64-encoded images (default: true) */
    removeBase64Images?: boolean;
    /** Extract only main content, removing nav/header/footer/sidebar (default: true) */
    onlyMainContent?: boolean;
    /** CSS selectors for elements to include (if set, only these elements are kept) */
    includeTags?: string[];
    /** CSS selectors for elements to exclude (removed from output) */
    excludeTags?: string[];
}
/**
 * Main export - clean HTML content
 */
declare function cleanContent(html: string, baseUrl: string, options?: CleaningOptions): string;

/**
 * URL validation and normalization utilities
 */
/**
 * Resolve a relative URL against a base URL
 */
declare function resolveUrl(relative: string, base: string): string;
/**
 * Validate if a string is a valid URL
 */
declare function isValidUrl(string: string): boolean;
/**
 * Check if a URL belongs to the same domain as the base URL
 * Supports subdomains: blog.example.com matches example.com
 */
declare function isSameDomain(url: string, baseUrl: string): boolean;
/**
 * Generate a URL key for deduplication
 * Normalizes:
 * - Removes fragments (hash)
 * - Removes search params
 * - Removes trailing slashes (except root)
 * - Lowercases
 * - Normalizes www vs non-www
 * - Removes default ports (80 for http, 443 for https)
 * - Normalizes index files (index.html, index.htm, default.html)
 */
declare function getUrlKey(url: string): string;
/**
 * Validate an array of URLs and return validation results
 */
declare function validateUrls(urls: string[]): {
    isValid: boolean;
    validUrls: string[];
    errors: Array<{
        url: string;
        error: string;
    }>;
};
/**
 * Check if a URL should be crawled based on various criteria
 */
declare function shouldCrawlUrl(url: string, baseUrl: string, maxDepth: number, currentDepth: number, visited: Set<string>): boolean;

/**
 * Simple rate limit function
 */
declare function rateLimit(ms: number): Promise<void>;

/**
 * Browser Pool
 *
 * Manages a pool of Hero browser instances with:
 * - Auto-recycling based on age/request count
 * - Request queuing when pool is full
 * - Health monitoring
 *
 * @example
 * const pool = new BrowserPool({ size: 5 });
 * await pool.initialize();
 *
 * // Use withBrowser for automatic acquire/release
 * await pool.withBrowser(async (hero) => {
 *   await hero.goto('https://example.com');
 *   const title = await hero.document.title;
 *   return title;
 * });
 *
 * await pool.shutdown();
 */
declare class BrowserPool implements IBrowserPool {
    private instances;
    private available;
    private inUse;
    private queue;
    private config;
    private proxy?;
    private recycleTimer?;
    private healthTimer?;
    private totalRequests;
    private totalRequestDuration;
    private showChrome;
    private connectionToCore?;
    private userAgent?;
    private verbose;
    private logger;
    constructor(config?: Partial<PoolConfig>, proxy?: ProxyConfig, showChrome?: boolean, connectionToCore?: any, userAgent?: string, verbose?: boolean);
    /**
     * Initialize the pool by pre-launching browsers
     */
    initialize(): Promise<void>;
    /**
     * Shutdown the pool and close all browsers
     */
    shutdown(): Promise<void>;
    /**
     * Acquire a browser from the pool
     */
    acquire(): Promise<Hero>;
    /**
     * Release a browser back to the pool
     */
    release(hero: Hero): void;
    /**
     * Execute callback with auto-managed browser
     */
    withBrowser<T>(callback: (hero: Hero) => Promise<T>): Promise<T>;
    /**
     * Get pool statistics
     */
    getStats(): PoolStats;
    /**
     * Run health check
     */
    healthCheck(): Promise<HealthStatus>;
    /**
     * Create a new browser instance
     */
    private createInstance;
    /**
     * Check if instance should be recycled
     */
    private shouldRecycle;
    /**
     * Recycle an instance (close old, create new)
     */
    private recycleInstance;
    /**
     * Queue a request when no browsers available
     */
    private queueRequest;
    /**
     * Process queued requests
     */
    private processQueue;
    /**
     * Start background recycling task
     */
    private startRecycling;
    /**
     * Start background health checks
     */
    private startHealthChecks;
}

/**
 * Hero configuration options
 */
interface HeroConfigOptions {
    /** Proxy configuration */
    proxy?: ProxyConfig;
    /** Show Chrome window (default: false) */
    showChrome?: boolean;
    /** Custom user agent */
    userAgent?: string;
    /** Connection to Core (for in-process Core) */
    connectionToCore?: any;
}
/**
 * Create Hero configuration with optimal anti-bot bypass settings
 *
 * Extracted from proven hero-test implementation.
 * Includes:
 * - TLS fingerprint emulation (disableMitm: false)
 * - DNS over TLS (mimics Chrome)
 * - WebRTC IP masking
 * - Proper locale and timezone
 *
 * @param options - Configuration options
 * @returns Hero configuration object
 */
declare function createHeroConfig(options?: HeroConfigOptions): any;

/**
 * Cloudflare challenge detection result
 */
interface ChallengeDetection {
    /** Whether a challenge was detected */
    isChallenge: boolean;
    /** Type of challenge */
    type: "js_challenge" | "turnstile" | "captcha" | "blocked" | "none";
    /** Confidence level (0-100) */
    confidence: number;
    /** Detection signals found */
    signals: string[];
}
/**
 * Challenge resolution result
 */
interface ChallengeResolutionResult {
    /** Whether the challenge was resolved */
    resolved: boolean;
    /** Method used to detect resolution */
    method: "url_redirect" | "signals_cleared" | "timeout";
    /** Time waited in milliseconds */
    waitedMs: number;
}
/**
 * Challenge waiting options
 */
interface ChallengeWaitOptions {
    /** Maximum time to wait for resolution (default: 45000ms) */
    maxWaitMs?: number;
    /** How often to poll for resolution (default: 500ms) */
    pollIntervalMs?: number;
    /** Enable verbose logging */
    verbose?: boolean;
    /** Initial URL before challenge */
    initialUrl: string;
}

/**
 * Detect if current page is a Cloudflare challenge
 *
 * Uses multi-signal approach requiring BOTH:
 * 1. Cloudflare infrastructure indicators (cdn-cgi, cf-ray, etc.)
 * 2. Challenge-specific elements or text
 *
 * This prevents false positives on login pages or other sites
 * that happen to use similar text.
 *
 * @param hero - Hero instance with loaded page
 * @returns Detection result with confidence score and signals
 */
declare function detectChallenge(hero: Hero): Promise<ChallengeDetection>;
/**
 * Quick check - just returns boolean
 *
 * @param hero - Hero instance
 * @returns True if challenge page detected
 */
declare function isChallengePage(hero: Hero): Promise<boolean>;

/**
 * Wait for Cloudflare challenge to resolve
 *
 * Uses multiple detection strategies:
 * 1. URL redirect detection (page redirects after challenge)
 * 2. Signal polling (challenge-specific elements/text disappear)
 *
 * @param hero - Hero instance with challenge page loaded
 * @param options - Waiting options
 * @returns Resolution result with method and time waited
 *
 * @example
 * const result = await waitForChallengeResolution(hero, {
 *   maxWaitMs: 45000,
 *   pollIntervalMs: 500,
 *   verbose: true,
 *   initialUrl: 'https://example.com'
 * });
 *
 * if (result.resolved) {
 *   console.log(`Challenge resolved via ${result.method} in ${result.waitedMs}ms`);
 * }
 */
declare function waitForChallengeResolution(hero: Hero, options: ChallengeWaitOptions): Promise<ChallengeResolutionResult>;
/**
 * Wait for a specific CSS selector to appear
 *
 * Useful when you know exactly what element should appear after challenge.
 *
 * @param hero - Hero instance
 * @param selector - CSS selector to wait for
 * @param maxWaitMs - Maximum time to wait
 * @param verbose - Enable logging
 * @returns Whether selector was found and time waited
 *
 * @example
 * const result = await waitForSelector(hero, '.content', 30000, true);
 * if (result.found) {
 *   console.log(`Content appeared after ${result.waitedMs}ms`);
 * }
 */
declare function waitForSelector(hero: Hero, selector: string, maxWaitMs: number, verbose?: boolean): Promise<{
    found: boolean;
    waitedMs: number;
}>;
/**
 * Handle Cloudflare challenge with automatic detection and waiting
 *
 * High-level function that combines detection and resolution.
 *
 * @param hero - Hero instance
 * @param options - Wait options (without initialUrl)
 * @returns Resolution result
 *
 * @example
 * await hero.goto('https://example.com');
 * const result = await handleChallenge(hero, { verbose: true });
 * if (result.resolved) {
 *   // Challenge passed, continue scraping
 * }
 */
declare function handleChallenge(hero: Hero, options?: Omit<ChallengeWaitOptions, "initialUrl">): Promise<ChallengeResolutionResult>;

/**
 * Create proxy URL from configuration
 *
 * Supports both datacenter and residential proxies.
 * For residential proxies (e.g., IPRoyal), generates a sticky session ID.
 *
 * @param config - Proxy configuration
 * @returns Formatted proxy URL
 *
 * @example
 * // Datacenter proxy
 * createProxyUrl({
 *   type: 'datacenter',
 *   username: 'user',
 *   password: 'pass',
 *   host: 'proxy.example.com',
 *   port: 8080
 * })
 * // Returns: "http://user:pass@proxy.example.com:8080"
 *
 * @example
 * // Residential proxy with sticky session
 * createProxyUrl({
 *   type: 'residential',
 *   username: 'customer-abc',
 *   password: 'secret',
 *   host: 'geo.iproyal.com',
 *   port: 12321,
 *   country: 'us'
 * })
 * // Returns: "http://customer-abc_session-hero_123_abc456_country-us:secret@geo.iproyal.com:12321"
 */
declare function createProxyUrl(config: ProxyConfig): string;
/**
 * Parse proxy URL into ProxyConfig
 *
 * @param url - Proxy URL string
 * @returns Parsed proxy configuration
 *
 * @example
 * parseProxyUrl("http://user:pass@proxy.example.com:8080")
 * // Returns: { username: 'user', password: 'pass', host: 'proxy.example.com', port: 8080 }
 */
declare function parseProxyUrl(url: string): ProxyConfig;

/**
 * Typed error classes for Reader
 *
 * Provides actionable error messages and structured error information
 * for better debugging and error handling.
 */
/**
 * Error codes for categorization
 */
declare enum ReaderErrorCode {
    NETWORK_ERROR = "NETWORK_ERROR",
    TIMEOUT = "TIMEOUT",
    CONNECTION_REFUSED = "CONNECTION_REFUSED",
    CLOUDFLARE_CHALLENGE = "CLOUDFLARE_CHALLENGE",
    BOT_DETECTED = "BOT_DETECTED",
    ACCESS_DENIED = "ACCESS_DENIED",
    CONTENT_EXTRACTION_FAILED = "CONTENT_EXTRACTION_FAILED",
    EMPTY_CONTENT = "EMPTY_CONTENT",
    INVALID_URL = "INVALID_URL",
    INVALID_OPTIONS = "INVALID_OPTIONS",
    ROBOTS_BLOCKED = "ROBOTS_BLOCKED",
    BROWSER_ERROR = "BROWSER_ERROR",
    POOL_EXHAUSTED = "POOL_EXHAUSTED",
    CLIENT_CLOSED = "CLIENT_CLOSED",
    NOT_INITIALIZED = "NOT_INITIALIZED",
    UNKNOWN = "UNKNOWN"
}
/**
 * Base error class for all Reader errors
 */
declare class ReaderError extends Error {
    readonly code: ReaderErrorCode;
    readonly url?: string;
    readonly cause?: Error;
    readonly timestamp: string;
    readonly retryable: boolean;
    constructor(message: string, code: ReaderErrorCode, options?: {
        url?: string;
        cause?: Error;
        retryable?: boolean;
    });
    /**
     * Convert to a plain object for serialization
     */
    toJSON(): Record<string, unknown>;
}
/**
 * Network-related errors (connection issues, DNS failures, etc.)
 */
declare class NetworkError extends ReaderError {
    constructor(message: string, options?: {
        url?: string;
        cause?: Error;
    });
}
/**
 * Timeout errors (page load, navigation, etc.)
 */
declare class TimeoutError extends ReaderError {
    readonly timeoutMs: number;
    constructor(message: string, timeoutMs: number, options?: {
        url?: string;
        cause?: Error;
    });
    toJSON(): Record<string, unknown>;
}
/**
 * Cloudflare challenge errors
 */
declare class CloudflareError extends ReaderError {
    readonly challengeType: string;
    constructor(challengeType: string, options?: {
        url?: string;
        cause?: Error;
    });
    toJSON(): Record<string, unknown>;
}
/**
 * Access denied errors (blocked, forbidden, etc.)
 */
declare class AccessDeniedError extends ReaderError {
    readonly statusCode?: number;
    constructor(message: string, options?: {
        url?: string;
        statusCode?: number;
        cause?: Error;
    });
    toJSON(): Record<string, unknown>;
}
/**
 * Content extraction errors
 */
declare class ContentExtractionError extends ReaderError {
    constructor(message: string, options?: {
        url?: string;
        cause?: Error;
    });
}
/**
 * Validation errors (invalid URLs, options, etc.)
 */
declare class ValidationError extends ReaderError {
    readonly field?: string;
    constructor(message: string, options?: {
        field?: string;
        url?: string;
    });
    toJSON(): Record<string, unknown>;
}
/**
 * URL validation error
 */
declare class InvalidUrlError extends ReaderError {
    constructor(url: string, reason?: string);
}
/**
 * Robots.txt blocked error
 */
declare class RobotsBlockedError extends ReaderError {
    constructor(url: string);
}
/**
 * Browser pool errors
 */
declare class BrowserPoolError extends ReaderError {
    constructor(message: string, options?: {
        cause?: Error;
    });
}
/**
 * Client state errors
 */
declare class ClientClosedError extends ReaderError {
    constructor();
}
/**
 * Not initialized error
 */
declare class NotInitializedError extends ReaderError {
    constructor(component: string);
}
/**
 * Helper to wrap unknown errors in ReaderError
 */
declare function wrapError(error: unknown, url?: string): ReaderError;

export { AccessDeniedError, type BatchMetadata, type BrowserInstance, BrowserPool, type BrowserPoolConfig, BrowserPoolError, type ChallengeDetection, type ChallengeResolutionResult, type ChallengeWaitOptions, ClientClosedError, CloudflareError, ContentExtractionError, type CrawlMetadata, type CrawlOptions, type CrawlResult, type CrawlUrl, Crawler, DEFAULT_DAEMON_PORT, DEFAULT_OPTIONS, DaemonClient, type DaemonClientOptions, DaemonServer, type DaemonServerOptions, type DaemonStatus, type HealthStatus, BrowserPool as HeroBrowserPool, type IBrowserPool, InvalidUrlError, NetworkError, NotInitializedError, type Page, type PoolConfig, type PoolStats, type ProxyConfig, type ProxyMetadata, type ProxyRotation, ReaderClient, type ReaderClientOptions, ReaderError, ReaderErrorCode, RobotsBlockedError, type ScrapeOptions, type ScrapeResult, Scraper, TimeoutError, ValidationError, type WebsiteMetadata, type WebsiteScrapeResult, cleanContent, crawl, createHeroConfig, createProxyUrl, detectChallenge, extractMetadata, formatToHTML, formatToMarkdown, getDaemonInfo, getPidFilePath, getUrlKey, handleChallenge, htmlToMarkdown, isChallengePage, isDaemonRunning, isSameDomain, isValidFormat, isValidUrl, parseProxyUrl, rateLimit, resolveUrl, scrape, shouldCrawlUrl, shouldCrawlUrl$1 as shouldCrawlUrlFn, validateUrls, waitForChallengeResolution, waitForSelector, wrapError };
