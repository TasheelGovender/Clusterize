from locust import HttpUser, TaskSet, task, between

class UserBehavior(TaskSet):
    wait_time = between(1, 3)
    access_token = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IlNSNHJscmtBc3V5akVINHhoSzVraCJ9.eyJpc3MiOiJodHRwczovL2Rldi11cXp3cWZxMDR1eWprdm9iLnVzLmF1dGgwLmNvbS8iLCJzdWIiOiJJeG52MlRIOE8wazhhYW12RWJKRE1FZjdYUXpkVXgxSEBjbGllbnRzIiwiYXVkIjoiY2x1c3Rlcml6ZTEyMzQiLCJpYXQiOjE3NjExMjY0ODEsImV4cCI6MTc2MTIxMjg4MSwiZ3R5IjoiY2xpZW50LWNyZWRlbnRpYWxzIiwiYXpwIjoiSXhudjJUSDhPMGs4YWFtdkViSkRNRWY3WFF6ZFV4MUgifQ.fjzjPkvVkiMBR4jnAGUeYJTimrxDXjvSLn2UYPgpTUJhkTmLjE7zF2cJG-ogldolqsSGYBO4KOo0qzSdkikO8PnPAY9vB4JcjFXxdGtC-BfjoX9wOkuXU5qmoXBJFM3XB9LPCK6-9tYLciSlJXMciIkNozS_tulfguqV-NfpytNe3ccugIeYrTEktN6B4S3BptQuG_PoW_Wc6pP1l-4GQXF-uTKnjm2KJ7vRu9yLw4pD_wbSyviMBBHEGY5dXOOypoK5TrLEc32s_as9pIcA0LCFdp6v7Ch3wN2Dy_4XuENNOfMl4Rdc40ndJNzeN6YpkwdQDjtOtQXoqLYZZTmLqg"
    project_id = 84 

    @task
    def load_projects(self):
        headers = {"Authorization": f"Bearer {self.access_token}"}
        self.client.get("/api/proxy/projects", headers=headers)

    @task
    def load_home(self):
        self.client.get("/")

    @task
    def load_projects(self):
        self.client.get("/projects")

    @task
    def load_api_projects(self):
        self.client.get("/api/proxy/projects")

    @task
    def open_project(self):
        self.client.get(f"/projects/{self.project_id}")
    
    @task
    def get_project(self):
        self.client.get(f"/api/proxy/project/{self.project_id}")

    @task
    def get_project_images(self):
        url = f"/api/proxy/objects/{self.project_id}"
        headers = {
            "x-access-token": self.access_token,
            "Content-Type": "application/json"
        }
        params = {
            "clusters": "53",
            "label_names": "",
            "tags_list": "testing",
            "relocated_images": "false",
        }
        self.client.get(url, headers=headers, params=params)


class WebsiteUser(HttpUser):
    tasks = [UserBehavior]
    wait_time = between(1, 5)  