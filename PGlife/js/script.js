// This file can include interactivity like filtering, sorting properties, etc.
// Example: Filter properties based on city

document.getElementById('city').addEventListener('change', function() {
    const selectedCity = this.value;
    alert('City changed to: ' + selectedCity);
    // Logic to filter properties based on the selected city.
});
