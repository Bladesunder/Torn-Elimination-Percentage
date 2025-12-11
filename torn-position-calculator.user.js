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

    // Get attack count from a row
    function getAttackCount(row) {
        const attackElement = row.querySelector('.attacks___IJtzw span');
        if (attackElement) {
            return parseInt(attackElement.textContent.trim(), 10);
        }
        return null;
    }

    // Get position from translateY
    function getPositionFromTranslateY(translateY) {
        return Math.floor(translateY / 36) + 1;
    }

    // Get translateY from row
    function getTranslateYFromRow(row) {
        const style = window.getComputedStyle(row);
        const transform = style.transform || style.webkitTransform || style.mozTransform;
        
        if (!transform || transform === 'none') {
            const inlineStyle = row.getAttribute('style');
            const translateYMatch = inlineStyle ? inlineStyle.match(/translateY\((\d+)px\)/) : null;
            if (translateYMatch) {
                return parseInt(translateYMatch[1], 10);
            }
            return null;
        }
        
        let translateY = 0;
        
        if (transform.includes('matrix') || transform.includes('matrix3d')) {
            const matrixMatch = transform.match(/matrix(?:3d)?\([^)]+\)/);
            if (matrixMatch) {
                const values = matrixMatch[0].match(/[\d.]+/g);
                if (values && values.length >= 6) {
                    translateY = parseFloat(values[values.length >= 14 ? 13 : 5]);
                }
            }
        } else if (transform.includes('translateY')) {
            const translateYMatch = transform.match(/translateY\(([^)]+)\)/);
            if (translateYMatch) {
                translateY = parseFloat(translateYMatch[1]);
            }
        }
        
        if (translateY === 0 && !transform.includes('translateY')) {
            const inlineStyle = row.getAttribute('style');
            const translateYMatch = inlineStyle ? inlineStyle.match(/translateY\((\d+)px\)/) : null;
            if (translateYMatch) {
                translateY = parseInt(translateYMatch[1], 10);
            } else {
                return null;
            }
        }
        
        return translateY;
    }

    // Store active scroll interval for cancellation
    let activeScrollInterval = null;
    let activeScrollCallbacks = null;

    // Cancel active scrolling
    function cancelActiveScrolling() {
        if (activeScrollInterval) {
            clearInterval(activeScrollInterval);
            activeScrollInterval = null;
            
            // Remove event listeners if they exist
            if (activeScrollCallbacks && activeScrollCallbacks.cancelHandler) {
                window.removeEventListener('keydown', activeScrollCallbacks.cancelHandler);
            }
            
            activeScrollCallbacks = null;
            showToast('Auto-scroll cancelled by user interaction.', 'error');
        }
    }


    // Calculate and show percentile stats
    function calculatePercentileStats(userRow, userPosition, userAttacks, top5PercentAttacks) {
        const teamSize = getTeamSize();
        if (!teamSize || teamSize <= 0) {
            return; // Can't calculate without team size
        }

        // Calculate hits needed to beat top 5%
        let hitsNeeded = null;
        if (top5PercentAttacks !== null && userAttacks !== null) {
            // Calculate how many more hits needed to beat the person at top 5% position
            // We need to have more attacks than them to beat them
            hitsNeeded = Math.max(0, top5PercentAttacks - userAttacks + 1);
        }

        // Show stats toast
        showStatsToast(hitsNeeded, top5PercentAttacks);
    }

    // Show stats toast (hits needed to beat top 5%, top 5% attacks)
    function showStatsToast(hitsNeeded, top5PercentAttacks) {
        ensureAnimationStyle();
        
        // Remove existing stats toast if any
        const existingToast = document.getElementById('torn-position-stats-toast');
        if (existingToast) {
            existingToast.remove();
        }

        let message = '';
        if (hitsNeeded !== null) {
            message += `Hits needed to beat top 5%: ${hitsNeeded}`;
        }
        if (top5PercentAttacks !== null) {
            if (message) message += ' | ';
            message += `Top 5% attacks: ${top5PercentAttacks}`;
        }

        if (!message) {
            return; // No data to show
        }

        const toast = document.createElement('div');
        toast.id = 'torn-position-stats-toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 165px;
            right: 20px;
            z-index: 999997;
            padding: 15px 25px;
            background-color: #2196F3;
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
        
        document.body.appendChild(toast);
    }

    // Calculate position from found row
    function calculatePositionFromRow(userRow, top5PercentAttacks = null) {
        // Get translateY and position
        const translateY = getTranslateYFromRow(userRow);
        if (translateY === null) {
            showToast('Could not find translateY value.', 'error');
            return;
        }
        
        const position = getPositionFromTranslateY(translateY);
        
        // Get user's attack count
        const userAttacks = getAttackCount(userRow);
        
        // Get team size and calculate percentile if available
        const teamSize = getTeamSize();
        let message = `Position: ${position}`;
        
        if (teamSize && teamSize > 0) {
            const percentile = ((position / teamSize) * 100).toFixed(2);
            message += ` | Percentile: ${percentile}%`;
        }
        
        showToast(message, 'success');
        
        // Calculate and show percentile stats if we have team size and user attacks
        if (teamSize && teamSize > 0 && userAttacks !== null) {
            calculatePercentileStats(userRow, position, userAttacks, top5PercentAttacks);
        }
    }

    // Scroll and search for user's row and top 5% position
    function scrollAndFindRow() {
        // Cancel any existing scroll
        cancelActiveScrolling();

        const virtualContainer = document.querySelector('.virtualContainer___Ft72x');
        if (!virtualContainer) {
            showToast('Could not find the competition list container.', 'error');
            return;
        }

        const teamSize = getTeamSize();
        const top5PercentPosition = teamSize ? Math.ceil(teamSize * 0.05) : null;

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

        // Set up cancellation listeners
        const cancelHandler = () => {
            cancelActiveScrolling();
            window.removeEventListener('keydown', cancelHandler);
        };
        
        window.addEventListener('keydown', cancelHandler);

        let scrollPosition = 0;
        const scrollStep = 300; // Scroll 300px at a time
        const maxScrollAttempts = 150; // Maximum number of scroll attempts
        let attempts = 0;
        let userRow = null;
        let top5PercentAttacks = null;

        showToast('Scrolling to find your row and top 5% data...', 'success');

        activeScrollCallbacks = { cancelHandler, scrollableElement };

        activeScrollInterval = setInterval(() => {
            if (!activeScrollInterval) {
                return; // Was cancelled
            }

            attempts++;
            
            // Check if user row exists now
            if (!userRow) {
                userRow = document.querySelector('.dataGridRow___FAAJF.teamRow___R3ZLF.yourRow___R9Oi8');
            }

            // Check if we can find top 5% position (usually at the top, but check anyway)
            if (!top5PercentAttacks && top5PercentPosition) {
                const allRows = document.querySelectorAll('.dataGridRow___FAAJF.teamRow___R3ZLF');
                for (const row of allRows) {
                    const translateY = getTranslateYFromRow(row);
                    if (translateY !== null) {
                        const position = getPositionFromTranslateY(translateY);
                        if (position === top5PercentPosition || Math.abs(position - top5PercentPosition) <= 2) {
                            const attacks = getAttackCount(row);
                            if (attacks !== null) {
                                top5PercentAttacks = attacks;
                                break;
                            }
                        }
                    }
                }
            }

            // If we found both, we're done
            if (userRow && (top5PercentAttacks !== null || !top5PercentPosition)) {
                clearInterval(activeScrollInterval);
                activeScrollInterval = null;
                
                // Remove cancellation listeners
                window.removeEventListener('keydown', cancelHandler);
                activeScrollCallbacks = null;
                
                // Scroll back to top
                if (scrollableElement === window) {
                    window.scrollTo({ top: 0, behavior: 'auto' });
                } else {
                    scrollableElement.scrollTop = 0;
                }
                
                // Small delay to ensure row is fully rendered
                setTimeout(() => {
                    calculatePositionFromRow(userRow, top5PercentAttacks);
                }, 150);
                return;
            }

            // If we've tried too many times, give up
            if (attempts >= maxScrollAttempts) {
                clearInterval(activeScrollInterval);
                activeScrollInterval = null;
                
                // Remove cancellation listeners
                window.removeEventListener('keydown', cancelHandler);
                activeScrollCallbacks = null;
                
                if (userRow) {
                    // We found user but not top 5%, continue with what we have
                    if (scrollableElement === window) {
                        window.scrollTo({ top: 0, behavior: 'auto' });
                    } else {
                        scrollableElement.scrollTop = 0;
                    }
                    setTimeout(() => {
                        calculatePositionFromRow(userRow, top5PercentAttacks);
                    }, 150);
                } else {
                    showToast('Could not find your row after scrolling. You may not be in the competition.', 'error');
                }
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
        
        // Try to find top 5% data in visible rows (top rows are usually visible)
        const teamSize = getTeamSize();
        let top5PercentAttacks = null;
        if (teamSize && teamSize > 0) {
            const top5PercentPosition = Math.ceil(teamSize * 0.05);
            const allRows = document.querySelectorAll('.dataGridRow___FAAJF.teamRow___R3ZLF');
            for (const row of allRows) {
                const translateY = getTranslateYFromRow(row);
                if (translateY !== null) {
                    const position = getPositionFromTranslateY(translateY);
                    if (position === top5PercentPosition || Math.abs(position - top5PercentPosition) <= 2) {
                        const attacks = getAttackCount(row);
                        if (attacks !== null) {
                            top5PercentAttacks = attacks;
                            break;
                        }
                    }
                }
            }
        }
        
        calculatePositionFromRow(userRow, top5PercentAttacks);
    }

    // Ensure animation style is added (only once)
    function ensureAnimationStyle() {
        if (!document.getElementById('torn-toast-animation-style')) {
            const style = document.createElement('style');
            style.id = 'torn-toast-animation-style';
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
        }
    }

    // Show toast notification
    function showToast(message, type = 'success') {
        ensureAnimationStyle();
        
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

