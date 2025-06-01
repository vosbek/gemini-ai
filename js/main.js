// js/main.js

const contentAreaSelector = '.main-content-area'; // The element where page content will be loaded
const sharedHeaderPlaceholderId = 'shared-header-placeholder'; // ID of the header placeholder

/**
 * Fetches HTML content from a given URL.
 * @param {string} url - The URL to fetch the HTML content from.
 * @returns {Promise<string|null>} The HTML text content or null if an error occurs.
 */
async function fetchHTML(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            // Logs the full URL that failed, which is helpful for debugging path issues on servers
            console.error(`Failed to fetch ${url}: ${response.status} ${response.statusText} (Full URL: ${response.url})`);
            return null;
        }
        return await response.text();
    } catch (error) {
        console.error(`Error fetching HTML from ${url}:`, error);
        return null;
    }
}

/**
 * Loads the main content of a page into the content area.
 * @param {string} pageUrl - The URL of the page to load (e.g., "workflow.html" or "index.html").
 */
async function loadPageContent(pageUrl) {
    const mainContentArea = document.querySelector(contentAreaSelector);
    if (!mainContentArea) {
        console.error(`Main content area "${contentAreaSelector}" not found in the current document. This is a critical error in the base HTML structure.`);
        return;
    }

    mainContentArea.innerHTML = '<p style="text-align:center; padding:40px;">Loading...</p>';
    const htmlContent = await fetchHTML(pageUrl);

    if (htmlContent) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        const newPageMainContent = tempDiv.querySelector(contentAreaSelector);
        
        if (newPageMainContent) {
            mainContentArea.innerHTML = newPageMainContent.innerHTML;
        } else {
            const newPageSection = tempDiv.querySelector('.page-section');
            if (newPageSection) {
                console.warn(`Fetched page ${pageUrl} did not contain "${contentAreaSelector}". Using ".page-section" instead. Ensure all content pages have a <main class="main-content-area"> wrapper.`);
                mainContentArea.innerHTML = ""; 
                mainContentArea.appendChild(newPageSection); 
            } else {
                 console.error(`CRITICAL ERROR: Could not find "${contentAreaSelector}" or ".page-section" in fetched content from ${pageUrl}. This means the fetched HTML page is missing the main content wrapper, or the fetched content is not the expected HTML page (e.g., it's an error page from the server).`);
                 // Log the beginning of the fetched content for diagnosis
                 console.log(`Start of fetched content from ${pageUrl} (first 500 chars):`, htmlContent.substring(0, 500));
                 mainContentArea.innerHTML = '<p style="color:red; text-align:center; padding:20px; background:#fff2f2; border:1px solid red;">Error: Content structure not found in fetched page. Check browser console for details, including a preview of the fetched content and any network errors (like 404s).</p>';
            }
        }
        // These should be called after content is successfully injected
        secureExternalLinks(); 
        setActiveNavLink(pageUrl); 
    } else {
        // This block is reached if fetchHTML returned null (e.g., 404 Not Found)
        mainContentArea.innerHTML = `<p style="color:red; text-align:center; padding:20px; background:#fff2f2; border:1px solid red;">Error: Could not load content for ${pageUrl}. The file might be missing or inaccessible. Check console for fetch errors (e.g., 404 Not Found).</p>`;
    }
}

/**
 * Sets the active class on the navigation item corresponding to the current page.
 * @param {string} pageUrl - The filename of the currently displayed page (e.g., "index.html", "workflow.html").
 */
