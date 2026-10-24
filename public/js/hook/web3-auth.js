// js/hook/ethers-login.js

const server_url = "/ethers-login-auth";
let authToken = null;

const EthersAuth = {
    initAuth: async function(callback) {
        // 1. Ensure window.ethers is available globally
        const ethers = window.ethers;
        if (!ethers) {
            console.error("window.ethers is not defined. Ensure ethers.js is loaded globally via a script tag.");
            document.body.innerHTML = "<h1 style='color:white;background:#111;text-align:center;padding:50px;'>403 Forbidden: Ethers.js Required</h1>";
            if (typeof callback === 'function') callback(false);
            return;
        }

        if (typeof window.ethereum === 'undefined') {
            console.error("MetaMask not detected.");
            document.body.innerHTML = "<h1 style='color:white;background:#111;text-align:center;padding:50px;'>403 Forbidden: MetaMask Required</h1>";
            if (typeof callback === 'function') callback(false);
            return;
        }

        try {
            // 2. Prompt MetaMask connection & Ethers provider
            const provider = new ethers.BrowserProvider(window.ethereum);
            await provider.send("eth_requestAccounts", []);
            const signer = await provider.getSigner();
            const address = await signer.getAddress();

            // 3. Sign message
            const message = `Authenticate EmeraldTemple Session\nTimestamp: ${Date.now()}`;
            const signature = await signer.signMessage(message);

            // 4. Post to verification route via jQuery ($)
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

                console.log("Cryptographic authentication successful!");
                if (typeof callback === 'function') callback(true);
            } else {
                throw new Error(response ? response.error : "Authentication failed.");
            }
        } catch (err) {
            console.error("Authentication error:", err);
            document.body.innerHTML = `<h1 style='color:white;background:#111;text-align:center;padding:50px;'>Access Denied: ${err.message || "Auth Failed"}</h1>`;
            if (typeof callback === 'function') callback(false);
        }
    }
};

export default EthersAuth;