// ==UserScript==
// @name         Torn Competition Position Calculator
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Calculate your position in Torn competition rankings
// @author       You
// @match        https://www.torn.com/page.php?sid=competition*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Create floating button
    function createButton() {
        const button = document.createElement('button');
        button.textContent = 'Calculate';
        button.id = 'torn-position-calc-btn';
        button.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            padding: 10px 20px;
            background-color: #4CAF50;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        `;
        
        button.addEventListener('mouseenter', () => {
            button.style.backgroundColor = '#45a049';
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.backgroundColor = '#4CAF50';
        });
        
        button.addEventListener('click', calculatePosition);
        
        document.body.appendChild(button);
    }

    // Calculate position from found row
    function calculatePositionFromRow(userRow) {
        // Get transform style
        const style = window.getComputedStyle(userRow);
        const transform = style.transform || style.webkitTransform || style.mozTransform;
        
        if (!transform || transform === 'none') {
            // Try inline style as fallback
            const inlineStyle = userRow.getAttribute('style');
            const translateYMatch = inlineStyle ? inlineStyle.match(/translateY\((\d+)px\)/) : null;
            
            if (!translateYMatch) {
                showToast('Could not find translateY value.', 'error');
                return;
            }
            
            const translateY = parseInt(translateYMatch[1], 10);
            const position = Math.floor(translateY / 36) + 1;
            showToast(`Your position: ${position}`, 'success');
            return;
        }
        
        // Extract translateY from matrix or translate
        let translateY = 0;
        
        if (transform.includes('matrix') || transform.includes('matrix3d')) {
            // Matrix format: matrix(1, 0, 0, 1, tx, ty) or matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, tx, ty, tz, 1)
            const matrixMatch = transform.match(/matrix(?:3d)?\([^)]+\)/);
            if (matrixMatch) {
                const values = matrixMatch[0].match(/[\d.]+/g);
                if (values && values.length >= 6) {
                    translateY = parseFloat(values[values.length >= 14 ? 13 : 5]);
                }
            }
        } else if (transform.includes('translateY')) {
            // Direct translateY format
            const translateYMatch = transform.match(/translateY\(([^)]+)\)/);
            if (translateYMatch) {
                translateY = parseFloat(translateYMatch[1]);
            }
        }
        
        if (translateY === 0 && !transform.includes('translateY')) {
            // Fallback: check inline style
            const inlineStyle = userRow.getAttribute('style');
            const translateYMatch = inlineStyle ? inlineStyle.match(/translateY\((\d+)px\)/) : null;
            
            if (translateYMatch) {
                translateY = parseInt(translateYMatch[1], 10);
            } else {
                showToast('Could not extract translateY value.', 'error');
                return;
            }
        }
        
        // Calculate position: translateY / 36 + 1
        const position = Math.floor(translateY / 36) + 1;
        showToast(`Your position: ${position}`, 'success');
    }

    // Scroll and search for user's row
    function scrollAndFindRow() {
        const virtualContainer = document.querySelector('.virtualContainer___Ft72x');
        if (!virtualContainer) {
            showToast('Could not find the competition list container.', 'error');
            return;
        }

        // Find the scrollable container (usually parent of virtual container)
        let scrollableElement = virtualContainer.parentElement;
        while (scrollableElement && scrollableElement !== document.body) {
            const overflow = window.getComputedStyle(scrollableElement).overflowY;
            if (overflow === 'auto' || overflow === 'scroll') {
                break;
            }
            scrollableElement = scrollableElement.parentElement;
        }

        // If no scrollable container found, use window
        if (!scrollableElement || scrollableElement === document.body) {
            scrollableElement = window;
        }

        let scrollPosition = 0;
        const scrollStep = 300; // Scroll 300px at a time
        const maxScrollAttempts = 150; // Maximum number of scroll attempts
        let attempts = 0;

        showToast('Scrolling to find your row...', 'success');

        const scrollInterval = setInterval(() => {
            attempts++;
            
            // Check if row exists now
            const userRow = document.querySelector('.dataGridRow___FAAJF.teamRow___R3ZLF.yourRow___R9Oi8');
            if (userRow) {
                clearInterval(scrollInterval);
                // Small delay to ensure row is fully rendered
                setTimeout(() => {
                    calculatePositionFromRow(userRow);
                }, 150);
                return;
            }

            // If we've tried too many times, give up
            if (attempts >= maxScrollAttempts) {
                clearInterval(scrollInterval);
                showToast('Could not find your row after scrolling. You may not be in the competition.', 'error');
                return;
            }

            // Scroll down
            if (scrollableElement === window) {
                scrollPosition += scrollStep;
                window.scrollTo({
                    top: scrollPosition,
                    behavior: 'auto' // Use 'auto' for faster scrolling
                });
            } else {
                scrollPosition += scrollStep;
                scrollableElement.scrollTop = scrollPosition;
            }
        }, 150); // Check every 150ms
    }

    // Calculate position
    function calculatePosition() {
        // Find user's row (has class "yourRow___R9Oi8")
        const userRow = document.querySelector('.dataGridRow___FAAJF.teamRow___R3ZLF.yourRow___R9Oi8');
        
        if (!userRow) {
            // Ask user for permission to scroll
            const shouldScroll = confirm(
                'Could not find your row in the visible area.\n\n' +
                'Would you like the script to scroll the page to find your row?\n\n' +
                'Click OK to start scrolling, or Cancel to abort.'
            );
            
            if (shouldScroll) {
                scrollAndFindRow();
            } else {
                showToast('Search cancelled. Make sure you can see yourself in the list.', 'error');
            }
            return;
        }
        
        calculatePositionFromRow(userRow);
    }

    // Show toast notification
    function showToast(message, type = 'success') {
        // Remove existing toast if any
        const existingToast = document.getElementById('torn-position-toast');
        if (existingToast) {
            existingToast.remove();
        }
        
        const toast = document.createElement('div');
        toast.id = 'torn-position-toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 10001;
            padding: 15px 25px;
            background-color: ${type === 'error' ? '#f44336' : '#4CAF50'};
            color: white;
            border-radius: 5px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            font-size: 14px;
            font-weight: bold;
            animation: slideIn 0.3s ease-out;
            max-width: 300px;
        `;
        
        // Add animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(toast);
        
        // Remove toast after 3 seconds
        setTimeout(() => {
            toast.style.animation = 'slideIn 0.3s ease-out reverse';
            setTimeout(() => {
                toast.remove();
                style.remove();
            }, 300);
        }, 3000);
    }

    // Initialize when page loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createButton);
    } else {
        createButton();
    }
    
    // Also handle dynamic content (SPA navigation)
    const observer = new MutationObserver(() => {
        if (!document.getElementById('torn-position-calc-btn')) {
            createButton();
        }
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

})();

