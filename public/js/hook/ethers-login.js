const scriptsToLoad = ['../controller/loader.js']
const server_url = "ethers-login"

let authToken = null;

/**
 * Dynamically loads an array of script URLs sequentially upon successful verification.
 * @param {string[]} scripts - Array of script file URLs to load (e.g. ['/js/controller/loader.js'])
 */
export async function initAuth(scripts = scriptsToLoad) {
    if (typeof window.ethereum === 'undefined') {
        console.error("MetaMask not detected.");
        document.body.innerHTML = "<h1 style='color:white;background:#111;text-align:center;padding:50px;'>403 Forbidden: MetaMask Required</h1>";
        return false;
    }

    try {
        // 1. Prompt MetaMask connection
        const provider = new ethers.BrowserProvider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();

        // 2. Sign SIWE message
        const message = `Authenticate EmeraldTemple Session\nTimestamp: ${Date.now()}`;
        const signature = await signer.signMessage(message);

        // 3. Post to /access-ctrl verification route
        const response = await $.ajax({
            url: server_url,
            type: "POST",
            contentType: "application/json",
            data: JSON.stringify({ address, signature, message })
        });

        if (response && response.success) {
            authToken = response.token;

            // Automatically attach x-auth-token to all future jQuery AJAX requests
            $.ajaxSetup({
                beforeSend: function(xhr) {
                    xhr.setRequestHeader('x-auth-token', authToken);
                }
            });

            console.log("Cryptographic authentication successful! Loading authorized scripts...");

            // 4. Sequentially load the scripts in the provided array
            for (const scriptUrl of scripts) {
                await loadScript(scriptUrl);
            }

            return true;
        } else {
            throw new Error(response ? response.error : "Authentication failed.");
        }
    } catch (err) {
        console.error("Authentication error:", err);
        document.body.innerHTML = `<h1 style='color:white;background:#111;text-align:center;padding:50px;'>Access Denied: ${err.message || "Auth Failed"}</h1>`;
        return false;
    }
}

/**
 * Helper function returning a Promise to dynamically append <script> elements into DOM.
 */
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve(true);
        script.onerror = (err) => reject(new Error(`Failed to load script: ${src}`));
        document.body.appendChild(script);
    });
}