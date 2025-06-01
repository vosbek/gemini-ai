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
            // Corrected line: Removed the extraneous 'A'
            console.error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
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
 * @param {string} pageUrl - The URL of the page to load (e.g., "workflow.html").
 */
async function loadPageContent(pageUrl) {
    const mainContentArea = document.querySelector(contentAreaSelector);
    if (!mainContentArea) {
        console.error(`Main content area "${contentAreaSelector}" not found.`);
        return;
    }

    // Show a simple loading indicator (optional)
    mainContentArea.innerHTML = '<p style="text-align:center; padding:40px;">Loading...</p>';

    const htmlContent = await fetchHTML(pageUrl);

    if (htmlContent) {
        // Create a temporary DOM element to parse the fetched HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;

        // Find the main content area in the fetched HTML
        const newPageMainContent = tempDiv.querySelector(contentAreaSelector);
        
        if (newPageMainContent) {
            mainContentArea.innerHTML = newPageMainContent.innerHTML;
        } else {
            // Fallback: if the fetched page doesn't have a .main-content-area,
            // try to find a .page-section. This might indicate the fetched HTML
            // is not structured as expected (e.g., it's an error page from the server).
            const newPageSection = tempDiv.querySelector('.page-section');
            if (newPageSection) {
                console.warn(`Fetched page ${pageUrl} did not contain "${contentAreaSelector}". Using ".page-section" instead.`);
                mainContentArea.innerHTML = ""; // Clear loading
                mainContentArea.appendChild(newPageSection); // Append the section directly
            } else {
                 console.error(`Could not find "${contentAreaSelector}" or ".page-section" in fetched content from ${pageUrl}.`);
                 mainContentArea.innerHTML = '<p style="color:red; text-align:center; padding:20px; background:#fff2f2; border:1px solid red;">Error: Content structure not found in fetched page. Check console for fetch errors.</p>';
            }
        }
        // Re-apply functions that need to run on new content
        secureExternalLinks(); 
        setActiveNavLink(pageUrl); 
    } else {
        mainContentArea.innerHTML = `<p style="color:red; text-align:center; padding:20px; background:#fff2f2; border:1px solid red;">Error: Could not load content for ${pageUrl}. Check console for fetch errors.</p>`;
    }
}

/**
 * Sets the active class on the navigation item corresponding to the current page.
 * @param {string} pageUrl - The URL of the currently displayed page (e.g., "index.html", "workflow.html").
 */
function setActiveNavLink(pageUrl) {
    const currentPageFilename = pageUrl.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll(`#${sharedHeaderPlaceholderId} .main-nav .nav-item`);

    navLinks.forEach(link => {
        const linkHref = link.getAttribute('href');
        if (!linkHref) return;
        const linkPageFilename = linkHref.split('/').pop();

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
    // Query for links within the main content area and the header
    const links = document.querySelectorAll(`${contentAreaSelector} a, #${sharedHeaderPlaceholderId} a`);
    links.forEach(link => {
        const href = link.getAttribute('href');
        if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
            // Check if it's not a link to the same host, to be more precise for external links
            try {
                const targetUrl = new URL(href);
                if (targetUrl.hostname !== window.location.hostname) {
                    link.setAttribute('target', '_blank');
                    link.setAttribute('rel', 'noopener noreferrer');
                }
            } catch (e) {
                // If URL is invalid, do nothing or log error
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
    if (link && link.href) {
        const targetUrl = new URL(link.href, window.location.origin); 
        const currentUrl = new URL(window.location.href);

        // Check if it's an internal link to an HTML page within the site
        if (targetUrl.hostname === currentUrl.hostname && 
            targetUrl.pathname.endsWith('.html') &&
            targetUrl.href !== currentUrl.href) { // Only navigate if different page
            
            event.preventDefault(); 
            
            // Get the simple filename (e.g., "workflow.html") for loadPageContent and pushState
            const pageFilename = targetUrl.pathname.substring(targetUrl.pathname.lastIndexOf('/') + 1);
            
            loadPageContent(pageFilename); 
            window.history.pushState({ path: pageFilename }, '', link.href); 
        }
        // External links or non-HTML internal links will behave normally
    }
}

/**
 * Handles browser back/forward button clicks.
 * @param {PopStateEvent} event - The popstate event.
 */
function handlePopState(event) {
    let path;
    if (event.state && event.state.path) {
        path = event.state.path;
    } else {
        // Fallback for initial load or states without a path (e.g. hash changes, or direct entry)
        path = window.location.pathname.split('/').pop() || 'index.html';
    }
    loadPageContent(path);
}

/**
 * Initializes the shared header and sets up initial page content and event listeners.
 */
async function initializeSite() {
    // 1. Ensure header placeholder exists
    let headerPlaceholder = document.getElementById(sharedHeaderPlaceholderId);
    if (!headerPlaceholder) {
        headerPlaceholder = document.createElement('div');
        headerPlaceholder.id = sharedHeaderPlaceholderId;
        const container = document.querySelector('.container');
        if (container) {
            container.prepend(headerPlaceholder);
        } else {
            document.body.prepend(headerPlaceholder);
            console.warn('Container not found, prepending header placeholder to body.');
        }
    }

    // 2. Load shared header
    const headerHTML = await fetchHTML('shared-header.html');
    if (headerHTML) {
        headerPlaceholder.innerHTML = headerHTML;
        const navElement = headerPlaceholder.querySelector('.main-nav');
        if (navElement) {
            navElement.addEventListener('click', handleNavLinkClick);
        } else {
            console.warn('Main navigation element (.main-nav) not found in shared-header.html.');
        }
    } else {
        headerPlaceholder.innerHTML = `<p style="color: red; text-align: center; padding: 20px; background: #fff2f2; border: 1px solid red;">Error: Could not load shared navigation. Please check console and ensure you are using a local web server if testing locally, or that 'shared-header.html' is accessible.</p>`;
    }

    // 3. Load initial page content based on the current URL path
    const initialPageFilename = window.location.pathname.split('/').pop() || 'index.html';
    await loadPageContent(initialPageFilename); 

    // 4. Add event listener for browser back/forward navigation
    window.addEventListener('popstate', handlePopState);

    // 5. Secure external links on initial load (header + initial content)
    // This needs to be called after both header and initial content are potentially loaded.
    secureExternalLinks();
}

// Run initialization when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initializeSite);
