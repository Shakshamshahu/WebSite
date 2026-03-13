async function generate() {

  try {

    // get resume text from textarea or variable
    const resumeText = document.getElementById("resumeText").value;

    const res = await fetch("http://localhost:5000/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text: resumeText
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Server error:", errText);
      return;
    }

    const data = await res.json();

    console.log("AI response:", data);

    document.getElementById("output").textContent =
      JSON.stringify(data, null, 2);

  } catch (error) {

    console.error("AI Error:", error);

  }

}