const fs = require('fs');
fetch('http://localhost:3000/api/generate', { 
  method: 'POST', 
  body: JSON.stringify({prompt: 'A glowing neon space station'}), 
  headers: {'Content-Type': 'application/json'} 
})
.then(res => res.json())
.then(data => {
  fs.writeFileSync('./test-output.json', JSON.stringify(data, null, 2));
  console.log('Generated and saved to test-output.json');
})
.catch(err => {
  console.error("Fetch Error:", err);
});
