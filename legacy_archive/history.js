async function loadHistory() {
    const historyBody = document.getElementById('history-body');
    if (!historyBody) return;

    try {
        // 1. Fetch from the Vault (Python)
        const response = await fetch('http://127.0.0.1:5000/get-history');
        
        // --- SURGERY START: Check if response is actually OK ---
        if (!response.ok) throw new Error("Vault is currently ghosting the request.");
        const vaultData = await response.json();
        // --- SURGERY END ---

        // 2. Fetch from the "Parking Lot" (LocalStorage)
        const pendingData = JSON.parse(localStorage.getItem("zenith_pending") || "[]");

        historyBody.innerHTML = "";

        // 3. Render Pending First (With a "SYNCING" tag)
        pendingData.forEach(session => {
            const row = document.createElement('tr');
            row.style.opacity = "0.6"; 
            
            // KEY CHECK: Using session.duration to match your storage key
            row.innerHTML = `
                <td>${(session.task_name || "Focus").toUpperCase()} <span style="color:orange;">(PENDING)</span></td>
                <td>${session.duration || 0} MIN</td>
                <td>WAITING FOR SYNC...</td>
            `;
            historyBody.appendChild(row);
        });

        // 4. Render Confirmed Data
        if (vaultData.length === 0 && pendingData.length === 0) {
            historyBody.innerHTML = "<tr><td colspan='3'>VAULT EMPTY</td></tr>";
            return;
        }

        vaultData.forEach(session => {
            const row = document.createElement('tr');
            
            // KEY CHECK: session.timestamp comes from Python backend
            const dateObj = new Date(session.timestamp);
            const formattedDate = dateObj.toLocaleDateString('en-GB', {
                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
            });

            row.innerHTML = `
                <td>${(session.task_name || "Unknown").toUpperCase()}</td>
                <td>${session.duration || 0} MIN</td>
                <td>${formattedDate}</td>
            `;
            historyBody.appendChild(row);
        });

    } catch (error) {
        console.error("Pulse Error:", error);
        // If it's a 404, we still want to show Pending data if it exists!
        const pendingData = JSON.parse(localStorage.getItem("zenith_pending") || "[]");
        if (pendingData.length > 0) {
            // Keep the pending data visible even if the vault is down
            console.log("Vault down, but showing local pending data.");
        } else {
            historyBody.innerHTML = "<tr><td colspan='3' style='color:red;'>VAULT UNREACHABLE</td></tr>";
        }
    }
}

// Add this inside your loadHistory function or as a separate init
function initBubbles() {
    const bubbles = document.querySelectorAll(".bubble");
    bubbles.forEach((bubble) => {
        setRandomPosition(bubble);
        bubble.addEventListener("transitionend", () => setRandomPosition(bubble));
    });
}

function setRandomPosition(bubble) {
    const x = (Math.random() - 0.5) * window.innerWidth;
    const y = (Math.random() - 0.5) * window.innerHeight;
    bubble.style.transform = `translate(${x}px, ${y}px)`;
    bubble.style.transition = `transform ${7 + Math.random() * 5}s ease-in-out`;
}

// Call it when the page loads
document.addEventListener("DOMContentLoaded", initBubbles);