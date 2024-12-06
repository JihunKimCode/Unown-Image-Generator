document.addEventListener('DOMContentLoaded', function() {
    const currentYear = new Date().getFullYear();
    document.querySelectorAll("#year, #year2").forEach(el => el.textContent = currentYear);
});

// Initialize the global mapping for character-to-image URLs
const charToImage = {};

// Function to update the charToImage mapping
function updateCharToImageMapping(baseUrl) {
    for (let i = 65; i <= 90; i++) {
        // Construct the URL for each character ('A' to 'Z')
        const char = String.fromCharCode(i);
        charToImage[char] = `${baseUrl}unown-${char.toLowerCase()}.png`;
    }

    // Special characters
    if (baseUrl === "https://img.pokemondb.net/artwork/vector/") {
        // Special characters for this specific base URL
        charToImage["!"] = `${baseUrl}unown-exclamation.png`;
        charToImage["?"] = `${baseUrl}unown-question.png`;
    } else {
        // Default or other base URL
        charToImage["!"] = `${baseUrl}unown-em.png`;
        charToImage["?"] = `${baseUrl}unown-qm.png`;
    }
}

// Function to handle the selection of a grid item
function handleGridItemClick(item) {
    const imgElement = item.querySelector('img');
    const warningMessage = document.getElementById('warning-message');

    if (imgElement && imgElement.src) {
        const baseUrl = imgElement.src.split('unown-a.png')[0];

        if(baseUrl.includes('/crystal/')) warningMessage.style.display = "block";
        else warningMessage.style.display = "none";

        updateCharToImageMapping(baseUrl);
    }
}

// Function to initialize the base URL and mappings for the initially selected item
function initializeBaseUrl() {
    const selectedItem = document.querySelector('.grid-item.selected');
    if (selectedItem) {
        const imgElement = selectedItem.querySelector('img');
        if (imgElement && imgElement.src) {
            const baseUrl = imgElement.src.split('unown-a.png')[0];
            updateCharToImageMapping(baseUrl);
        }
    }
}

// Set up the event listeners for grid items
function setupGridItemListeners() {
    const gridItems = document.querySelectorAll('.grid-item');
    gridItems.forEach(item => {
        item.addEventListener('click', () => {
            // Remove 'selected' class from all items
            gridItems.forEach(i => i.classList.remove('selected'));

            // Add 'selected' class to the clicked item
            item.classList.add('selected');

            // Handle the grid item click and update the mappings
            handleGridItemClick(item);
        });
    });
}

// Initialize the base URL and listeners on page load
initializeBaseUrl();
setupGridItemListeners();

// Generate Unown Image using InputText
document.getElementById("generate").addEventListener("click", () => {
    const inputText = document.getElementById("userInput").value.toUpperCase();
    if (inputText.trim() === "") return;

    const spacing = 5;
    const backgroundColor = document.getElementById("background").value;
    const linechar = parseInt(document.getElementById("linechar").value, 10);

    // Create a small transparent space image to handle spaces
    const spaceImage = document.createElement("canvas");
    spaceImage.width = parseInt(document.getElementById("spacing").value, 10);
    spaceImage.height = 10;
    const spaceCtx = spaceImage.getContext("2d");
    spaceCtx.fillStyle = "rgba(0, 0, 0, 0)"; // Transparent
    spaceCtx.fillRect(0, 0, spaceImage.width, spaceImage.height);

    const canvas = document.getElementById("outputCanvas");
    const ctx = canvas.getContext("2d");

    // Normalize text: split into lines by explicit line breaks, then wrap to `linechar`
    const textLines = inputText.split("\n").flatMap((paragraph) => {
        let lines = [];
        let currentLine = "";

        for (let char of paragraph) {
            if (currentLine.length < linechar && char !== "\n") {
                currentLine += char;
            } else {
                lines.push(currentLine);
                currentLine = char === "\n" ? "" : char;
            }
        }

        if (currentLine) lines.push(currentLine);
        return lines;
    });

    // Preload images for all characters
    const promises = textLines.flatMap((line) =>
        [...line].map((char) => {
            if (char === " ") return null; // Skip spaces (handled separately)

            const imgSrc = charToImage[char];
            if (!imgSrc) {
                console.warn(`There is no Unown Sprite for character: ${char}`);
                return null; // Skip characters without valid sources
            }

            const img = new Image();
            img.src = imgSrc;

            return new Promise((resolve) => {
                img.onload = () => resolve({ char, img });
                img.onerror = () => {
                    console.warn(`Failed to load Unown Sprite for character: ${char}`);
                    resolve(null);
                };
            });
        })
    ).filter(Boolean); // Remove null entries from the array

    Promise.all(promises.filter(Boolean))
        .then((results) => {
            const validResults = results.filter((res) => res !== null);

            // Calculate dimensions
            const lineHeights = [];
            let totalHeight = 0;
            let totalWidth = 0;

            textLines.forEach((line) => {
                let lineWidth = 0;
                let lineHeight = 0;

                [...line].forEach((char) => {
                    if (char === " ") {
                        lineWidth += spaceImage.width + spacing;
                    } else {
                        const result = validResults.find((res) => res && res.char === char);
                        if (result) {
                            lineWidth += result.img.width + spacing;
                            lineHeight = Math.max(lineHeight, result.img.height);
                        }
                    }
                });

                lineHeights.push(lineHeight);
                totalWidth = Math.max(totalWidth, lineWidth);
                totalHeight += lineHeight + spacing;
            });

            // Set canvas dimensions
            canvas.width = totalWidth;
            canvas.height = totalHeight;

            // Draw background
            ctx.fillStyle = backgroundColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Render text on canvas
            let yOffset = 0;
            textLines.forEach((line, lineIndex) => {
                let xOffset = 0;
                [...line].forEach((char) => {
                    if (char === " ") {
                        ctx.drawImage(spaceImage, xOffset, yOffset);
                        xOffset += spaceImage.width + spacing;
                    } else {
                        const result = validResults.find((res) => res && res.char === char);
                        if (result) {
                            ctx.drawImage(result.img, xOffset, yOffset);
                            xOffset += result.img.width + spacing;
                        }
                    }
                });
                yOffset += lineHeights[lineIndex] + spacing;
            });
        })
        .catch((error) => {
            console.error("Error processing images:", error);
        });
});
