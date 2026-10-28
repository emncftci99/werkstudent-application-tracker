let editingId = null;

const form = document.getElementById("application-form");
const submitButton = form.querySelector('button[type="submit"]');
const errorBox = document.getElementById("form-error");
const statusFilter = document.getElementById("status-filter");
const list = document.getElementById("applications-list");

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text ?? "";
    return div.innerHTML;
}

async function readJson(response) {
    try {
        return await response.json();
    } catch {
        return {};
    }
}

function getErrorMessage(data) {
    if (Array.isArray(data.detail)) {
        return data.detail.map(error => error.msg).join(", ");
    }
    return data.detail || "Something went wrong. Please try again.";
}

function showError(message) {
    errorBox.textContent = message;
    errorBox.hidden = false;
}

function hideError() {
    errorBox.textContent = "";
    errorBox.hidden = true;
}

function todayText() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${now.getFullYear()}-${month}-${day}`;
}

function formatAppliedDate(text) {
    if (!text) {
        return "";
    }

    const [year, month, day] = text.split("-").map(Number);
    const appliedDate = new Date(year, month - 1, day);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const daysAgo = Math.round((today - appliedDate) / 86400000);

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const formatted = `${day} ${monthNames[month - 1]} ${year}`;

    let relative;
    if (daysAgo === 0) {
        relative = "today";
    } else if (daysAgo === 1) {
        relative = "yesterday";
    } else if (daysAgo > 1) {
        relative = `${daysAgo} days ago`;
    } else {
        relative = `in ${-daysAgo} days`;
    }

    return `${formatted} · ${relative}`;
}

function resetForm() {
    form.reset();
    document.getElementById("applied-date").value = todayText();
    editingId = null;
    submitButton.textContent = "Add Application";
}

form.addEventListener("submit", async function (event) {
    event.preventDefault();
    hideError();

    const application = {
        company: document.getElementById("company").value.trim(),
        position: document.getElementById("position").value.trim(),
        status: document.getElementById("status").value,
        notes: document.getElementById("notes").value.trim() || null,
        applied_date: document.getElementById("applied-date").value || null
    };

    let url = "/applications";
    let method = "POST";
    if (editingId !== null) {
        url = `/applications/${editingId}`;
        method = "PUT";
    }

    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(application)
        });
        const data = await readJson(response);

        if (!response.ok) {
            showError(getErrorMessage(data));
            return;
        }

        resetForm();
        loadApplications();
    } catch {
        showError("Cannot reach the server. Is it running?");
    }
});

async function loadApplications() {
    let url = "/applications";
    if (statusFilter.value) {
        url += `?status=${encodeURIComponent(statusFilter.value)}`;
    }

    try {
        const response = await fetch(url);
        const applications = await readJson(response);

        if (!response.ok) {
            list.innerHTML = '<p class="empty-message">Could not load applications.</p>';
            return;
        }

        if (applications.length === 0) {
            list.innerHTML = statusFilter.value
                ? '<p class="empty-message">No applications with this status.</p>'
                : '<p class="empty-message">No applications yet. Add your first one above.</p>';
            return;
        }

        list.innerHTML = applications.map(application => `
            <div class="application-card">
                <div class="card-header">
                    <h3>${escapeHtml(application.company)}</h3>
                    ${application.applied_date ? `<span class="card-date">${escapeHtml(formatAppliedDate(application.applied_date))}</span>` : ""}
                </div>
                <p>${escapeHtml(application.position)}</p>
                <span class="status-badge status-${escapeHtml(application.status)}">${escapeHtml(application.status)}</span>
                ${application.notes ? `<p class="card-notes">${escapeHtml(application.notes)}</p>` : ""}
                <div class="card-actions">
                    <button class="edit-button" onclick="editApplication(${application.id})">Edit</button>
                    <button class="delete-button" onclick="deleteApplication(${application.id})">Delete</button>
                </div>
            </div>
        `).join("");
    } catch {
        list.innerHTML = '<p class="empty-message">Cannot reach the server. Is it running?</p>';
    }
}

async function editApplication(id) {
    hideError();

    try {
        const response = await fetch(`/applications/${id}`);
        const application = await readJson(response);

        if (!response.ok) {
            showError(getErrorMessage(application));
            return;
        }

        document.getElementById("company").value = application.company;
        document.getElementById("position").value = application.position;
        document.getElementById("status").value = application.status;
        document.getElementById("notes").value = application.notes || "";
        document.getElementById("applied-date").value = application.applied_date || "";

        editingId = id;
        submitButton.textContent = "Save Changes";
        form.scrollIntoView({ behavior: "smooth" });
    } catch {
        showError("Cannot reach the server. Is it running?");
    }
}

async function deleteApplication(id) {
    if (!confirm("Delete this application?")) {
        return;
    }
    hideError();

    try {
        const response = await fetch(`/applications/${id}`, {
            method: "DELETE"
        });

        if (!response.ok) {
            const data = await readJson(response);
            showError(getErrorMessage(data));
            return;
        }

        if (editingId === id) {
            resetForm();
        }
        loadApplications();
    } catch {
        showError("Cannot reach the server. Is it running?");
    }
}

statusFilter.addEventListener("change", loadApplications);

document.getElementById("applied-date").value = todayText();
loadApplications();
