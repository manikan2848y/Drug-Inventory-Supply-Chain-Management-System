import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getDatabase, ref, push, get, onValue, set } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-database.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDwquccsuzkUNxfz5vhxrahyQ5dh-Ygw-g",
    authDomain: "addpatient-e3ca6.firebaseapp.com",
    projectId: "addpatient-e3ca6",
    storageBucket: "addpatient-e3ca6.appspot.com",
    messagingSenderId: "109284311899",
    appId: "1:109284311899:web:f5fe7618dc5b6a9eccd07e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const inventoryRef = ref(database, 'inventory'); // Reference to the 'inventory' node in Firebase
const trackingRef = ref(database, 'tracking'); // Reference to the 'tracking' node to store tracking numbers
const cart = []; // Cart to store selected items

// Function to render inventory items
function renderInventory(items) {
    const inventoryListBody = document.getElementById('inventory-list-body');
    inventoryListBody.innerHTML = ''; // Clear the table body
    items.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.name}</td>
            <td>${item.quantity}</td>
            <td>${item.category}</td>
            <td><button class="add-to-cart-btn" data-id="${item.name}" data-quantity="${item.quantity}" data-category="${item.category}">Add to Cart</button></td>
        `;
        inventoryListBody.appendChild(row); // Append each row to the table
    });

    // Add event listeners to the "Add to Cart" buttons
    document.querySelectorAll('.add-to-cart-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const item = {
                name: e.target.dataset.id,
                quantity: parseInt(e.target.dataset.quantity),
                category: e.target.dataset.category,
                purchasedQuantity: 1 // Default quantity added to the cart
            };
            addToCart(item); // Add the selected item to the cart
        });
    });
}

// Add item to cart
function addToCart(item) {
    // Check if the item already exists in the cart
    const existingItem = cart.find(cartItem => cartItem.name === item.name && cartItem.category === item.category);
    
    if (existingItem) {
        existingItem.purchasedQuantity += 1; // Increase quantity if already in the cart
    } else {
        cart.push(item); // Add new item to the cart
    }
    
    updateCartDisplay(); // Update the cart display
}

// Update the cart display
function updateCartDisplay() {
    const cartContainer = document.getElementById('cart-items');
    cartContainer.innerHTML = ''; // Clear the cart display
    let totalAmount = 0;

    cart.forEach(item => {
        const cartRow = document.createElement('tr');
        cartRow.innerHTML = `
            <td>${item.name}</td>
            <td>${item.purchasedQuantity}</td>
            <td>${item.quantity}</td>
            <td><button class="remove-from-cart" data-name="${item.name}" data-category="${item.category}">Remove</button></td>
        `;
        cartContainer.appendChild(cartRow);
        totalAmount += item.purchasedQuantity * 20; // Assuming price is 20 for simplicity, modify this logic
    });

    // Update the total amount in the cart
    document.getElementById('total-amount').innerText = totalAmount;
    
    // Add event listeners to the "Remove from Cart" buttons
    document.querySelectorAll('.remove-from-cart').forEach(button => {
        button.addEventListener('click', (e) => {
            removeFromCart(e.target.dataset.name, e.target.dataset.category); // Remove item from cart
        });
    });
}

// Remove item from cart
function removeFromCart(name, category) {
    const index = cart.findIndex(item => item.name === name && item.category === category);
    if (index !== -1) {
        cart.splice(index, 1); // Remove the item from the cart
        updateCartDisplay(); // Update the cart display
    }
}

// Simulate a purchase action
window.submitToPayment = function() {
    if (cart.length === 0) {
        alert("Your cart is empty. Please add items to the cart before proceeding.");
        return;
    }
    
    const trackingNumber = generateTrackingNumber();
    document.getElementById('tracking-number').innerText = trackingNumber;
    document.querySelector('.tracking-section').style.display = 'block';

    // Store the tracking number in Firebase under 'tracking' node
    const verificationCode = generateVerificationCode(); // Generate a unique verification code
    push(trackingRef, {
        trackingNumber: trackingNumber,
        verificationCode: verificationCode
    }).then(() => {
        // Notify the user
        alert(`Your tracking number is: ${trackingNumber}. Verification Code: ${verificationCode}`);
    }).catch(err => {
        console.error('Error saving tracking number:', err);
    });

    // Simulate a successful payment (you can integrate a real payment system here)
    setTimeout(() => {
        alert("Payment successful! Your order is being processed.");
        cart.length = 0; // Empty the cart
        updateCartDisplay(); // Update the cart display after purchase
    }, 2000);
};

// Function to generate a random tracking number
function generateTrackingNumber() {
    const date = new Date();
    const randomPart = Math.floor(Math.random() * 1000000);
    return `TRACK-${date.getFullYear()}-${randomPart}`;
}

// Function to generate a random verification code
function generateVerificationCode() {
    return Math.floor(Math.random() * 1000000).toString(); // Random 6-digit code
}

// Function to verify the entered verification code with Firebase data
window.verifyTrackingCode = function() {
    const enteredVerificationCode = document.getElementById('verification-code').value;

    // Check if the verification code is valid
    onValue(trackingRef, (snapshot) => {
        let validCode = false;
        snapshot.forEach(childSnapshot => {
            const trackingData = childSnapshot.val();
            if (trackingData.verificationCode === enteredVerificationCode) {
                validCode = true; // Match found
                return true; // Break the loop
            }
        });

        if (validCode) {
            alert("Verification code is valid! Your tracking number has been verified.");
        } else {
            alert("Invalid verification code. Please try again.");
        }
    });
};

// Search items based on name or category
window.searchItems = function() {
    const queryText = document.getElementById('search-input').value.toLowerCase();
    onValue(inventoryRef, (snapshot) => {
        const filteredItems = [];
        snapshot.forEach((childSnapshot) => {
            const item = childSnapshot.val();
            if (item.name.toLowerCase().includes(queryText) || 
                item.category.toLowerCase().includes(queryText)) {
                filteredItems.push(item); // Filter items based on the search query
            }
        });
        renderInventory(filteredItems); // Render the filtered results
    });
};

// Initial fetch and rendering of inventory
fetchInventory();

// Fetch inventory from Firebase and render in real-time
function fetchInventory() {
    onValue(inventoryRef, (snapshot) => {
        const inventory = [];
        snapshot.forEach((childSnapshot) => {
            const data = childSnapshot.val(); // Get the actual data from Firebase
            inventory.push(data); // Add the data to the inventory array
        });
        renderInventory(inventory); // Call the render function to display the data
    });
}
