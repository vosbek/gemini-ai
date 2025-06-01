// js/main.js

/**
 * Fetches HTML content from a given URL and inserts it into a specified element.
 * @param {string} url - The URL to fetch the HTML content from.
 * @param {string} elementSelector - The CSS selector of the element to insert the content into.
 */
async function loadHTML(url, elementSelector) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            // If fetching shared-header.html fails, it's a critical error for navigation.
            console.error(`CRITICAL: Failed to fetch ${url}: ${response.status} ${response.statusText}`);
            const element = document.querySelector(elementSelector);
            if (element) {
                element.innerHTML = `<p style="color: red; text-align: center; padding: 20px; background: #fff2f2; border: 1px solid red;">Error: Could not load shared navigation. Please check console and ensure you are using a local web server.</p>`;
            }
            return false; // Indicate failure
        }
        const text = await response.text();
        const element = document.querySelector(elementSelector);
        if (element) {
            element.innerHTML = text;
            return true; // Indicate success
        } else {
            console.warn(`Element with selector "${elementSelector}" not found for content from ${url}.`);
            return false; // Indicate failure
        }
    } catch (error) {
        console.error('Error loading HTML:', error);
        const element = document.querySelector(elementSelector);
        if (element) {
            element.innerHTML = `<p style="color: red; text-align: center; padding: 20px; background: #fff2f2; border: 1px solid red;">Error: Could not load shared navigation due to a network or script error. Check console.</p>`;
        }
        return false; // Indicate failure
    }
}

/**
 * Sets the active class on the navigation item corresponding to the current page.
 */
function setActiveNavLink() {
    // Get the current page's filename (e.g., "index.html", "workflow.html")
    // window.location.pathname can be like "/folder/page.html" or just "/page.html"
    const pathParts = window.location.pathname.split('/');
    const currentPage = pathParts.pop() || 'index.html'; // Default to index.html if path ends with '/'

    const navLinks = document.querySelectorAll('.main-nav .nav-item');

    if (navLinks.length === 0) {
        // This might happen if shared-header.html hasn't loaded yet or has no nav items.
        // console.warn("setActiveNavLink: No navigation links found. Header might not be loaded yet.");
        return;
    }

    navLinks.forEach(link => {
        const linkHref = link.getAttribute('href');
        if (!linkHref) return;

        const linkPage = linkHref.split('/').pop();

        // Remove active class from all first
        link.classList.remove('active');

        if (linkPage === currentPage) {
            link.classList.add('active');
        }
    });
}

/**
 * Adds target="_blank" and rel="noopener noreferrer" to all external links.
 * External links are those starting with "http://" or "https://".
 */
function secureExternalLinks() {
    const links = document.querySelectorAll('a');
    links.forEach(link => {
        const href = link.getAttribute('href');
        if (href) {
            // Check if the link is external
            if (href.startsWith('http://') || href.startsWith('https://')) {
                // Ensure it's not a link to the same domain if you want to be more specific,
                // but for this general guide, any absolute http/https is treated as external.
                link.setAttribute('target', '_blank');
                link.setAttribute('rel', 'noopener noreferrer');
            }
        }
    });
}


// Run functions when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Create a placeholder for the shared header if it doesn't exist in the HTML
    // This ensures the script can always find a place to inject the header.
    let headerPlaceholder = document.getElementById('shared-header-placeholder');
    if (!headerPlaceholder) {
        headerPlaceholder = document.createElement('div');
        headerPlaceholder.id = 'shared-header-placeholder';
        
        // Try to prepend to '.container', otherwise prepend to 'body'
        const container = document.querySelector('.container'); 
        if (container) {
            // Insert it as the first child of the container
            container.prepend(headerPlaceholder);
        } else {
            // Fallback: insert as the first child of the body
            document.body.prepend(headerPlaceholder);
            console.warn('.container element not found for header placeholder. Prepending to body. This might affect layout.');
        }
    }
    
    // 2. Load shared header HTML into the placeholder
    // The path 'shared-header.html' assumes it's in the same directory as the current HTML page (root).
    const headerLoadedSuccessfully = await loadHTML('shared-header.html', '#shared-header-placeholder');
    
    // 3. Only proceed with nav link functions if the header was loaded
    if (headerLoadedSuccessfully) {
        // Set active nav link based on the current page
        setActiveNavLink();

        // Secure external links (make them open in new tabs)
        // This should be called after the header (which contains nav links) is loaded.
        secureExternalLinks(); 
    } else {
        console.error("Shared header failed to load. Navigation and external link processing skipped.");
    }
});