function setActiveNavLink(pageUrl) {
    // Ensure pageUrl is just the filename, like "index.html" or "workflow.html"
    const currentPageFilename = pageUrl.split('/').pop() || 'index.html'; 
    const navLinks = document.querySelectorAll(`#${sharedHeaderPlaceholderId} .main-nav .nav-item`);

    if (navLinks.length === 0) {
        // console.warn("setActiveNavLink: No navigation links found. Header might not be loaded or is missing .main-nav .nav-item elements.");
        return;
    }

    navLinks.forEach(link => {
        const linkHref = link.getAttribute('href');
        if (!linkHref) return;
        // Ensure linkPageFilename is also just the filename
        const linkPageFilename = linkHref.split('/').pop() || 'index.html'; 

        if (linkPageFilename === currentPageFilename) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

/**
 * Adds target="_blank" and rel="noopener noreferrer" to all external links
 * on the page. This should be called after new content is loaded.
 */
function secureExternalLinks() {
    // Query for links within the main content area and the header placeholder
    const links = document.querySelectorAll(`${contentAreaSelector} a, #${sharedHeaderPlaceholderId} a`);
    links.forEach(link => {
        const href = link.getAttribute('href');
        if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
            try {
                const targetUrl = new URL(href);
                // Only add target="_blank" if the hostname is different from the current site's hostname
                if (targetUrl.hostname !== window.location.hostname) {
                    link.setAttribute('target', '_blank');
                    link.setAttribute('rel', 'noopener noreferrer');
                }
            } catch (e) {
                // Log if URL parsing fails, but don't break execution
                console.warn('Could not parse URL for securing external link:', href, e);
            }
        }
    });
}

/**
 * Handles navigation link clicks for SPA-like behavior.
 * @param {Event} event - The click event.
 */
function handleNavLinkClick(event) {
    const link = event.target.closest('a.nav-item'); 
    if (link && link.hasAttribute('href')) { // Check if href attribute exists
        const linkHref = link.getAttribute('href');
        
        // Attempt to resolve the target URL against the current page's base URL
        const targetUrl = new URL(linkHref, window.location.href); 
        const currentUrl = new URL(window.location.href);

        // Check if it's an internal link to an HTML page within the site
        // and not a link to the current page itself
        if (targetUrl.hostname === currentUrl.hostname && 
            targetUrl.pathname.endsWith('.html') &&
            targetUrl.href !== currentUrl.href) { 
            
            event.preventDefault(); 
            
            // Use just the filename for loadPageContent and history state
            const pageFilename = targetUrl.pathname.split('/').pop() || 'index.html'; 
            
            loadPageContent(pageFilename); 
            // Push the full resolved href to history for correct back/forward behavior
            window.history.pushState({ path: pageFilename }, '', targetUrl.href); 
        }
        // External links, hash links, or non-HTML internal links will behave normally
    }
}

/**
 * Handles browser back/forward button clicks.
 * @param {PopStateEvent} event - The popstate event.
 */
function handlePopState(event) {
    let path;
    if (event.state && event.state.path) {
        path = event.state.path; // This should be just the filename, e.g., "index.html"
    } else {
        // Fallback for initial load or states without a path
        // Derives filename from the current window location
        path = window.location.pathname.split('/').pop() || 'index.html';
    }
    loadPageContent(path); // Expects just the filename
}

/**
 * Initializes the shared header and sets up initial page content and event listeners.
 */
async function initializeSite() {
    let headerPlaceholder = document.getElementById(sharedHeaderPlaceholderId);
    if (!headerPlaceholder) {
        headerPlaceholder = document.createElement('div');
        headerPlaceholder.id = sharedHeaderPlaceholderId;
        const container = document.querySelector('.container');
        if (container) {
            container.prepend(headerPlaceholder);
        } else {
            document.body.prepend(headerPlaceholder);
            console.warn('.container element not found, prepending header placeholder to body. This might affect layout.');
        }
    }

    const headerHTML = await fetchHTML('shared-header.html');
    if (headerHTML) {
        headerPlaceholder.innerHTML = headerHTML;
        const navElement = headerPlaceholder.querySelector('.main-nav');
        if (navElement) {
            navElement.addEventListener('click', handleNavLinkClick);
        } else {
            console.warn('Main navigation element (.main-nav) not found in loaded shared-header.html.');
        }
    } else {
        headerPlaceholder.innerHTML = `<p style="color: red; text-align: center; padding: 20px; background: #fff2f2; border: 1px solid red;">Error: Could not load shared navigation. Ensure 'shared-header.html' is in the root directory of your site and accessible. Check console for fetch errors.</p>`;
    }

    // Determine the initial page filename from the current URL path
    const initialPageFilename = window.location.pathname.split('/').pop() || 'index.html';
    await loadPageContent(initialPageFilename); 

    // Listen for back/forward navigation
    window.addEventListener('popstate', handlePopState);

    // Secure external links present on initial load (in header and loaded content)
    secureExternalLinks();
}

// Run initialization when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initializeSite);
