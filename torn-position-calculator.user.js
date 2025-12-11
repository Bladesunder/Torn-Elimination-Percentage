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

    // Get team size from localStorage
    function getTeamSize() {
        const saved = localStorage.getItem('torn-position-team-size');
        return saved ? parseInt(saved, 10) : null;
    }

    // Save team size to localStorage
    function saveTeamSize(size) {
        if (size && size > 0) {
            localStorage.setItem('torn-position-team-size', size.toString());
        } else {
            localStorage.removeItem('torn-position-team-size');
        }
    }

    // Check if URL is a team page
    function isTeamPage() {
        const hash = window.location.hash;
        return hash && /^#\/team\/\d+/.test(hash);
    }

    // Create floating controls (input + button)
    function createControls() {
        // Only show if on a team page
        if (!isTeamPage()) {
            // Remove controls if they exist but we're not on a team page
            const existing = document.getElementById('torn-position-controls');
            if (existing) {
                existing.remove();
            }
            return;
        }

        // Check if already exists
        if (document.getElementById('torn-position-controls')) {
            return;
        }

        const container = document.createElement('div');
        container.id = 'torn-position-controls';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 999999;
            display: flex;
            align-items: center;
            gap: 10px;
            background-color: rgba(0, 0, 0, 0.8);
            padding: 10px 15px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        `;

        // Create label and input for team size
        const label = document.createElement('label');
        label.textContent = 'Team Size:';
        label.style.cssText = `
            color: white;
            font-size: 14px;
            font-weight: bold;
        `;

        const input = document.createElement('input');
        input.type = 'number';
        input.id = 'torn-position-team-size-input';
        input.placeholder = 'Enter team size';
        input.min = '1';
        input.style.cssText = `
            width: 130px;
            padding: 10px 14px;
            border: 2px solid #4CAF50;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            background-color: white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        `;

        // Load saved team size
        const savedTeamSize = getTeamSize();
        if (savedTeamSize) {
            input.value = savedTeamSize;
        }

        // Save on blur (when user leaves the input)
        input.addEventListener('blur', () => {
            const value = parseInt(input.value, 10);
            if (value && value > 0) {
                saveTeamSize(value);
            } else if (input.value === '') {
                saveTeamSize(null);
            }
        });

        // Also save on Enter key
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                input.blur();
            }
        });

        const button = document.createElement('button');
        button.textContent = 'Calculate';
        button.id = 'torn-position-calc-btn';
        button.style.cssText = `
            padding: 12px 24px;
            background-color: #4CAF50;
            color: white;
            border: 2px solid #45a049;
            border-radius: 6px;
            cursor: pointer;
            font-size: 15px;
            font-weight: bold;
            box-shadow: 0 3px 8px rgba(0,0,0,0.4);
            transition: all 0.2s ease;
        `;
        
        button.addEventListener('mouseenter', () => {
            button.style.backgroundColor = '#45a049';
            button.style.transform = 'scale(1.05)';
            button.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.backgroundColor = '#4CAF50';
            button.style.transform = 'scale(1)';
            button.style.boxShadow = '0 3px 8px rgba(0,0,0,0.4)';
        });
        
        button.addEventListener('click', calculatePosition);

        container.appendChild(label);
        container.appendChild(input);
        container.appendChild(button);
        
        document.body.appendChild(container);
    }

    // Calculate position from found row
    function calculatePositionFromRow(userRow) {
        // Get transform style
        const style = window.getComputedStyle(userRow);
        const transform = style.transform || style.webkitTransform || style.mozTransform;
        
        let translateY = 0;
        
        if (!transform || transform === 'none') {
            // Try inline style as fallback
            const inlineStyle = userRow.getAttribute('style');
            const translateYMatch = inlineStyle ? inlineStyle.match(/translateY\((\d+)px\)/) : null;
            
            if (!translateYMatch) {
                showToast('Could not find translateY value.', 'error');
                return;
            }
            
            translateY = parseInt(translateYMatch[1], 10);
        } else {
            // Extract translateY from matrix or translate
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
        }
        
        // Calculate position: translateY / 36 + 1
        const position = Math.floor(translateY / 36) + 1;
        
        // Get team size and calculate percentile if available
        const teamSize = getTeamSize();
        let message = `Position: ${position}`;
        
        if (teamSize && teamSize > 0) {
            const percentile = ((position / teamSize) * 100).toFixed(2);
            message += ` | Percentile: ${percentile}%`;
        }
        
        showToast(message, 'success');
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
        // Check if on team page
        if (!isTeamPage()) {
            showToast('Please navigate to a team page to calculate position.', 'error');
            return;
        }

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
            top: 95px;
            right: 20px;
            z-index: 999998;
            padding: 15px 25px;
            background-color: ${type === 'error' ? '#f44336' : '#4CAF50'};
            color: white;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            font-size: 14px;
            font-weight: bold;
            animation: slideIn 0.3s ease-out;
            max-width: 350px;
            cursor: pointer;
            transition: opacity 0.2s ease;
        `;
        
        // Add click handler to dismiss toast
        toast.addEventListener('click', () => {
            toast.style.opacity = '0';
            setTimeout(() => {
                toast.remove();
            }, 200);
        });
        
        toast.addEventListener('mouseenter', () => {
            toast.style.opacity = '0.9';
        });
        
        toast.addEventListener('mouseleave', () => {
            toast.style.opacity = '1';
        });
        
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
        
        // Toast is now persistent - only removed on click or page refresh
    }

    // Function to check and update controls based on URL
    function checkAndUpdateControls() {
        if (isTeamPage()) {
            createControls();
        } else {
            const existing = document.getElementById('torn-position-controls');
            if (existing) {
                existing.remove();
            }
        }
    }

    // Initialize when page loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkAndUpdateControls);
    } else {
        checkAndUpdateControls();
    }
    
    // Handle hash changes (SPA navigation)
    window.addEventListener('hashchange', checkAndUpdateControls);
    
    // Also handle dynamic content (SPA navigation)
    const observer = new MutationObserver(() => {
        checkAndUpdateControls();
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

})();

