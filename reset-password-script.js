const http = require("http");

const data = JSON.stringify({
  userId: "6dc4cd76-c961-458d-9d63-01f403c02f87",
  newPassword: "Admin2026!"
});

const options = {
  hostname: "localhost",
  port: 3000,
  path: "/api/admin/reset-password",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": data.length
  }
};

const req = http.request(options, (res) => {
  let body = "";
  
  res.on("data", (chunk) => {
    body += chunk;
  });
  
  res.on("end", () => {
    console.log("Status:", res.statusCode);
    console.log("Response:", body);
  });
});

req.on("error", (error) => {
  console.error("Error:", error);
});

req.write(data);
req.end();