// Declare variables for search form and previous work container
let navbar = document.querySelector('.navbar');
let searchForm = document.querySelector('.search-form');
let previousworks = document.querySelector('.previous-works-container');

// Toggle Navbar (Hamburger menu)
document.querySelector('#menu-btn').onclick = () => {
    navbar.classList.toggle('active');  // Toggles navbar visibility
    searchForm.classList.remove('active');  // Closes search form
    previousworks.classList.remove('active');  // Closes previous works container
};

// Toggle Search Form
document.querySelector('#search-btn').onclick = () => {
    searchForm.classList.toggle('active');  // Toggles search form visibility
    navbar.classList.remove('active');  // Closes navbar
    previousworks.classList.remove('active');  // Closes previous works container
};

// Toggle Previous Works Container
document.querySelector('#collab-btn').onclick = () => {
    previousworks.classList.toggle('active');  // Toggles previous works visibility
    navbar.classList.remove('active');  // Closes navbar
    searchForm.classList.remove('active');  // Closes search form
};

// Close everything on scroll
window.onscroll = () => {
    navbar.classList.remove('active');
    searchForm.classList.remove('active');
    previousworks.classList.remove('active');
};