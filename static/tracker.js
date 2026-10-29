/**
 * SUMANOS DEEP HARDWARE, OS & NETWORK RADAR ENGINE v5.1
 * Zero external browser API calls (eliminates 429 Console & AdBlocker errors).
 * Hardware, GPU, OS, Screen & Network Speed are probed locally; ISP & Geo are resolved & cached by Flask.
 */

(function () {
    "use strict";

    // --- 1. EXTRACT REAL GPU RENDERER VIA WEBGL ---
    function getGPUInfo() {
        try {
            const canvas = document.createElement("canvas");
            const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
            if (!gl) return "";
            const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
            if (!debugInfo) return "";
            const raw = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || "";
            const angleMatch = raw.match(/ANGLE \([^,]+,\s*([^,]+),/i);
            if (angleMatch && angleMatch[1]) return angleMatch[1].trim();
            return raw.replace(/ANGLE \((.+)\)/i, "$1").split(",")[0].trim();
        } catch (e) {
            return "";
        }
    }

    // --- 2. IDENTIFY APPLE iPHONE MODELS BY SCREEN VIEWPORT + PIXEL RATIO ---
    function detectiPhoneModel() {
        const w = Math.min(window.screen.width, window.screen.height);
        const h = Math.max(window.screen.width, window.screen.height);
        const dpr = Math.round(window.devicePixelRatio || 1);
        const sig = `${w}x${h}@${dpr}`;

        const iphoneMap = {
            "440x956@3": "Apple iPhone 16 Pro Max",
            "402x874@3": "Apple iPhone 16 Pro",
            "430x932@3": "Apple iPhone 15/16 Plus / 14-15 Pro Max",
            "393x852@3": "Apple iPhone 15/16 / 14-15 Pro",
            "428x926@3": "Apple iPhone 12/13 Pro Max / 14 Plus",
            "390x844@3": "Apple iPhone 12/13/14 / Pro",
            "414x896@3": "Apple iPhone XS Max / 11 Pro Max",
            "414x896@2": "Apple iPhone XR / 11",
            "375x812@3": "Apple iPhone X / XS / 11 Pro / 12-13 Mini",
            "414x736@3": "Apple iPhone 6+/7+/8+ Plus",
            "375x667@2": "Apple iPhone SE / 6 / 7 / 8",
            "320x568@2": "Apple iPhone SE (1st Gen) / 5s"
        };
        return iphoneMap[sig] || `Apple iPhone (${w}x${h} @${dpr}x)`;
    }

    // --- 3. MAP ANDROID OEM MODEL CODES TO COMMERCIAL NAMES ---
    function mapAndroidModel(rawModel) {
        if (!rawModel) return "";
        const m = rawModel.trim();
        const upper = m.toUpperCase();

        if (upper === "K" || upper === "GENERIC" || upper === "UNKNOWN") return "";

        // Nothing & CMF Phones
        if (upper.includes("A063")) return "Nothing Phone (1)";
        if (upper.includes("A065")) return "Nothing Phone (2)";
        if (upper.includes("A142P")) return "Nothing Phone (2a) Plus";
        if (upper.includes("A142")) return "Nothing Phone (2a)";
        if (upper.includes("A059")) return "Nothing Phone (3a)";
        if (upper.includes("A015")) return "CMF Phone 1";

        // Samsung Galaxy Series
        if (upper.startsWith("SM-")) {
            if (upper.startsWith("SM-S93")) return `Samsung Galaxy S25 (${m})`;
            if (upper.startsWith("SM-S92")) return `Samsung Galaxy S24 (${m})`;
            if (upper.startsWith("SM-S91")) return `Samsung Galaxy S23 (${m})`;
            if (upper.startsWith("SM-S90")) return `Samsung Galaxy S22 (${m})`;
            if (upper.startsWith("SM-G99")) return `Samsung Galaxy S21 (${m})`;
            if (upper.startsWith("SM-F9")) return `Samsung Galaxy Z Fold (${m})`;
            if (upper.startsWith("SM-F7")) return `Samsung Galaxy Z Flip (${m})`;
            if (upper.startsWith("SM-A")) return `Samsung Galaxy A-Series (${m})`;
            if (upper.startsWith("SM-M")) return `Samsung Galaxy M-Series (${m})`;
            if (upper.startsWith("SM-E")) return `Samsung Galaxy F-Series (${m})`;
            return `Samsung Galaxy (${m})`;
        }

        // Google Pixel
        if (upper.includes("PIXEL")) return `Google ${m}`;

        // OnePlus & OPPO
        if (upper.startsWith("ONEPLUS") || upper.startsWith("LE2") || upper.startsWith("NE2") || upper.startsWith("PJZ")) {
            return upper.includes("ONEPLUS") ? m : `OnePlus (${m})`;
        }
        if (upper.startsWith("CPH")) return `OnePlus / OPPO (${m})`;

        // Vivo & iQOO
        if (upper.startsWith("I2") || upper.includes("IQOO")) return `iQOO (${m})`;
        if (upper.startsWith("V2")) return `Vivo (${m})`;

        // Realme
        if (upper.startsWith("RMX")) return `Realme (${m})`;

        // Xiaomi / Redmi / POCO
        if (/^(21|22|23|24|25)[0-9]{4}[A-Z0-9]+$/i.test(m) || upper.startsWith("M20") || upper.startsWith("M21")) {
            return `Xiaomi / Redmi / POCO (${m})`;
        }
        if (upper.includes("REDMI") || upper.includes("POCO") || upper.includes("XIAOMI")) return m;

        // Motorola & Infinix
        if (upper.startsWith("MOTO") || upper.startsWith("XT")) return `Motorola (${m})`;
        if (upper.startsWith("X6")) return `Infinix (${m})`;

        return m;
    }

    // --- 4. CAPTURE NETWORK SPEED, CONNECTION TYPE & LATENCY ---
    function getNetworkTelemetry() {
        const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (!conn) {
            return {
                net_type: navigator.onLine ? "Online" : "Offline",
                net_speed: "Auto"
            };
        }

        const rawType = (conn.type || "").toLowerCase();
        const effType = (conn.effectiveType || "").toUpperCase();
        let label = effType || "Broadband";

        if (rawType === "wifi") label = effType ? `Wi-Fi (${effType})` : "Wi-Fi";
        else if (rawType === "cellular") label = effType ? `Cellular (${effType})` : "Mobile Data";
        else if (rawType === "ethernet") label = "Ethernet LAN";
        else if (effType === "4G") label = "4G / 5G / Wi-Fi";

        const speed = typeof conn.downlink === "number" && conn.downlink > 0 ? `${conn.downlink} Mbps` : "Auto";
        const rtt = typeof conn.rtt === "number" && conn.rtt > 0 ? `${conn.rtt} ms` : "";

        return {
            net_type: label,
            net_speed: rtt ? `${speed} (${rtt})` : speed
        };
    }

    // --- 5. MAIN HARDWARE, OS & NETWORK TELEMETRY COLLECTOR ---
    async function getRealDeviceData() {
        const rawUA = navigator.userAgent || "";
        const ua = rawUA.toLowerCase();
        const gpu = getGPUInfo();
        const dpr = Math.round((window.devicePixelRatio || 1) * 10) / 10;
        const screenRes = `${window.screen.width}x${window.screen.height} @${dpr}x`;
        const timezone = (Intl && Intl.DateTimeFormat && Intl.DateTimeFormat().resolvedOptions().timeZone) || "UTC";
        const language = navigator.language || navigator.userLanguage || "en";
        const cores = navigator.hardwareConcurrency ? `${navigator.hardwareConcurrency} Cores` : "";
        const ram = navigator.deviceMemory ? `${navigator.deviceMemory}GB RAM` : "";
        const hwSpecs = [cores, ram].filter(Boolean).join(" • ");

        let os = "Unknown OS";
        let browser = "Unknown Browser";
        let device = "";
        let type = "Desktop";

        // A. Detect Browser
        if (ua.includes("instagram")) browser = "Instagram App";
        else if (ua.includes("whatsapp") || ua.includes("wa_")) browser = "WhatsApp App";
        else if (ua.includes("fban") || ua.includes("fbav")) browser = "Facebook App";
        else if (ua.includes("linkedinapp")) browser = "LinkedIn App";
        else if (navigator.brave && (await navigator.brave.isBrave().catch(() => false))) browser = "Brave";
        else if (ua.includes("samsungbrowser/")) {
            const v = rawUA.match(/SamsungBrowser\/([\d.]+)/i);
            browser = v ? `Samsung Internet ${v[1].split(".")[0]}` : "Samsung Internet";
        } else if (ua.includes("edg/") || ua.includes("edga/") || ua.includes("edgios/")) {
            const v = rawUA.match(/Edg[a-zA-Z]*\/([\d.]+)/i);
            browser = v ? `Edge ${v[1].split(".")[0]}` : "Edge";
        } else if (ua.includes("opr/") || ua.includes("opera") || ua.includes("opt/")) {
            browser = "Opera";
        } else if (ua.includes("crios/")) {
            const v = rawUA.match(/CriOS\/([\d.]+)/i);
            browser = v ? `Chrome iOS ${v[1].split(".")[0]}` : "Chrome (iOS)";
        } else if (ua.includes("fxios/") || ua.includes("firefox/")) {
            const v = rawUA.match(/(?:Firefox|FxiOS)\/([\d.]+)/i);
            browser = v ? `Firefox ${v[1].split(".")[0]}` : "Firefox";
        } else if (ua.includes("chrome/") && !ua.includes("edg/")) {
            const v = rawUA.match(/Chrome\/([\d.]+)/i);
            browser = v ? `Chrome ${v[1].split(".")[0]}` : "Chrome";
        } else if (ua.includes("safari/") && !ua.includes("chrome")) {
            const v = rawUA.match(/Version\/([\d.]+)/i);
            browser = v ? `Safari ${v[1]}` : "Safari";
        }

        // B. Detect Mobile / Tablet / Desktop Form Factor
        const maxTouch = navigator.maxTouchPoints || 0;
        const smallestSide = Math.min(window.screen.width, window.screen.height);
        const isIPadOS = navigator.platform === "MacIntel" && maxTouch > 1 && smallestSide >= 600;
        const isMobileScreenWithTouch = maxTouch > 1 && smallestSide < 600;

        if (isIPadOS || /ipad|tablet|playbook|silk/i.test(rawUA)) {
            type = "Tablet";
        } else if (
            isMobileScreenWithTouch ||
            /Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Opera M(obi|ini)/i.test(rawUA) ||
            (navigator.userAgentData && navigator.userAgentData.mobile)
        ) {
            type = "Mobile";
        } else {
            type = "Desktop";
        }

        // C. High-Entropy Client Hints
        if (navigator.userAgentData && typeof navigator.userAgentData.getHighEntropyValues === "function") {
            try {
                const hints = await navigator.userAgentData.getHighEntropyValues([
                    "platform",
                    "platformVersion",
                    "model",
                    "architecture"
                ]);

                if (hints.platform === "Android") {
                    type = "Mobile";
                    const ver = hints.platformVersion ? hints.platformVersion.split(".")[0] : "";
                    os = ver && ver !== "0" ? `Android ${ver}` : "Android";
                } else if (hints.platform === "Windows") {
                    const major = parseInt((hints.platformVersion || "0").split(".")[0], 10);
                    os = major >= 13 ? "Windows 11" : major > 0 ? "Windows 10" : "Windows";
                } else if (hints.platform === "macOS") {
                    const ver = hints.platformVersion ? hints.platformVersion.split(".")[0] : "";
                    os = ver ? `macOS ${ver}` : "macOS";
                } else if (hints.platform === "iOS") {
                    type = "Mobile";
                    os = hints.platformVersion ? `iOS ${hints.platformVersion}` : "iOS";
                } else if (hints.platform) {
                    os = hints.platform;
                }

                if (hints.model && hints.model.trim() !== "") {
                    device = mapAndroidModel(hints.model);
                }
            } catch (e) {}
        }

        // D. Deep User-Agent + WebGL GPU + Screen Fallback
        if (/iphone/i.test(rawUA) || (type === "Mobile" && /Apple GPU/i.test(gpu))) {
            type = "Mobile";
            const iosMatch = rawUA.match(/OS (\d+[_\d]*)/i);
            if (os === "Unknown OS" || os === "macOS") {
                os = iosMatch ? `iOS ${iosMatch[1].replace(/_/g, ".")}` : "iOS";
            }
            if (!device) device = detectiPhoneModel();
        } else if (/ipad/i.test(rawUA) || isIPadOS) {
            type = "Tablet";
            const iosMatch = rawUA.match(/OS (\d+[_\d]*)/i);
            os = iosMatch ? `iPadOS ${iosMatch[1].replace(/_/g, ".")}` : "iPadOS";
            if (!device) device = `Apple iPad (${window.screen.width}x${window.screen.height})`;
        } else if (/android/i.test(rawUA) || (type === "Mobile" && /Adreno|Mali|PowerVR/i.test(gpu))) {
            type = "Mobile";
            if (os === "Unknown OS" || os === "Linux") {
                const andMatch = rawUA.match(/Android\s+([\d.]+)/i);
                os = andMatch ? `Android ${andMatch[1]}` : "Android";
            }
            if (!device) {
                const buildMatch = rawUA.match(/Android[^;]+;\s*([^;)]+?)(?:\s+Build\/|;\s*wv|\))/i);
                if (buildMatch && buildMatch[1]) {
                    device = mapAndroidModel(buildMatch[1]);
                }
            }
            if (!device) {
                device = gpu
                    ? `Android Smartphone (${gpu})`
                    : `Android Smartphone (${window.screen.width}x${window.screen.height})`;
            }
        } else if (/macintosh|mac os x/i.test(rawUA)) {
            type = "Desktop";
            if (os === "Unknown OS") {
                const macMatch = rawUA.match(/Mac OS X (\d+[._]\d+)/i);
                os = macMatch ? `macOS ${macMatch[1].replace(/_/g, ".")}` : "macOS";
            }
            if (!device) {
                const mChip = gpu.match(/Apple M\d+(?:\s+(?:Pro|Max|Ultra))?/i);
                device = mChip ? `Apple Mac (${mChip[0]})` : "Apple Mac";
            }
        } else if (/windows nt/i.test(rawUA)) {
            type = "Desktop";
            if (os === "Unknown OS") os = "Windows 10/11";
            if (!device) {
                device = gpu ? `Windows PC (${gpu})` : "Windows PC";
            }
        } else if (/linux/i.test(rawUA)) {
            if (os === "Unknown OS") os = "Linux";
            if (!device) device = gpu ? `Linux System (${gpu})` : "Linux System";
        }

        if (!device) device = type === "Mobile" ? "Mobile Smartphone" : "Desktop / PC";

        const netInfo = getNetworkTelemetry();

        return {
            os,
            browser,
            device,
            type,
            gpu: gpu || "Standard GPU",
            hw_specs: hwSpecs,
            screen: screenRes,
            timezone,
            language,
            net_type: netInfo.net_type,
            net_speed: netInfo.net_speed,
            isp: sessionStorage.getItem("suman_isp") || "Resolved by Server",
            location: sessionStorage.getItem("suman_loc") || "Resolved by Server"
        };
    }

    window.getSumanRealDeviceTelemetry = getRealDeviceData;

    function sendTelemetry() {
        // Do not auto-log when viewing the secret admin page (Admin has a manual Test button)
        if (window.location.pathname.includes("/suman/") || window.location.pathname.includes("/admin")) {
            return;
        }

        const ua = (navigator.userAgent || "").toLowerCase();
        const isBot = /bot|crawl|spider|slurp|googlebot|bingbot|yandex|headlesschrome|lighthouse/i.test(ua);
        if (isBot) return;

        getRealDeviceData()
            .then((payload) => {
                return fetch("/log_visitor", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                    keepalive: true
                });
            })
            .then((res) => (res && res.ok ? res.json() : null))
            .then((data) => {
                if (data && data.isp) sessionStorage.setItem("suman_isp", data.isp);
                if (data && data.location) sessionStorage.setItem("suman_loc", data.location);
            })
            .catch(() => {});
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", sendTelemetry);
    } else {
        sendTelemetry();
    }
})();