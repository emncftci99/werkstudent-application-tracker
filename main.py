from datetime import date
from fastapi import FastAPI,HTTPException
from pydantic import BaseModel
from enum import Enum
from database import get_connection
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

app = FastAPI()

app.mount("/static", StaticFiles(directory="frontend"), name="static") # to reach js and css files

class ApplicationStatus(str, Enum): #validation important for validation
    applied = "applied"
    interviewed = "interviewed"
    rejected = "rejected"
    offer="offer"

class Application(BaseModel):  #application diye bi yapi olsun ve böyle gözuksun pydantic ve basemodel sayesinde gelen veri turunu belirliyoruz
    company: str
    position: str
    status: ApplicationStatus
    notes: str | None = None
    applied_date: date | None = None

SELECT_COLUMNS = "SELECT id,company,position,status,notes,applied_date FROM applications"

def row_to_dict(row):
    return {
        "id": row[0],
        "company": row[1],
        "position": row[2],
        "status": row[3],
        "notes": row[4],
        "applied_date": row[5]
    }

def date_to_text(value):
    if value is None:
        return None
    return value.isoformat()

@app.get("/")
def home():
    return FileResponse("frontend/index.html")

@app.post("/applications") #application kaydet
def create_application(application: Application):
    connection=get_connection()
    cursor=connection.cursor()
    cursor.execute(
        """
        INSERT INTO applications (company,position,status,notes,applied_date)
        VALUES (?,?,?,?,?)
        """,
        (
            application.company,
            application.position,
            application.status.value,
            application.notes,
            date_to_text(application.applied_date)
        )
    )
    connection.commit()
    application_id = cursor.lastrowid
    connection.close()
    return{
            "id": application_id,
            "company": application.company,
            "position": application.position,
            "status": application.status.value, # thanks to status.value it function returns a string not an object
            "notes": application.notes,
            "applied_date": date_to_text(application.applied_date)
    }

@app.get("/applications") # eklenen applicationlari görüntüle
def get_applications(status: ApplicationStatus|None=None): #status can being send but not a must
    connection=get_connection()
    cursor=connection.cursor()

    order = "ORDER BY applied_date IS NULL, applied_date DESC, id DESC"

    if status is None:
        cursor.execute(f"{SELECT_COLUMNS} {order}")
    else:
        cursor.execute(f"{SELECT_COLUMNS} WHERE status=? {order}", (status.value,))

    rows = cursor.fetchall()
    connection.close()
    return [row_to_dict(row) for row in rows]


@app.get("/applications/{application_id}")
def get_application(application_id: int):
    connection=get_connection()
    cursor=connection.cursor()

    cursor.execute(f"{SELECT_COLUMNS} WHERE id=?", (application_id,))
    row = cursor.fetchone()
    connection.close()
    if row is None:
        raise HTTPException(status_code=404, detail="Application not found")
    return row_to_dict(row)

@app.put("/applications/{application_id}")
def update_application(application_id:int, updated_application: Application):
    connection=get_connection()
    cursor=connection.cursor()

    cursor.execute(
        """
        UPDATE applications
        SET company=?,position=?,status=?,notes=?,applied_date=?
        WHERE id=?
        """,
        (
            updated_application.company,
            updated_application.position,
            updated_application.status.value,
            updated_application.notes,
            date_to_text(updated_application.applied_date),
            application_id
        )
    )
    connection.commit()
    if cursor.rowcount == 0:
        connection.close()
        raise HTTPException(status_code=404, detail="Application not found")
    connection.close()

    return {
        "id": application_id,
        "company": updated_application.company,
        "position": updated_application.position,
        "status": updated_application.status.value,
        "notes": updated_application.notes,
        "applied_date": date_to_text(updated_application.applied_date)
    }

@app.delete("/applications/{application_id}")
def delete_application(application_id: int):
    connection=get_connection()
    cursor=connection.cursor()

    cursor.execute(
        """
        DELETE FROM applications
        WHERE id=?
        """,
        (application_id,)
    )
    connection.commit()
    if cursor.rowcount == 0:
        connection.close()
        raise HTTPException(status_code=404, detail="Application not found")
    connection.close()
    return {
        "message": "Application deleted successfully",
        "id": application_id,
    }
