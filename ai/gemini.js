// ===============================
// LifeLine AI Gemini Integration
// ===============================


// Put your key inside quotes
const API_URL = "https://lifeline-ai-api.mohammadshannu2025.workers.dev";



export async function askGemini(userMessage){


const prompt = `

You are LifeLine AI Emergency Assistant.

The user describes a medical situation.

Give a helpful response.

Format:

🩺 Possible Condition:
(short explanation)

🚨 Severity:
Low / Medium / High / Critical

🩹 Immediate First Aid:
- point 1
- point 2
- point 3

🏥 Recommendation:
(action)

⚠ Disclaimer:
This is informational guidance only and not a replacement for a doctor.

Keep response under 150 words.


User:
${userMessage}

`;



try{


const response = await fetch(API_URL,{

method:"POST",

headers:{

"Content-Type":"application/json"

},


body: JSON.stringify({
  contents: [
    {
      parts: [
        {
          text: prompt
        }
      ]
    }
  ]
})

});



const data = await response.json();



console.log(data);



if(data.error){

return "❌ Gemini Error: "+data.error.message;

}



return data
.candidates[0]
.content
.parts[0]
.text;



}

catch(error){


console.log(error);


return "❌ AI connection failed";


}



}