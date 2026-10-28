let editingId = null;
const form = document.getElementById("application-form");

form.addEventListener("submit", async function(event){
    event.preventDefault();

    const company = document.getElementById("company").value;
    const position = document.getElementById("position").value;
    const status = document.getElementById("status").value;
    const notes = document.getElementById("notes").value;

    const application ={
        company: company,
        position: position,
        status: status,
        notes: notes
    };

    let url = "/applications";
    let method ="POST";
    if  (editingId !== null){
        url = `/applications/${editingId}`;
        method = "PUT";
    }

    const response= await fetch(url,{
        method: method,
        headers: {
            "Content-Type": "application/json"
        },
        body:JSON.stringify(application)
    });

    const data = await response.json();
    console.log(data);
    form.reset();
    editingId=null;
    document.querySelector(
        '#application-form button[type ="submit"]'
    ).textContent ="Add Application";
    loadApplications();
});

async function loadApplications(){
   const response = await fetch("/applications");
   const applications = await response.json();
   const list = document.getElementById("applications-list");
   list.innerHTML = "";
   for(const application of applications){
       list.innerHTML +=`
           <div class ="application-card">
               <h3>${application.company}</h3>
               <p>${application.position}</p>
               <p>Status: ${application.status}</p>
               <p>${application.notes || ""}</p>

               <button onclick="editApplication(${application.id})">
                   Edit
               </button>

               <button
                   class="delete-button"
                   onclick="deleteApplication(${application.id})"
               >
                   Delete
               </button>
           </div>
       `;
   }
}

async function editApplication(id){
    const response = await fetch(`/applications/${id}`);
    const application = await response.json();

    document.getElementById("company").value = application.company;
    document.getElementById("position").value = application.position;
    document.getElementById("status").value = application.status;
    document.getElementById("notes").value = application.notes || "";

    editingId = id;

    document.querySelector(
        '#application-form button[type="submit"]'
    ).textContent = "Save Changes";
}

async function deleteApplication(id){
    await fetch(`/applications/${id}`,{
        method: "DELETE"
    });
    loadApplications();
}

loadApplications();