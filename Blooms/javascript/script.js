// Declare variables for search form and cart item container
let navbar = document.querySelector('.navbar');
let searchForm = document.querySelector('.search-form');
let cartItem = document.querySelector('.cart-items-container');

// Toggle Navbar (Hamburger menu)
document.querySelector('#menu-btn').onclick = () => {
    navbar.classList.toggle('active');  // Toggles navbar visibility
    searchForm.classList.remove('active');  // Closes search form
    cartItem.classList.remove('active');  // Closes cart items container
};

// Toggle Search Form
document.querySelector('#search-btn').onclick = () => {
    searchForm.classList.toggle('active');  // Toggles search form visibility
    navbar.classList.remove('active');  // Closes navbar
    cartItem.classList.remove('active');  // Closes cart items container
};

// Toggle Cart Items Container
document.querySelector('#cart-btn').onclick = () => {
    cartItem.classList.toggle('active');  // Toggles cart items visibility
    navbar.classList.remove('active');  // Closes navbar
    searchForm.classList.remove('active');  // Closes search form
};

// Close everything on scroll
window.onscroll = () => {
    navbar.classList.remove('active');
    searchForm.classList.remove('active');
    cartItem.classList.remove('active');
};

