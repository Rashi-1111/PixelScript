function validate() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    
    if (username === "SHEBINARY" && password === "SHEBINARY@6") {
        alert("Login Successful!");
        window.location.href = "homepage.html"; // Change this to the page you want to redirect to
    } else {
        alert("Incorrect Username or Password");
    }
}
