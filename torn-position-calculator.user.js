// ==UserScript==
// @name         Torn: Supremacy Merit Helper
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Calculate your position relative to the top 5% of the team
// @author       ARCANE [2297468]
// @match        https://www.torn.com/page.php?sid=competition*
// @grant        none
// @updateURL    https://greasyfork.org/scripts/558648/meta.json
// @downloadURL  https://greasyfork.org/scripts/558648/code.user.js
// @license MIT

// ==/UserScript==

(function() {
    'use strict';
    
    console.log('[Supremacy Merit Helper] Script loaded - URL:', window.location.href);

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

    // Get user's team name from localStorage
    function getUserTeamName() {
        return localStorage.getItem('torn-position-user-team-name');
    }

    // Save user's team name to localStorage
    function saveUserTeamName(name) {
        if (name && name.trim()) {
            localStorage.setItem('torn-position-user-team-name', name.trim());
        } else {
            localStorage.removeItem('torn-position-user-team-name');
        }
    }

    // Check if URL is a team page
    function isTeamPage() {
        const hash = window.location.hash;
        return hash && /^#\/team\/\d+/.test(hash);
    }

    // Get current team name from team page
    function getCurrentTeamName() {
        // Try the selector from team header
        const teamHeader = document.querySelector('.teamHeaderWrapper___AHQVJ strong');
        if (teamHeader) {
            const teamName = teamHeader.textContent || teamHeader.innerText;
            if (teamName && teamName.trim()) {
                console.log('[Supremacy Merit Helper] Found current team name:', teamName.trim());
                return teamName.trim();
            }
        }
        console.log('[Supremacy Merit Helper] Could not find current team name');
        return null;
    }

    // Auto-detect user's team name from competition main page
    function autoDetectUserTeamName() {
        // Only try on main competition page
        if (!isCompetitionMainPage()) {
            return null;
        }

        console.log('[Supremacy Merit Helper] Attempting to auto-detect user team name...');

        // First, try the description div with "You have been placed in <strong>Team Name</strong>"
        const descriptionDiv = document.querySelector('.description___OzHl9');
        if (descriptionDiv) {
            const strong = descriptionDiv.querySelector('strong');
            if (strong) {
                const teamName = strong.textContent || strong.innerText;
                if (teamName && teamName.trim()) {
                    console.log('[Supremacy Merit Helper] Found team name in description div strong tag:', teamName.trim());
                    return teamName.trim();
                }
            }
        }

        // Fallback: Find user's team row and try other methods
        let userTeamRow = null;
        userTeamRow = document.querySelector('.dataGridRow___FAAJF.row___jLX1I.yourRow___R9Oi8');
        if (!userTeamRow) {
            userTeamRow = document.querySelector('.yourRow___R9Oi8');
        }
        if (!userTeamRow) {
            const dataGridBody = document.querySelector('.dataGridBody___Y9aVA');
            if (dataGridBody) {
                userTeamRow = dataGridBody.querySelector('.yourRow___R9Oi8');
            }
        }

        if (!userTeamRow) {
            console.log('[Supremacy Merit Helper] Could not find user team row for name detection');
            return null;
        }

        console.log('[Supremacy Merit Helper] Found user team row for name detection');

        // Find team name - typically in the first cell or a name cell
        // Try multiple selectors
        const nameCell = userTeamRow.querySelector('.teamNameCell, [class*="name"], .dataGridData___dV6BM:first-child');
        if (nameCell) {
            const nameText = nameCell.textContent || nameCell.innerText;
            if (nameText && nameText.trim()) {
                console.log('[Supremacy Merit Helper] Found team name in nameCell:', nameText.trim());
                return nameText.trim();
            }
        }

        // Try finding a link or strong tag within the row
        const link = userTeamRow.querySelector('a[href*="/team/"]');
        if (link) {
            const linkText = link.textContent || link.innerText;
            if (linkText && linkText.trim()) {
                console.log('[Supremacy Merit Helper] Found team name in link:', linkText.trim());
                return linkText.trim();
            }
        }

        // Try finding strong tag
        const strong = userTeamRow.querySelector('strong');
        if (strong) {
            const strongText = strong.textContent || strong.innerText;
            if (strongText && strongText.trim()) {
                console.log('[Supremacy Merit Helper] Found team name in strong tag:', strongText.trim());
                return strongText.trim();
            }
        }

        console.log('[Supremacy Merit Helper] Could not find team name');
        return null;
    }

    // Check if URL is the main competition page
    function isCompetitionMainPage() {
        const hash = window.location.hash;
        // Main page can be empty, '#', '#/', or just '/'
        const isMain = !hash || hash === '#' || hash === '' || hash === '#/' || hash === '/';
        console.log('[Supremacy Merit Helper] isCompetitionMainPage check - hash:', hash, 'isMain:', isMain);
        return isMain;
    }

    // Auto-detect team size from competition page
    function autoDetectTeamSize() {
        // Only try on main competition page
        if (!isCompetitionMainPage()) {
            console.log('[Supremacy Merit Helper] Not on competition main page, skipping auto-detect');
            return null;
        }

        console.log('[Supremacy Merit Helper] Attempting to auto-detect team size...');

        // Try multiple approaches to find user's team row
        let userTeamRow = null;
        
        // Approach 1: Try the full selector
        userTeamRow = document.querySelector('.dataGridRow___FAAJF.row___jLX1I.yourRow___R9Oi8');
        if (userTeamRow) {
            console.log('[Supremacy Merit Helper] Found user team row using full selector');
        } else {
            // Approach 2: Try just the yourRow class (more flexible)
            userTeamRow = document.querySelector('.yourRow___R9Oi8');
            if (userTeamRow) {
                console.log('[Supremacy Merit Helper] Found user team row using .yourRow___R9Oi8 selector');
            } else {
                // Approach 3: Try finding within dataGridBody
                const dataGridBody = document.querySelector('.dataGridBody___Y9aVA');
                if (dataGridBody) {
                    userTeamRow = dataGridBody.querySelector('.yourRow___R9Oi8');
                    if (userTeamRow) {
                        console.log('[Supremacy Merit Helper] Found user team row within dataGridBody');
                    }
                }
            }
        }

        if (!userTeamRow) {
            console.log('[Supremacy Merit Helper] Could not find user team row with any selector');
            // Debug: log all rows with yourRow class
            const allYourRows = document.querySelectorAll('.yourRow___R9Oi8');
            console.log('[Supremacy Merit Helper] Found', allYourRows.length, 'elements with .yourRow___R9Oi8 class');
            return null;
        }

        console.log('[Supremacy Merit Helper] Found user team row:', userTeamRow);

        // Find members cell - try multiple approaches
        let membersCell = userTeamRow.querySelector('.membersCell___qpI4n');
        if (!membersCell) {
            // Try finding within the row's children
            const rowChildren = userTeamRow.querySelectorAll('.dataGridData___dV6BM.membersCell___qpI4n');
            if (rowChildren.length > 0) {
                membersCell = rowChildren[0];
                console.log('[Supremacy Merit Helper] Found members cell using alternative selector');
            }
        }

        if (!membersCell) {
            console.log('[Supremacy Merit Helper] Could not find members cell');
            // Debug: log what cells we can find
            const allCells = userTeamRow.querySelectorAll('.dataGridData___dV6BM');
            console.log('[Supremacy Merit Helper] Found', allCells.length, 'dataGridData cells in row');
            return null;
        }

        console.log('[Supremacy Merit Helper] Found members cell:', membersCell);

        // Extract number from the span (e.g., "1,607" -> 1607)
        // Try textContent first, then innerText, then look for span
        let membersText = membersCell.textContent || membersCell.innerText;
        if (!membersText || membersText.trim() === '') {
            // Try finding span within members cell
            const span = membersCell.querySelector('span');
            if (span) {
                membersText = span.textContent || span.innerText;
                console.log('[Supremacy Merit Helper] Found text in span:', membersText);
            }
        }

        if (!membersText || membersText.trim() === '') {
            console.log('[Supremacy Merit Helper] Members cell has no text content');
            console.log('[Supremacy Merit Helper] Members cell HTML:', membersCell.innerHTML);
            return null;
        }

        console.log('[Supremacy Merit Helper] Members text:', membersText);

        // Remove commas and extract number
        const numberMatch = membersText.match(/[\d,]+/);
        if (!numberMatch) {
            console.log('[Supremacy Merit Helper] Could not extract number from members text');
            return null;
        }

        const teamSize = parseInt(numberMatch[0].replace(/,/g, ''), 10);
        if (teamSize && teamSize > 0) {
            console.log('[Supremacy Merit Helper] Identified teamSize:', teamSize);
            return teamSize;
        }

        console.log('[Supremacy Merit Helper] Failed to parse valid team size from:', numberMatch[0]);
        return null;
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

        // Check if we're viewing the user's team
        const userTeamName = getUserTeamName();
        const currentTeamName = getCurrentTeamName();
        
        console.log('[Supremacy Merit Helper] Checking team match - User team:', userTeamName, 'Current team:', currentTeamName);
        
        if (userTeamName && currentTeamName && userTeamName !== currentTeamName) {
            console.log('[Supremacy Merit Helper] Not viewing user\'s team, hiding controls');
            // Remove controls if they exist
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

        // Load saved team size or auto-detect
        let savedTeamSize = getTeamSize();
        console.log('[Supremacy Merit Helper] Loaded saved team size from localStorage:', savedTeamSize);
        if (!savedTeamSize) {
            // Try to auto-detect from competition page
            const detectedSize = autoDetectTeamSize();
            if (detectedSize) {
                savedTeamSize = detectedSize;
                console.log('[Supremacy Merit Helper] Auto-detected and saving teamSize:', detectedSize);
                saveTeamSize(detectedSize);
            }
        }
        if (savedTeamSize) {
            console.log('[Supremacy Merit Helper] Setting input value to teamSize:', savedTeamSize);
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

    // Store collected data
    let collectedData = {
        userRow: null,
        userPosition: null,
        userAttacks: null,
        top5PercentAttacks: null,
        top5PercentPosition: null
    };

    // Check if we have enough data and show toasts
    function checkAndShowToasts() {
        const teamSize = getTeamSize();
        if (!teamSize || teamSize <= 0) {
            return;
        }

        // Check if we have user data
        if (!collectedData.userRow) {
            collectedData.userRow = document.querySelector('.dataGridRow___FAAJF.teamRow___R3ZLF.yourRow___R9Oi8');
            if (collectedData.userRow) {
                const translateY = getTranslateYFromRow(collectedData.userRow);
                if (translateY !== null) {
                    collectedData.userPosition = getPositionFromTranslateY(translateY);
                    collectedData.userAttacks = getAttackCount(collectedData.userRow);
                }
            }
        }

        // Check if we have top 5% data
        if (!collectedData.top5PercentAttacks) {
            const top5PercentPosition = Math.ceil(teamSize * 0.05);
            collectedData.top5PercentPosition = top5PercentPosition;
            
            const allRows = document.querySelectorAll('.dataGridRow___FAAJF.teamRow___R3ZLF');
            for (const row of allRows) {
                const translateY = getTranslateYFromRow(row);
                if (translateY !== null) {
                    const position = getPositionFromTranslateY(translateY);
                    if (position === top5PercentPosition || Math.abs(position - top5PercentPosition) <= 2) {
                        const attacks = getAttackCount(row);
                        if (attacks !== null) {
                            collectedData.top5PercentAttacks = attacks;
                            break;
                        }
                    }
                }
            }
        }

        // Check if we have both user and top 5% data
        const hasAllData = collectedData.userRow && collectedData.userPosition !== null && collectedData.userAttacks !== null && 
                          collectedData.top5PercentAttacks !== null && collectedData.top5PercentPosition !== null;

        // Remove collecting toast if we have all data
        if (hasAllData) {
            const collectingToast = document.getElementById('torn-position-toast');
            if (collectingToast && collectingToast.textContent.includes('Collecting data')) {
                collectingToast.remove();
            }
        }

        // If we have user data, show user toast
        if (collectedData.userRow && collectedData.userPosition !== null && !document.getElementById('torn-position-user-toast')) {
            const teamSize = getTeamSize();
            const messageParts = [];
            
            if (teamSize && teamSize > 0) {
                const percentile = ((collectedData.userPosition / teamSize) * 100).toFixed(2);
                messageParts.push(`Your percentile: ${percentile}%`);
            }
            
            messageParts.push(`Position: ${collectedData.userPosition}`);
            
            if (collectedData.userAttacks !== null) {
                messageParts.push(`Hits: ${collectedData.userAttacks}`);
            }
            
            showUserToast(messageParts.join(' | '));
        }

        // If we have both user and top 5% data, show all toasts
        if (hasAllData) {
            // Show top 5% toast
            const top5PercentPercentile = ((collectedData.top5PercentPosition / teamSize) * 100).toFixed(2);
            showTop5PercentToast(collectedData.top5PercentPosition, collectedData.top5PercentAttacks, top5PercentPercentile);
            
            // Show difference toast
            const difference = collectedData.userAttacks - collectedData.top5PercentAttacks;
            showDifferenceToast(difference, collectedData.userAttacks, collectedData.top5PercentAttacks);
        }
    }



    // Show user info toast
    function showUserToast(message) {
        ensureAnimationStyle();
        
        // Remove existing user toast if any
        const existingToast = document.getElementById('torn-position-user-toast');
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement('div');
        toast.id = 'torn-position-user-toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 95px;
            right: 20px;
            z-index: 999998;
            padding: 15px 25px;
            background-color: #4CAF50;
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

    // Show top 5% info toast
    function showTop5PercentToast(top5PercentPosition, top5PercentAttacks, top5PercentPercentile) {
        ensureAnimationStyle();
        
        // Remove existing top 5% toast if any
        const existingToast = document.getElementById('torn-position-top5-toast');
        if (existingToast) {
            existingToast.remove();
        }

        const message = `5% percentile: ${top5PercentPercentile}% | Position: ${top5PercentPosition} | Hits: ${top5PercentAttacks}`;

        const toast = document.createElement('div');
        toast.id = 'torn-position-top5-toast';
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

    // Show difference/advantage toast
    function showDifferenceToast(difference, userAttacks, top5PercentAttacks) {
        ensureAnimationStyle();
        
        // Remove existing difference toast if any
        const existingToast = document.getElementById('torn-position-difference-toast');
        if (existingToast) {
            existingToast.remove();
        }

        // Calculate delta (how many hits user needs to beat top 5%)
        let delta = 0;
        if (difference > 0) {
            // User already has more hits
            delta = 0;
        } else if (difference < 0) {
            // User needs more hits
            delta = Math.abs(difference) + 1;
        } else {
            // Tied, need 1 more
            delta = 1;
        }
        
        const message = `Delta: ${delta}`;

        const toast = document.createElement('div');
        toast.id = 'torn-position-difference-toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 235px;
            right: 20px;
            z-index: 999996;
            padding: 15px 25px;
            background-color: ${difference > 0 ? '#4CAF50' : '#FF9800'};
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


    // Start passive data collection (no auto-scrolling)
    function startPassiveDataCollection() {
        // Reset collected data
        collectedData = {
            userRow: null,
            userPosition: null,
            userAttacks: null,
            top5PercentAttacks: null,
            top5PercentPosition: null
        };

        showToast('Keep scrolling until you see a popup', 'success');

        // Check immediately
        checkAndShowToasts();

        // Set up MutationObserver to watch for DOM changes (rows appearing as user scrolls)
        const virtualContainer = document.querySelector('.virtualContainer___Ft72x');
        if (virtualContainer) {
            const observer = new MutationObserver(() => {
                checkAndShowToasts();
                
                // Stop observing once we have all data
                if (collectedData.userRow && collectedData.userPosition !== null && 
                    collectedData.userAttacks !== null && collectedData.top5PercentAttacks !== null) {
                    observer.disconnect();
                }
            });
            
            observer.observe(virtualContainer, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['style']
            });
        }

        // Also set up periodic checking as backup (passive - only reads data, doesn't scroll)
        const checkInterval = setInterval(() => {
            checkAndShowToasts();
            
            // Stop checking once we have all data
            if (collectedData.userRow && collectedData.userPosition !== null && 
                collectedData.userAttacks !== null && collectedData.top5PercentAttacks !== null) {
                clearInterval(checkInterval);
            }
        }, 1000); // Check every 1 second as backup
    }

    // Calculate position
    function calculatePosition() {
        // Check if on team page
        if (!isTeamPage()) {
            showToast('Please navigate to a team page to calculate position.', 'error');
            return;
        }

        // Start passive data collection (no auto-scrolling)
        startPassiveDataCollection();
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
        console.log('[Supremacy Merit Helper] checkAndUpdateControls called - URL:', window.location.href, 'Hash:', window.location.hash);
        
        if (isTeamPage()) {
            console.log('[Supremacy Merit Helper] On team page, creating controls');
            createControls();
        } else {
            console.log('[Supremacy Merit Helper] Not on team page, removing controls if they exist');
            const existing = document.getElementById('torn-position-controls');
            if (existing) {
                existing.remove();
            }
        }
        
        // Auto-detect team size on competition main page
        if (isCompetitionMainPage()) {
            console.log('[Supremacy Merit Helper] On competition main page, attempting auto-detect');
            // Helper function to handle detected team size and team name
            const handleDetectedTeamSize = (detectedSize) => {
                // Save if not already saved
                const currentSaved = getTeamSize();
                if (!currentSaved || currentSaved !== detectedSize) {
                    console.log('[Supremacy Merit Helper] Saving teamSize to localStorage:', detectedSize);
                    saveTeamSize(detectedSize);
                } else {
                    console.log('[Supremacy Merit Helper] Team size already saved:', currentSaved);
                }
                // Update input if it exists (user might be on team page after visiting main page)
                const input = document.getElementById('torn-position-team-size-input');
                if (input && !input.value) {
                    console.log('[Supremacy Merit Helper] Updating input field with teamSize:', detectedSize);
                    input.value = detectedSize;
                }
                
                // Also detect and save team name
                const detectedTeamName = autoDetectUserTeamName();
                if (detectedTeamName) {
                    console.log('[Supremacy Merit Helper] Detected user team name:', detectedTeamName);
                    saveUserTeamName(detectedTeamName);
                } else {
                    console.log('[Supremacy Merit Helper] Could not detect user team name');
                }
            };
            
            // Try immediate detection
            let detectedSize = autoDetectTeamSize();
            
            if (detectedSize) {
                handleDetectedTeamSize(detectedSize);
            } else {
                // If not found, retry with delays (content might be loading)
                console.log('[Supremacy Merit Helper] Retrying team size detection with delays...');
                setTimeout(() => {
                    detectedSize = autoDetectTeamSize();
                    if (detectedSize) {
                        handleDetectedTeamSize(detectedSize);
                    } else {
                        setTimeout(() => {
                            detectedSize = autoDetectTeamSize();
                            if (detectedSize) {
                                handleDetectedTeamSize(detectedSize);
                            } else {
                                console.log('[Supremacy Merit Helper] Could not detect team size after retries');
                            }
                        }, 1000);
                    }
                }, 500);
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
    window.addEventListener('hashchange', () => {
        console.log('[Supremacy Merit Helper] Hash changed, calling checkAndUpdateControls');
        checkAndUpdateControls();
    });
    
    // Also handle dynamic content (SPA navigation) - throttled
    let mutationTimeout = null;
    const observer = new MutationObserver(() => {
        // Throttle to avoid excessive calls
        if (mutationTimeout) {
            clearTimeout(mutationTimeout);
        }
        mutationTimeout = setTimeout(() => {
            console.log('[Supremacy Merit Helper] DOM mutation detected, calling checkAndUpdateControls');
            checkAndUpdateControls();
        }, 300);
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

})();