/**
 * SUMANOS PIN-TO-PIN CLIENT SECURITY ENGINE v4.0
 * Protects source code, profile assets, clipboard, and print/capture vectors
 * while preserving native mobile scrolling and portfolio shortcuts (Ctrl+K / `).
 */

(function () {
    "use strict";

    // --- 1. ANTI-CLICKJACKING (FRAME BUSTER) ---
    if (window.top !== window.self) {
        try {
            window.top.location = window.self.location;
        } catch (e) {
            document.body.innerHTML = "<h2 style='color:white;text-align:center;margin-top:20%;font-family:sans-serif;'>Security Error: Framing is not permitted.</h2>";
        }
    }

    // --- 2. INJECT CORE SECURITY STYLES & PRINT LOCKDOWN ---
    function injectSecurityStyles() {
        if (document.getElementById("sumanos-security-styles")) return;
        const style = document.createElement("style");
        style.id = "sumanos-security-styles";
        style.innerHTML = `
            /* Disable text selection & mobile long-press save on non-inputs */
            body, img, a {
                -webkit-user-select: none;
                -moz-user-select: none;
                -ms-user-select: none;
                user-select: none;
                -webkit-touch-callout: none;
            }
            /* Re-enable normal typing & selection inside forms, search, and terminal */
            input, textarea, [contenteditable="true"] {
                -webkit-user-select: text !important;
                -moz-user-select: text !important;
                -ms-user-select: text !important;
                user-select: text !important;
            }
            /* Lock down profile images against drag & pointer extraction */
            #protected-photo, .profile-img, .about-profile-img, img {
                -webkit-user-drag: none;
                user-drag: none;
                transition: filter 0.25s ease, opacity 0.25s ease;
            }
            /* Active Privacy Blur State */
            body.suman-privacy-blur {
                filter: blur(14px) brightness(0.75) !important;
                transition: filter 0.2s ease !important;
            }
            /* Security Toast Notification */
            #suman-sec-toast {
                position: fixed;
                bottom: 24px;
                right: 24px;
                background: rgba(15, 23, 42, 0.92);
                backdrop-filter: blur(16px);
                -webkit-backdrop-filter: blur(16px);
                border: 1px solid rgba(239, 68, 68, 0.45);
                color: #f8fafc;
                padding: 12px 18px;
                border-radius: 14px;
                font-family: 'Poppins', sans-serif;
                font-size: 0.82rem;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 10px;
                box-shadow: 0 15px 35px rgba(0, 0, 0, 0.5), 0 0 20px rgba(239, 68, 68, 0.2);
                z-index: 2147483647;
                opacity: 0;
                visibility: hidden;
                transform: translateY(20px) scale(0.95);
                transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                pointer-events: none;
            }
            #suman-sec-toast.show {
                opacity: 1;
                visibility: visible;
                transform: translateY(0) scale(1);
            }
            #suman-sec-toast .sec-dot {
                width: 9px;
                height: 9px;
                border-radius: 50%;
                background: #ef4444;
                box-shadow: 0 0 10px #ef4444;
                flex-shrink: 0;
            }
            @media (max-width: 600px) {
                #suman-sec-toast {
                    left: 50%;
                    right: auto;
                    bottom: 18px;
                    transform: translate(-50%, 20px) scale(0.95);
                    width: max-content;
                    max-width: 90vw;
                }
                #suman-sec-toast.show {
                    transform: translate(-50%, 0) scale(1);
                }
            }
            /* Block printing even via Browser Menu -> Print / Save as PDF */
            @media print {
                html, body {
                    display: none !important;
                    visibility: hidden !important;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // --- 3. HELPER: CHECK IF ELEMENT IS AN INPUT FIELD ---
    function isEditable(el) {
        if (!el) return false;
        const tag = el.tagName ? el.tagName.toUpperCase() : "";
        return (
            tag === "INPUT" ||
            tag === "TEXTAREA" ||
            el.isContentEditable ||
            Boolean(el.closest && el.closest("input, textarea, [contenteditable='true']"))
        );
    }

    // --- 4. SECURITY TOAST ALERT ---
    let toastTimer = null;
    function showSecurityToast(message) {
        let toast = document.getElementById("suman-sec-toast");
        if (!toast) {
            toast = document.createElement("div");
            toast.id = "suman-sec-toast";
            document.body.appendChild(toast);
        }
        toast.innerHTML = `<span class="sec-dot"></span> <span>🛡️ ${message}</span>`;
        toast.classList.add("show");

        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
            toast.classList.remove("show");
        }, 2400);
    }

    // --- 5. RIGHT-CLICK, DRAG, SELECTION & CLIPBOARD PROTECTION ---
    // Disable right-click context menu (allow inside inputs for normal paste)
    document.addEventListener("contextmenu", (e) => {
        if (isEditable(e.target)) return;
        e.preventDefault();
        showSecurityToast("Right-Click Protected by SumanOS");
    });

    // Disable image & element dragging
    document.addEventListener("dragstart", (e) => {
        e.preventDefault();
    });

    // Disable text selection outside of input/textarea fields
    document.addEventListener("selectstart", (e) => {
        if (isEditable(e.target)) return;
        e.preventDefault();
    });

    // Block unauthorized Ctrl+C / Copy on page content (allows inside inputs)
    document.addEventListener("copy", (e) => {
        if (isEditable(e.target)) return;
        e.preventDefault();
        if (e.clipboardData) {
            e.clipboardData.setData("text/plain", "Protected Portfolio Content — © Suman M");
        }
        showSecurityToast("Content Copying Disabled");
    });

    document.addEventListener("cut", (e) => {
        if (isEditable(e.target)) return;
        e.preventDefault();
    });

    // --- 6. PIN-TO-PIN KEYBOARD & DEVTOOLS SHORTCUT SHIELD ---
    document.addEventListener("keydown", (e) => {
        const key = (e.key || "").toLowerCase();
        const ctrlOrCmd = e.ctrlKey || e.metaKey;
        const shift = e.shiftKey;
        const alt = e.altKey;

        // Allow portfolio built-in shortcuts: Ctrl+K (Command Palette) & ` (SumanOS Terminal)
        if (ctrlOrCmd && key === "k" && !shift && !alt) return;
        if (key === "`" || key === "~") return;

        // 1. Block F12 (DevTools)
        if (e.key === "F12" || e.keyCode === 123) {
            e.preventDefault();
            e.stopPropagation();
            showSecurityToast("Developer Tools Disabled");
            return false;
        }

        // 2. Block Ctrl+Shift+I / J / C (Windows/Linux DevTools) & Cmd+Option+I / J / C / U (macOS DevTools)
        if (
            (ctrlOrCmd && shift && (key === "i" || key === "j" || key === "c")) ||
            (e.metaKey && alt && (key === "i" || key === "j" || key === "c" || key === "u"))
        ) {
            e.preventDefault();
            e.stopPropagation();
            showSecurityToast("Inspector Access Restricted");
            return false;
        }

        // 3. Block Ctrl+U (View Source), Ctrl+S (Save Page), Ctrl+P (Print Page)
        if (ctrlOrCmd && (key === "u" || key === "s" || key === "p")) {
            e.preventDefault();
            e.stopPropagation();
            const actionName = key === "p" ? "Printing" : key === "s" ? "Saving Page" : "Viewing Source";
            showSecurityToast(`${actionName} is Disabled`);
            return false;
        }

        // 4. Detect Screenshot Keys (PrintScreen / Cmd+Shift+3 / Cmd+Shift+4 / Win+Shift+S)
        if (
            e.key === "PrintScreen" ||
            e.keyCode === 44 ||
            (e.metaKey && shift && (key === "3" || key === "4" || key === "5"))
        ) {
            activatePrivacyShield(true);
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText("Screenshots are restricted on this portfolio.").catch(() => {});
            }
            showSecurityToast("Screenshot Protection Triggered");
            setTimeout(() => {
                if (!document.hidden && document.hasFocus()) {
                    activatePrivacyShield(false);
                }
            }, 2500);
        }
    }, true);

    // --- 7. TAB SWITCH, WINDOW BLUR & PHOTO PROTECTION ENGINE ---
    function getProtectedImages() {
        return document.querySelectorAll("#protected-photo, .profile-img, .about-profile-img");
    }

    function activatePrivacyShield(shouldBlur) {
        const images = getProtectedImages();
        if (shouldBlur) {
            document.body.classList.add("suman-privacy-blur");
            images.forEach((img) => {
                img.style.filter = "blur(24px) grayscale(60%)";
            });
        } else {
            document.body.classList.remove("suman-privacy-blur");
            images.forEach((img) => {
                img.style.filter = "none";
            });
        }
    }

    // Blur when switching browser tabs
    document.addEventListener("visibilitychange", () => {
        activatePrivacyShield(document.hidden);
    });

    // Blur when browser window loses focus (e.g. Snipping Tool or Alt+Tab)
    window.addEventListener("blur", () => {
        activatePrivacyShield(true);
    });

    window.addEventListener("focus", () => {
        if (!document.hidden) {
            activatePrivacyShield(false);
        }
    });

    // --- 8. LIVE DEVTOOLS DOCK & CONSOLE DETECTOR (DESKTOP) ---
    function initDevToolsMonitor() {
        // Print Console Security Banner
        try {
            console.log(
                "%c🛡️ SUMANOS SECURITY SHIELD ACTIVE",
                "color: #ef4444; font-size: 22px; font-weight: 800; text-shadow: 0 0 10px rgba(239,68,68,0.4);"
            );
            console.log(
                "%cUnauthorized source inspection, scraping, or automated extraction is strictly prohibited.",
                "color: #94a3b8; font-size: 13px; font-weight: 600;"
            );
        } catch (e) {}

        let devToolsOpen = false;
        setInterval(() => {
            if (window.innerWidth <= 900) return; // Skip on mobile viewports
            const widthDiff = window.outerWidth - window.innerWidth > 170;
            const heightDiff = window.outerHeight - window.innerHeight > 170;

            if (widthDiff || heightDiff) {
                if (!devToolsOpen) {
                    devToolsOpen = true;
                    showSecurityToast("DevTools Detected — Security Active");
                }
            } else {
                devToolsOpen = false;
            }
        }, 1500);
    }

    // --- 9. INITIALIZE ALL SHIELDS ---
    function initSecurity() {
        injectSecurityStyles();
        initDevToolsMonitor();

        // Enforce attributes on all current images
        document.querySelectorAll("img").forEach((img) => {
            img.setAttribute("draggable", "false");
            img.addEventListener("contextmenu", (e) => e.preventDefault());
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initSecurity);
    } else {
        initSecurity();
    }
})();