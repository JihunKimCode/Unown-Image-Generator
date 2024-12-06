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
    if (imgElement && imgElement.src) {
        const baseUrl = imgElement.src.split('unown-a.png')[0];
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
    
    // Create a small transparent space image to replicate the Python code behavior
    const spaceImage = document.createElement("canvas");
    spaceImage.width = parseInt(document.getElementById("spacing").value, 10);
    spaceImage.height = 10;
    const spaceCtx = spaceImage.getContext("2d");
    spaceCtx.fillStyle = "rgba(0, 0, 0, 0)";  // Transparent
    spaceCtx.fillRect(0, 0, spaceImage.width, spaceImage.height);

    const canvas = document.getElementById("outputCanvas");
    const ctx = canvas.getContext("2d");

    // Normalize the text (convert to uppercase and filter valid characters)
    const normalizedText = [...inputText].filter(
        (char) => charToImage[char] || char === " "
    );

    // Split the text into lines based on max length
    let lines = [];
    let currentLine = "";
    for (let char of normalizedText) {
        if (char === " " || currentLine.length < linechar) {
            currentLine += char;
        } else {
            lines.push(currentLine);
            currentLine = char;
        }
    }
    if (currentLine) lines.push(currentLine);

    // Preload images for each character
    const promises = lines.flatMap((line) =>
        [...line].map((char) => {
            if (char === " ") return null; // Skip space characters (handle separately)
            const img = new Image();
            img.src = charToImage[char] || charToImage["?"]; // Default to '?' if not found
            return new Promise((resolve) => {
                img.onload = () => resolve({ char, img });
                img.onerror = () => {
                    console.warn(`Failed to load image for character: ${char}`);
                    resolve(null); // Resolve with null for failed loads
                };
            });
        })
    );

    Promise.all(promises.filter(Boolean)) // Filter out null promises (spaces or failed images)
        .then((results) => {
            // Remove nulls from results to handle only successfully loaded images
            const validResults = results.filter((res) => res !== null);

            // Prepare canvas dimensions
            const lineHeights = [];
            let totalHeight = 0;
            let totalWidth = 0;

            lines.forEach((line) => {
                let lineWidth = 0;
                let lineHeight = 0;

                [...line].forEach((char) => {
                    if (char === " ") {
                        lineWidth += spaceImage.width + spacing;            // Space width + spacing for space
                    } else {
                        const result = validResults.find((res) => res && res.char === char);
                        if (result) {
                            const { img } = result;
                            lineWidth += img.width + spacing;               // Image width + spacing
                            lineHeight = Math.max(lineHeight, img.height);  // Keep the max height in a line
                        }
                    }
                });

                lineHeights.push(lineHeight);                   // Store the height for the line
                totalWidth = Math.max(totalWidth, lineWidth);   // Max width across all lines
                totalHeight += lineHeight + spacing;            // Total height including spacing between lines
            });

            // Set canvas dimensions
            canvas.width = totalWidth;
            canvas.height = totalHeight;

            // Draw on canvas with the specified background color
            ctx.fillStyle = backgroundColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            let yOffset = 0;
            lines.forEach((line, lineIndex) => {
                let xOffset = 0;
                [...line].forEach((char) => {
                    if (char === " ") {
                        ctx.drawImage(spaceImage, xOffset, yOffset);// Draw the transparent space
                        xOffset += spaceImage.width + spacing;      // Add space width + spacing
                    } else {
                        const result = validResults.find((res) => res && res.char === char);
                        if (result) {
                            const { img } = result;
                            ctx.drawImage(img, xOffset, yOffset);   // Draw the image at calculated offset
                            xOffset += img.width + spacing;         // Add space after the image
                        }
                    }
                });
                yOffset += lineHeights[lineIndex] + spacing;        // Move down for the next line
            });
        })
    .catch((error) => {
        console.error("Error processing images:", error);
    });
});
