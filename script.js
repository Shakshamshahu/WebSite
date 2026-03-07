async function generate() {

  const res = await fetch("/api/generate");
  console.log(res + " response");
  const data = await res.json();

  console.log(data);

  document.getElementById("output").textContent = data.text;

}