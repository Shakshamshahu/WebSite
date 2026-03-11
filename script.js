async function generate() {

  const res = await fetch("/generate-portfolio");
  console.log(res + " response");
  const data = await res.json();

  console.log(data);

  document.getElementById("output").textContent = data.text;


}
